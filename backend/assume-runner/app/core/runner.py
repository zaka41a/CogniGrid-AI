"""
ASSUME simulation runner.

Writes the proper ASSUME file structure to a temp dir, invokes `assume run`
via asyncio subprocess, streams stdout/stderr, parses results CSV, optionally
pushes a summary back into the ingestion service.

Expected ASSUME v0.4.3 layout:
  <run_dir>/
    <scenario_name>/
      config.yaml            ← {study_case: {start_date, end_date, ...}}
      powerplant_units.csv   ← generation units
      demand_units.csv       ← demand units
      demand_df.csv          ← demand time series
    output/                  ← CSV results written here
"""
import asyncio
import csv
import httpx
import logging
import math
import os
import time
import uuid
import yaml
from datetime import datetime, timezone, timedelta
from pathlib import Path

from app.config import settings
from app.models.schemas import RunInfo, RunStatus

logger = logging.getLogger(__name__)

# In-memory run registry
_RUNS: dict[str, RunInfo] = {}
_LOCKS: dict[str, asyncio.Task] = {}

_http = httpx.AsyncClient(timeout=30.0)


def get_run(run_id: str, user_id: str | None = None) -> RunInfo | None:
    info = _RUNS.get(run_id)
    if info is None:
        return None
    # If user_id provided, enforce ownership
    if user_id and info.user_id and info.user_id != user_id:
        return None
    return info


def list_runs(user_id: str | None = None) -> list[RunInfo]:
    runs = list(_RUNS.values())
    if user_id:
        runs = [r for r in runs if r.user_id == user_id]
    return runs


async def start_run(req_yaml: str, scenario_name: str, description: str,
                    push_to_graph: bool, user_id: str | None = None) -> RunInfo:
    run_id  = str(uuid.uuid4())[:8]
    run_dir = Path(settings.runs_dir) / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    info = RunInfo(
        run_id=run_id,
        user_id=user_id,
        status=RunStatus.pending,
        scenario_name=scenario_name,
        description=description,
        started_at=datetime.now(timezone.utc).isoformat(),
    )
    _RUNS[run_id] = info

    # Write the raw LLM-generated YAML for reference / parsing
    (run_dir / "config.yaml").write_text(req_yaml)

    task = asyncio.create_task(_execute(run_id, run_dir, push_to_graph))
    _LOCKS[run_id] = task
    return info


async def cancel_run(run_id: str) -> bool:
    task = _LOCKS.get(run_id)
    if task and not task.done():
        task.cancel()
        _RUNS[run_id].status = RunStatus.cancelled
        return True
    return False


async def delete_run(run_id: str, user_id: str | None = None) -> bool:
    """Cancel if running, then remove from the in-memory registry."""
    info = _RUNS.get(run_id)
    if info is None:
        return False
    # Enforce ownership
    if user_id and info.user_id and info.user_id != user_id:
        return False
    task = _LOCKS.get(run_id)
    if task and not task.done():
        task.cancel()
    _RUNS.pop(run_id, None)
    _LOCKS.pop(run_id, None)
    return True


# ─── helpers ────────────────────────────────────────────────────────────────

def _log(info: RunInfo, msg: str) -> None:
    """Append a runner log line and keep max 500 lines."""
    info.log_lines.append(msg)
    logger.debug(msg)
    if len(info.log_lines) > 500:
        info.log_lines = info.log_lines[-500:]


def _parse_date(s: str, fallback: datetime) -> datetime:
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    return fallback


# ─── main execute ────────────────────────────────────────────────────────────

async def _execute(run_id: str, run_dir: Path, push_to_graph: bool) -> None:
    info = _RUNS[run_id]
    info.status = RunStatus.running
    t0 = time.monotonic()

    try:
        # ── 1. Parse the LLM-generated YAML ──────────────────────────────────
        raw_yaml = (run_dir / "config.yaml").read_text()
        try:
            user_cfg: dict = yaml.safe_load(raw_yaml) or {}
        except Exception as e:
            _log(info, f"[runner] YAML parse warning: {e} — using empty config")
            user_cfg = {}

        safe_name  = info.scenario_name.replace(" ", "_").replace("/", "_")
        study_case = "base"

        # General / time parameters
        general   = user_cfg.get("general", user_cfg.get("time_period", {}))
        general   = general if isinstance(general, dict) else {}
        start_str = str(general.get("start_date", "2024-01-01 00:00"))
        end_str   = str(general.get("end_date",   "2024-01-02 00:00"))

        # time_step may arrive as int (hours) or pandas freq string ("1h", "30min")
        raw_ts = general.get("time_step", 1)
        if isinstance(raw_ts, str) and raw_ts.strip() and raw_ts.strip()[-1].isalpha():
            time_step_str = raw_ts.strip()                      # keep as-is for ASSUME
            if time_step_str.endswith("h"):
                time_step = int(time_step_str[:-1])             # hours for demand_df loop
            elif time_step_str.endswith("min") or time_step_str.endswith("m"):
                mins = int(time_step_str.rstrip("min").rstrip("m") or 60)
                time_step = max(1, mins // 60)
            else:
                time_step = 1
        else:
            time_step = max(1, int(str(raw_ts).strip() or "1"))
            time_step_str = f"{time_step}h"

        t_start = _parse_date(start_str, datetime(2024, 1, 1, 0, 0))
        t_end   = _parse_date(end_str,   datetime(2024, 1, 2, 0, 0))
        if t_end <= t_start:
            t_end = t_start + timedelta(hours=24)

        # Market name — supports both list format [{name: EOM}] and dict format {EOM: {...}}
        markets_raw = user_cfg.get("markets", [])
        market_name = "EOM"
        if isinstance(markets_raw, list) and markets_raw:
            m0 = markets_raw[0]
            if isinstance(m0, dict):
                market_name = str(m0.get("name", "EOM"))
        elif isinstance(markets_raw, dict) and markets_raw:
            market_name = str(next(iter(markets_raw)))
        bidding_col = f"bidding_{market_name}"

        # ── 2. Create ASSUME directory structure ──────────────────────────────
        scenario_dir = run_dir / safe_name
        scenario_dir.mkdir(parents=True, exist_ok=True)
        output_dir = run_dir / "output"
        output_dir.mkdir(exist_ok=True)

        _log(info, f"[runner] Scenario dir: {scenario_dir}")
        _log(info, f"[runner] Period: {t_start} → {t_end}, step={time_step}h, market={market_name}")

        # ── 3. Write ASSUME config.yaml ───────────────────────────────────────
        assume_cfg = {
            study_case: {
                "start_date": t_start.strftime("%Y-%m-%d %H:%M"),
                "end_date":   t_end.strftime("%Y-%m-%d %H:%M"),
                "time_step":  time_step_str,
                "fuel_prices": {
                    "co2":         25.0,   # €/tCO₂ — required by ASSUME forecaster
                    "nuclear":      3.0,
                    "lignite":      6.0,
                    "hard coal":   20.0,
                    "coal":        20.0,
                    "natural gas": 30.0,
                    "oil":         45.0,
                    "methane":     30.0,
                    "other":       50.0,
                },
                "markets_config": {
                    market_name: {
                        "operator":           market_name,
                        "product_type":       "energy",
                        # Required by make_market_config
                        "market_mechanism":   "pay_as_clear",
                        "opening_frequency":  "1d",    # market opens once per day
                        "opening_duration":   "1h",    # auction lasts 1h before delivery
                        "products": [
                            {
                                "duration":        "1h",  # each product covers 1 hour
                                "count":           24,    # 24 hourly products per day
                                "first_delivery":  "1h",  # first delivery 1h after open
                            }
                        ],
                        # Optional limits
                        "volume_unit":        "MW",
                        "maximum_bid_volume": 10000,
                        "maximum_bid_price":  3000,
                        "minimum_bid_price":  -500,
                    }
                },
            }
        }
        (scenario_dir / "config.yaml").write_text(
            yaml.dump(assume_cfg, default_flow_style=False, allow_unicode=True)
        )
        _log(info, "[runner] config.yaml written")

        # ── 4. powerplant_units.csv ───────────────────────────────────────────
        units_raw = user_cfg.get("units", [])
        if isinstance(units_raw, dict):
            units_raw = [{"name": k, **v} for k, v in units_raw.items()]

        pp_rows: list[dict] = []
        for u in units_raw:
            if not isinstance(u, dict):
                continue
            tech = str(u.get("technology", u.get("type", "other"))).lower()
            if tech in ("demand", "load"):
                continue
            additional_cost = float(
                u.get("marginal_cost",
                u.get("additional_cost",
                u.get("cost",
                u.get("variable_cost", 30.0))))
            )
            # Normalize underscore fuel types to space-separated (ASSUME convention)
            raw_fuel = str(u.get("fuel_type", tech)).replace("_", " ").lower()
            pp_rows.append({
                "name":            str(u.get("name", f"unit_{len(pp_rows)}")),
                "unit_operator":   str(u.get("unit_operator", "GenCo")),
                "technology":      tech,
                "fuel_type":       raw_fuel,
                "max_power":       float(u.get("max_power", u.get("capacity", 100))),
                "min_power":       float(u.get("min_power", 0)),
                "efficiency":      float(u.get("efficiency", 0.4)),
                "emission_factor": float(u.get("emission_factor", 0.5)),
                "additional_cost": additional_cost,
                "fixed_cost":      float(u.get("fixed_cost", 0)),
                "start_cost":      float(u.get("start_cost", 0)),
                bidding_col:       "naive_eom",
            })

        if not pp_rows:
            _log(info, "[runner] No generation units in YAML — using defaults")
            pp_rows = [
                {
                    "name": "gas_plant", "unit_operator": "GenCo",
                    "technology": "natural gas", "fuel_type": "natural gas",
                    "max_power": 200.0, "min_power": 0.0,
                    "efficiency": 0.45, "emission_factor": 0.4,
                    "additional_cost": 0.0, "fixed_cost": 0.0, "start_cost": 0.0,
                    bidding_col: "naive_eom",
                },
                {
                    "name": "coal_plant", "unit_operator": "GenCo",
                    "technology": "coal", "fuel_type": "coal",
                    "max_power": 300.0, "min_power": 50.0,
                    "efficiency": 0.38, "emission_factor": 0.9,
                    "additional_cost": 0.0, "fixed_cost": 0.0, "start_cost": 0.0,
                    bidding_col: "naive_eom",
                },
            ]

        pp_fields = [
            "name", "unit_operator", "technology", "fuel_type",
            "max_power", "min_power", "efficiency", "emission_factor",
            "additional_cost", "fixed_cost", "start_cost", bidding_col,
        ]
        with open(scenario_dir / "powerplant_units.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=pp_fields)
            w.writeheader()
            w.writerows(pp_rows)
        _log(info, f"[runner] powerplant_units.csv written ({len(pp_rows)} units)")

        # ── 5. demand_units.csv ───────────────────────────────────────────────
        demand_raw = user_cfg.get("demand", [])
        if isinstance(demand_raw, dict):
            demand_raw = [{"name": k, **v} for k, v in demand_raw.items()]

        dm_rows: list[dict] = []
        for d in demand_raw:
            if not isinstance(d, dict):
                continue
            dm_rows.append({
                "name":          str(d.get("name", f"demand_{len(dm_rows)}")),
                "unit_operator": str(d.get("unit_operator", "Retailer")),
                "technology":    "demand",
                "max_power":     float(d.get("max_power", d.get("peak_demand", d.get("capacity", 500)))),
                # ASSUME Demand.__init__ only negates power when min_power <= 0.
                # Always use 0 so the unit correctly submits buy (negative) bids.
                "min_power":     0.0,
                bidding_col:     "naive_eom",
            })

        if not dm_rows:
            _log(info, "[runner] No demand units in YAML — using default 500 MW")
            dm_rows = [{
                "name": "demand_1", "unit_operator": "Retailer",
                "technology": "demand", "max_power": 500.0, "min_power": 0.0,  # must be 0
                bidding_col: "naive_eom",
            }]

        dm_fields = ["name", "unit_operator", "technology", "max_power", "min_power", bidding_col]
        with open(scenario_dir / "demand_units.csv", "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=dm_fields)
            w.writeheader()
            w.writerows(dm_rows)
        _log(info, f"[runner] demand_units.csv written ({len(dm_rows)} units)")

        # ── 6. demand_df.csv — synthetic daily demand curve ───────────────────
        step_h = max(time_step, 1)
        timestamps: list[datetime] = []
        cur = t_start
        # ASSUME internally does pd.date_range(start, end + timedelta(days=1), freq)
        # so demand_df must cover that extended range.
        t_demand_end = t_end + timedelta(days=1)
        while cur <= t_demand_end:
            timestamps.append(cur)
            cur += timedelta(hours=step_h)
        if not timestamps:
            timestamps = [t_start + timedelta(hours=h) for h in range(49)]

        # ── 7. fuel_prices_df.csv — required by ASSUME forecaster ─────────────
        # ASSUME loads this and sets forecasts with prefix "fuel_price_".
        # Must cover the extended index (start → end+1day).
        fuel_cols = ["co2", "natural gas", "coal", "lignite", "hard coal",
                     "nuclear", "oil", "methane", "other"]
        fuel_defaults = {
            "co2": 25.0, "natural gas": 30.0, "coal": 20.0, "lignite": 6.0,
            "hard coal": 20.0, "nuclear": 3.0, "oil": 45.0, "methane": 30.0, "other": 50.0,
        }
        # Override with user-specified fuel prices if present (normalize underscores)
        user_fuel = user_cfg.get("fuel_prices", {})
        if isinstance(user_fuel, dict):
            for k, v in user_fuel.items():
                k_norm = k.replace("_", " ").lower()
                fuel_defaults[k_norm] = float(v)
                if k_norm not in fuel_cols:
                    fuel_cols.append(k_norm)

        with open(scenario_dir / "fuel_prices_df.csv", "w", newline="") as f:
            w3 = csv.writer(f)
            w3.writerow([""] + fuel_cols)
            for ts in timestamps:  # same timestamps as demand_df
                row = [ts.strftime("%Y-%m-%d %H:%M:%S")]
                for col in fuel_cols:
                    row.append(fuel_defaults.get(col, 0.0))
                w3.writerow(row)
        _log(info, f"[runner] fuel_prices_df.csv written ({len(timestamps)} rows, {len(fuel_cols)} fuels)")

        demand_unit_names = [r["name"] for r in dm_rows]
        with open(scenario_dir / "demand_df.csv", "w", newline="") as f:
            w2 = csv.writer(f)
            w2.writerow([""] + demand_unit_names)
            for ts in timestamps:
                # Realistic daily demand curve (peak at ~11h and ~20h, trough at 4h)
                h = ts.hour + ts.minute / 60.0
                base   = 0.60
                morning = 0.25 * math.sin(math.pi * max(h - 5, 0) / 12)
                evening = 0.15 * math.sin(math.pi * max(h - 16, 0) / 8) if h >= 16 else 0.0
                factor  = max(base + morning + evening, 0.40)
                row = [ts.strftime("%Y-%m-%d %H:%M:%S")]
                for r in dm_rows:
                    row.append(round(r["max_power"] * factor, 1))
                w2.writerow(row)
        _log(info, f"[runner] demand_df.csv written ({len(timestamps)} timesteps)")

        # ── 7. Run ASSUME CLI ─────────────────────────────────────────────────
        # assume -s <scenario_name> -c <study_case> -i <inputs_dir> -csv <output_dir>
        cmd = [
            "assume",
            "-s", safe_name,
            "-c", study_case,
            "-i", str(run_dir),
            "-csv", str(output_dir),
        ]
        _log(info, f"[runner] Running: {' '.join(cmd)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(run_dir),
        )

        async for raw_line in proc.stdout:  # type: ignore[union-attr]
            line = raw_line.decode("utf-8", errors="replace").rstrip()
            _log(info, line)

        await proc.wait()
        elapsed = time.monotonic() - t0
        info.duration_s = round(elapsed, 2)

        if proc.returncode == 0:
            info.status          = RunStatus.completed
            # ASSUME writes CSVs into output/<scenario>_<study_case>/ subdir
            actual_out = _find_output_dir(output_dir)
            info.results_summary = _parse_results(actual_out)
            info.output_files    = [f.name for f in actual_out.glob("*.csv")]
            info.finished_at     = datetime.now(timezone.utc).isoformat()
            logger.info("Run %s completed in %.1fs", run_id, elapsed)
            if push_to_graph:
                await _push_results_to_graph(run_id, info)
        else:
            info.status      = RunStatus.failed
            info.error       = f"ASSUME exited with code {proc.returncode}"
            info.finished_at = datetime.now(timezone.utc).isoformat()
            logger.error("Run %s failed (code %d)", run_id, proc.returncode)

    except asyncio.CancelledError:
        info.status      = RunStatus.cancelled
        info.finished_at = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        info.status      = RunStatus.failed
        info.error       = str(exc)
        info.finished_at = datetime.now(timezone.utc).isoformat()
        info.duration_s  = round(time.monotonic() - t0, 2)
        logger.exception("Run %s raised an exception", run_id)


# ─── result parsing ──────────────────────────────────────────────────────────

def _find_output_dir(output_dir: Path) -> Path:
    """
    ASSUME writes results to <output_dir>/<scenario>_<study_case>/.
    If that subdir exists, return it; otherwise fall back to output_dir itself.
    """
    subdirs = [d for d in output_dir.iterdir() if d.is_dir()] if output_dir.exists() else []
    if subdirs:
        return subdirs[0]  # typically only one subdir
    return output_dir


def _parse_results(output_dir: Path) -> dict:
    """
    Parse ASSUME output CSVs and return a lightweight summary dict.
    ASSUME writes: market_meta.csv, unit_dispatch.csv, market_orders.csv, etc.
    """
    summary: dict = {}

    # Market meta — clearing prices (column: "price")
    meta_path = output_dir / "market_meta.csv"
    if meta_path.exists():
        try:
            with open(meta_path, newline="") as f:
                rows = list(csv.DictReader(f))
            if rows:
                prices = [float(r["price"]) for r in rows if r.get("price")]
                if prices:
                    summary["clearing_price"] = {
                        "mean":  round(sum(prices) / len(prices), 2),
                        "min":   round(min(prices), 2),
                        "max":   round(max(prices), 2),
                        "count": len(prices),
                    }
                # Supply/demand volumes
                supply = [float(r.get("supply_volume", 0)) for r in rows if r.get("supply_volume")]
                if supply:
                    summary["supply_volume_mw"] = {
                        "mean": round(sum(supply) / len(supply), 1),
                        "max":  round(max(supply), 1),
                    }
        except Exception as e:
            logger.warning("Could not parse market_meta.csv: %s", e)

    # Unit dispatch — power per unit (columns: "unit", "power")
    dispatch_path = output_dir / "unit_dispatch.csv"
    if dispatch_path.exists():
        try:
            with open(dispatch_path, newline="") as f:
                rows = list(csv.DictReader(f))
            if rows:
                units: dict[str, float] = {}
                for r in rows:
                    unit = r.get("unit", r.get("unit_id", "unknown"))
                    pwr  = float(r.get("power", r.get("volume", 0)) or 0)
                    units[unit] = units.get(unit, 0) + pwr
                summary["dispatch_mwh"] = {
                    k: round(v, 1)
                    for k, v in sorted(units.items(), key=lambda x: -x[1])[:10]
                }
        except Exception as e:
            logger.warning("Could not parse unit_dispatch.csv: %s", e)

    summary["files_generated"] = len(list(output_dir.glob("*.csv")))
    return summary


# ─── push results to knowledge graph ────────────────────────────────────────

async def _push_results_to_graph(run_id: str, info: RunInfo) -> None:
    """Send a plain-text results summary to the ingestion service."""
    if not info.results_summary:
        return
    try:
        text = (
            f"ASSUME Simulation Results — Run {run_id}\n"
            f"Scenario: {info.scenario_name}\n"
            f"Duration: {info.duration_s}s\n"
            f"Status: {info.status}\n\n"
        )
        if "clearing_price" in info.results_summary:
            cp = info.results_summary["clearing_price"]
            text += (
                f"Clearing Price: mean={cp['mean']} €/MWh, "
                f"min={cp['min']}, max={cp['max']} (over {cp['count']} periods)\n"
            )
        dispatch = info.results_summary.get("dispatch_mwh", info.results_summary.get("dispatch", {}))
        if dispatch:
            text += "\nDispatch (MWh):\n"
            for unit, vol in dispatch.items():
                text += f"  {unit}: {vol} MWh\n"

        content = text.encode("utf-8")
        resp = await _http.post(
            f"{settings.ingestion_service_url}/api/ingestion/upload",
            files={"file": (f"run_{run_id}_results.txt", content, "text/plain")},
            data={"tags": "assume,simulation-result,cogni-runner"},
            timeout=60.0,
        )
        if resp.status_code == 200:
            logger.info("Run %s results pushed to knowledge graph", run_id)
        else:
            logger.warning("Push to graph failed: %s", resp.text[:200])
    except Exception as e:
        logger.warning("Could not push results to graph: %s", e)

"""
Agent tools — each tool wraps an HTTP call to an internal service.

Every tool accepts an optional ``auth_header`` so the agent can forward
the user's bearer token to internal services. This keeps all data
scoped to the calling user; without it, internal calls would leak
across tenants.
"""
import httpx
import json
import logging
import re
from app.config import settings

logger = logging.getLogger(__name__)

_http = httpx.AsyncClient(timeout=60.0)


def _hdrs(auth_header: str | None) -> dict:
    """Build downstream headers, forwarding the caller's Authorization if present."""
    return {"Authorization": auth_header} if auth_header else {}


async def search_knowledge_base(query: str, top_k: int = 5,
                                auth_header: str | None = None) -> dict:
    """Semantic search in the document knowledge base."""
    resp = await _http.post(
        f"{settings.rag_service_url}/api/rag/search",
        json={"query": query, "top_k": top_k},
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def ask_knowledge_base(query: str, use_graph: bool = True,
                              auth_header: str | None = None) -> dict:
    """Full GraphRAG Q&A over ingested documents."""
    resp = await _http.post(
        f"{settings.rag_service_url}/api/rag/chat",
        json={"query": query, "use_graph_context": use_graph},
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def get_graph_stats(auth_header: str | None = None) -> dict:
    """Get knowledge graph statistics."""
    resp = await _http.get(
        f"{settings.graph_service_url}/api/graph/stats",
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def search_graph(query: str, limit: int = 10,
                       auth_header: str | None = None) -> dict:
    """Full-text search across graph entities."""
    resp = await _http.get(
        f"{settings.graph_service_url}/api/graph/search",
        params={"q": query, "limit": limit},
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def get_document_insights(doc_id: str,
                                 auth_header: str | None = None) -> dict:
    """Get AI-generated insights for a document."""
    resp = await _http.get(
        f"{settings.ai_engine_url}/api/ai/documents/{doc_id}/insights",
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def find_similar_documents(doc_id: str, top_k: int = 5,
                                  auth_header: str | None = None) -> dict:
    """Find documents similar to a given document."""
    resp = await _http.get(
        f"{settings.ai_engine_url}/api/ai/documents/{doc_id}/similar",
        params={"top_k": top_k},
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def list_documents(limit: int = 10,
                         auth_header: str | None = None) -> dict:
    """List all ingested documents."""
    resp = await _http.get(
        f"{settings.graph_service_url}/api/graph/documents",
        params={"limit": limit},
        headers=_hdrs(auth_header),
    )
    resp.raise_for_status()
    return resp.json()


async def generate_assume_scenario(
    description: str,
    duration_hours: int = 24,
    market_type: str = "day_ahead",
    auth_header: str | None = None,
) -> dict:
    """
    Generate a valid ASSUME YAML scenario configuration from a natural language description.

    Steps:
    1. Semantic search the knowledge graph for relevant ASSUME examples and unit types.
    2. GraphRAG retrieval for matching configuration patterns.
    3. LLM (Groq) synthesizes a complete, executable YAML config.

    Returns a dict with:
      - yaml_config: str   — the generated YAML
      - explanation: str   — human-readable walkthrough
      - similar_examples: list — example configs referenced
      - warnings: list     — any assumptions made
    """
    # ── 1. Pull relevant context from the knowledge graph ────────────────────
    context_chunks: list[str] = []
    similar_examples: list[str] = []

    try:
        search_query = f"ASSUME scenario {market_type} {description}"
        kg_resp = await search_knowledge_base(query=search_query, top_k=8, auth_header=auth_header)
        for chunk in kg_resp.get("results", []):
            src  = chunk.get("source", "")
            text = chunk.get("text", "")
            if text:
                context_chunks.append(f"[{src}]\n{text}")
                if "config.yaml" in src or "example" in src.lower():
                    similar_examples.append(src)
    except Exception as e:
        logger.warning("KG search failed in generate_assume_scenario: %s", e)

    # ── 2. GraphRAG Q&A for config patterns ──────────────────────────────────
    rag_context = ""
    try:
        rag_resp = await ask_knowledge_base(
            query=f"How to configure an ASSUME {market_type} market with {description}?",
            use_graph=True,
            auth_header=auth_header,
        )
        rag_context = rag_resp.get("answer", "")
    except Exception as e:
        logger.warning("GraphRAG call failed in generate_assume_scenario: %s", e)

    # ── 3. Build LLM prompt ───────────────────────────────────────────────────
    knowledge_block = "\n\n---\n".join(context_chunks[:6]) if context_chunks else "No specific examples found."

    import datetime as _dt
    start_dt = _dt.datetime(2024, 1, 1)
    end_dt   = start_dt + _dt.timedelta(hours=duration_hours)
    start_str = start_dt.strftime("%Y-%m-%d %H:%M")
    end_str   = end_dt.strftime("%Y-%m-%d %H:%M")

    system_prompt = (
        "You are an expert in the ASSUME electricity market simulation framework "
        "(FH Aachen ADAPT project). You generate YAML configuration files ONLY in the "
        "exact schema the CogniGrid runner accepts. You MUST use the schema shown in the "
        "user message — any deviation will cause the simulation to fail."
    )

    user_prompt = f"""Generate an ASSUME scenario YAML for this CogniGrid simulation runner.

DESCRIPTION: {description}
MARKET TYPE: {market_type}
SIMULATION DURATION: {duration_hours} hours  ({start_str} → {end_str})

━━━ MANDATORY YAML SCHEMA (use EXACTLY these top-level keys) ━━━

general:
  scenario_name: <snake_case_name>
  start_date: "{start_str}"
  end_date: "{end_str}"
  time_step: "1h"

units:                          # dict of unit_name → attributes (NOT a list)
  <unit_name_1>:
    technology: power_plant     # always "power_plant" for generators
    fuel_type: <fuel>           # one of: coal, natural gas, lignite, nuclear, wind, solar, oil, other
    max_power: <MW>
    min_power: <MW>
    efficiency: <0.0–1.0>
    unit_operator: operator_1
  <unit_name_2>:
    technology: power_plant
    fuel_type: <fuel>
    max_power: <MW>
    min_power: <MW>
    efficiency: <0.0–1.0>
    unit_operator: operator_2

demand:                         # dict of demand_name → attributes (NOT a list)
  demand_1:
    technology: demand
    max_power: <total_MW_demand>
    unit_operator: demand_operator

━━━ REFERENCE EXAMPLE (day-ahead, 24 h) ━━━

general:
  scenario_name: winter_peak_gas_backup
  start_date: "2024-01-01 00:00"
  end_date: "2024-01-02 00:00"
  time_step: "1h"

units:
  coal_base:
    technology: power_plant
    fuel_type: coal
    max_power: 400
    min_power: 100
    efficiency: 0.40
    unit_operator: operator_1
  gas_peaker:
    technology: power_plant
    fuel_type: natural gas
    max_power: 150
    min_power: 0
    efficiency: 0.52
    unit_operator: operator_2
  wind_farm:
    technology: power_plant
    fuel_type: wind
    max_power: 200
    min_power: 0
    efficiency: 1.0
    unit_operator: operator_3

demand:
  demand_1:
    technology: demand
    max_power: 600
    unit_operator: demand_operator

━━━ CONTEXT FROM ASSUME KNOWLEDGE GRAPH ━━━
{knowledge_block}

{f"GRAPHRAG INSIGHTS:{chr(10)}{rag_context}" if rag_context else ""}

━━━ INSTRUCTIONS ━━━
1. Use the MANDATORY YAML SCHEMA above — top-level keys MUST be: general, units, demand.
2. units and demand are DICTS (key: value), NOT lists.
3. Adapt the scenario description ({description}) by choosing realistic unit capacities and fuel types.
4. Return ONLY a JSON object with these three fields. Escape all newlines as \\n inside the yaml_config string.

{{
  "yaml_config": "general:\\n  scenario_name: ...\\n  start_date: \\"{start_str}\\"\\n  ...",
  "explanation": "2-3 paragraph explanation of design choices",
  "warnings": ["assumption 1", "assumption 2"]
}}

CRITICAL: yaml_config value MUST use \\n (backslash-n) for newlines, NOT actual newlines. Return ONLY valid JSON."""

    # ── 4. Call Groq LLM ─────────────────────────────────────────────────────
    if not settings.groq_api_key:
        return {
            "yaml_config": "",
            "explanation": "Groq API key not configured.",
            "similar_examples": similar_examples,
            "warnings": ["LLM unavailable — no GROQ_API_KEY set"],
        }

    try:
        llm_resp = await _http.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.3,
                "max_tokens": 3000,
            },
            timeout=60.0,
        )
        llm_resp.raise_for_status()
        raw = llm_resp.json()["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if LLM wrapped anyway
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        raw = raw.strip()

        # Try JSON first
        try:
            parsed = json.loads(raw)
            return {
                "yaml_config":      parsed.get("yaml_config", ""),
                "explanation":      parsed.get("explanation", ""),
                "similar_examples": similar_examples,
                "warnings":         parsed.get("warnings", []),
            }
        except json.JSONDecodeError:
            pass

        # ── Fallback: JSON parse failed (LLM put literal newlines in string value) ──
        # Strategy: locate "yaml_config": then take everything up to the next JSON key.
        logger.warning("LLM returned non-JSON; attempting robust YAML extraction")

        yaml_content  = ""
        explanation   = ""
        warn_list: list[str] = []

        # ① Find start of yaml_config value (after the colon + optional quote/newline)
        yaml_key_m = re.search(r'"yaml_config"\s*:\s*"?\s*', raw)
        if yaml_key_m:
            content_after = raw[yaml_key_m.end():]
            # ② Find where the next JSON key starts (explanation / warnings)
            next_key_m = re.search(
                r'\n?\s*"(?:explanation|warnings|similar_examples)"\s*:',
                content_after,
            )
            if next_key_m:
                yaml_raw = content_after[:next_key_m.start()]
            else:
                yaml_raw = content_after
            # ③ Strip trailing JSON punctuation (closing quote, comma, brace)
            yaml_raw = re.sub(r'[\s",}]+$', '', yaml_raw)
            # ④ Unescape \n / \" if the LLM did escape them
            yaml_content = yaml_raw.replace('\\n', '\n').replace('\\"', '"').strip()

        # ⑤ Extract explanation (handles both escaped-\n and literal-newline variants)
        exp_m = re.search(
            r'"explanation"\s*:\s*"([\s\S]*?)"\s*[,}]',
            raw,
        )
        if exp_m:
            explanation = exp_m.group(1).replace('\\n', '\n').replace('\\"', '"').strip()

        # ⑥ Extract warnings array (best-effort)
        warn_m = re.search(r'"warnings"\s*:\s*\[([\s\S]*?)\]', raw)
        if warn_m:
            for item in re.findall(r'"([^"]*)"', warn_m.group(1)):
                warn_list.append(item)

        # If we still have nothing useful, treat the entire raw output as YAML
        if not yaml_content:
            yaml_content = re.sub(
                r'"(?:explanation|warnings|similar_examples)"\s*:[\s\S]*$', '', raw
            ).strip()
            yaml_content = re.sub(r'^\s*\{?\s*"yaml_config"\s*:\s*"?\s*', '', yaml_content).strip()

        return {
            "yaml_config":      yaml_content,
            "explanation":      explanation,
            "similar_examples": similar_examples,
            "warnings":         warn_list,
        }
    except Exception as e:
        logger.error("LLM call failed in generate_assume_scenario: %s", e)
        return {
            "yaml_config":      "",
            "explanation":      f"Scenario generation failed: {e}",
            "similar_examples": similar_examples,
            "warnings":         [str(e)],
        }


async def predict_assume_outcome(
    scenario_yaml: str,
    question: str = "What will be the market clearing price and dispatch order?",
    auth_header: str | None = None,
) -> dict:
    """
    Predict simulation outcomes for a given ASSUME scenario YAML without running it.
    Uses GraphRAG to find similar historical scenarios and extrapolates expected results.

    Returns predicted price range, dispatch order, and confidence level.
    """
    context_chunks: list[str] = []

    try:
        kg_resp = await search_knowledge_base(
            query=f"ASSUME simulation results clearing price dispatch {question}",
            top_k=6,
            auth_header=auth_header,
        )
        for chunk in kg_resp.get("results", []):
            text = chunk.get("text", "")
            if text:
                context_chunks.append(f"[{chunk.get('source', '')}]\n{text}")
    except Exception as e:
        logger.warning("KG search failed in predict_assume_outcome: %s", e)

    knowledge_block = "\n\n---\n".join(context_chunks[:5]) or "No matching historical results found."

    system_prompt = (
        "You are an electricity market simulation expert. Given an ASSUME scenario "
        "configuration and related knowledge, predict simulation outcomes with realistic "
        "European market values. Be specific with numbers."
    )

    user_prompt = f"""Predict the simulation outcome for this ASSUME scenario:

SCENARIO YAML:
{scenario_yaml[:2000]}

QUESTION: {question}

RELEVANT KNOWLEDGE:
{knowledge_block}

Output a JSON object:
{{
  "predicted_price_eur_mwh": {{"min": <number>, "max": <number>, "expected": <number>}},
  "dispatch_order": ["<unit1 (cost: X €/MWh)>", "<unit2 (cost: Y €/MWh)>"],
  "market_clearing": "<brief description of how the market will clear>",
  "key_insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "confidence": "<high|medium|low>",
  "confidence_reason": "<why>"
}}

Return ONLY valid JSON, no markdown fences."""

    if not settings.groq_api_key:
        return {"error": "Groq API key not configured", "confidence": "low"}

    try:
        llm_resp = await _http.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                "temperature": 0.2,
                "max_tokens": 1500,
            },
            timeout=45.0,
        )
        llm_resp.raise_for_status()
        raw = llm_resp.json()["choices"][0]["message"]["content"].strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)

    except Exception as e:
        logger.error("predict_assume_outcome failed: %s", e)
        return {"error": str(e), "confidence": "low"}


# Tool registry for the agent
TOOLS = {
    "search_knowledge_base":   search_knowledge_base,
    "ask_knowledge_base":      ask_knowledge_base,
    "get_graph_stats":         get_graph_stats,
    "search_graph":            search_graph,
    "get_document_insights":   get_document_insights,
    "find_similar_documents":  find_similar_documents,
    "list_documents":          list_documents,
    "generate_assume_scenario": generate_assume_scenario,
    "predict_assume_outcome":  predict_assume_outcome,
}

TOOL_DESCRIPTIONS = """
Available tools:
1. search_knowledge_base(query, top_k=5) — semantic search, returns relevant text chunks
2. ask_knowledge_base(query, use_graph=True) — RAG answer with sources from documents
3. get_graph_stats() — knowledge graph statistics (node/edge counts)
4. search_graph(query, limit=10) — search entities in knowledge graph
5. get_document_insights(doc_id) — entity stats and keywords for a document
6. find_similar_documents(doc_id, top_k=5) — find semantically similar docs
7. list_documents(limit=10) — list all ingested documents
8. generate_assume_scenario(description, duration_hours=24, market_type="day_ahead") — generate a complete ASSUME YAML config from a natural language description; returns yaml_config, explanation, similar_examples, warnings
9. predict_assume_outcome(scenario_yaml, question="...") — predict market clearing price, dispatch order and key insights for an ASSUME scenario without running it; returns predicted_price_eur_mwh, dispatch_order, market_clearing, key_insights, confidence
"""

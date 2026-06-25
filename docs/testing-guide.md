# CogniGrid AI Testing Guide

Thanks for testing CogniGrid AI (Knowledge Graph + ASSUME). This guide walks you through every feature in about 10 minutes and tells you what to expect.

## Before you start

1. Connect to the **FH Aachen VPN** (the app lives on an internal VM, not on the public internet).
2. Open in your browser: **http://10.26.5.71:5173/**
3. Create an account on the **Register** page (any email + password). You get an isolated workspace: you only see your own uploads, scenarios and history.

If the page opens but login fails with a network error, tell the maintainer (it usually means the VM was restarted).

## 1. Dashboard

After login you land on the Hub.

1. Check that the dashboard loads with stat cards and the "Ingestion Jobs" chart.
2. Switch the chart range (24h, 7d, 30d, 90d). The x-axis dates should stay readable (not overlapping).

Expected: no broken layout, dates spaced cleanly.

## 2. Data Ingestion and Documents

1. Go to **Data Ingestion** and upload a file (PDF, CSV, TXT, DOCX, or a CIM Excel file).
2. Wait for the job to reach "completed".
3. Open **Documents**. Your file should appear with a chunk count.
4. Try **Delete** on a document. A confirmation dialog should appear with a clean dark background, then remove the file and its graph nodes.

Expected: upload succeeds, document listed, delete dialog readable and working.

## 3. GraphRAG Chat

1. Go to **GraphRAG Chat**.
2. In the LLM Provider panel, pick a provider. **Groq** and **FH GPT-OSS** should show "active". OpenAI and Claude may show "error" (their keys do not pass the FH firewall, this is expected).
3. Ask a question about your uploaded documents.

Expected: a grounded answer with sources. If nothing was uploaded, the assistant says it found no matching chunks.

## 4. AI Agent

1. Go to **AI Agent**.
2. Try a suggested prompt (for example "Predict load next 24h").

Expected: the ReAct agent answers and may show the tools it used.

## 5. ASSUME Studio (the main workspace)

Open **ASSUME Workspace**.

### 5a. Design (visual builder)
1. Stay on the **Visual** tab. You see operator containers (left = supply, right = demand) and the EOM market in the center with two ports.
2. Drag a container to move it. Click **Fullscreen** then press Esc to exit.
3. Click **+ Power plant**, then click the new node and edit its values in the right panel (name, fuel, max power, marginal cost).
4. Switch to the **YAML** tab. Your visual changes appear in the YAML, and both stay in sync.

Expected: smooth editing, no empty ghost operators, YAML reflects every change.

### 5b. Timeseries (optional)
1. Go to **Timeseries**. You can upload demand, availability and fuel price CSVs.
2. If you skip this, the run uses a synthetic demand curve.

### 5c. Run
1. Go to **Run** and check the "Inputs" banner (uploaded vs synthetic).
2. Click **Launch** and watch the live log stream until status is "completed".

Expected: the run completes and appears in the history.

### 5d. Results
1. Open **Results** and select your run.
2. You should see KPIs (clearing price), a price curve over time, supply vs demand, and a stacked dispatch chart.

Expected: a short "Loading charts" state, then the charts, with no flicker of a wrong chart.

## 6. Settings

1. Open **Settings**, change your full name, save, then log out and back in. The new name should persist.

## How to report a problem

For each issue please send:

1. The page and the exact step.
2. What you expected vs what happened.
3. A screenshot if possible.
4. Your browser (Chrome, Firefox, Safari) and whether you were on the FH VPN.

Thank you for testing.

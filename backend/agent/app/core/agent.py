"""
CogniGrid Agent — a ReAct-style agent implemented without LangGraph dependency issues.
Uses a simple Thought → Action → Observation loop with any LLM.
"""
import json
import re
import logging
import httpx
from app.config import settings
from app.core.tools import TOOLS, TOOL_DESCRIPTIONS
from app.models.schemas import AgentRequest, AgentResponse, ToolCall

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = f"""You are CogniGrid Agent, an AI assistant with access to a Knowledge Graph platform.
You help users explore, analyze, and query their document knowledge base.

{TOOL_DESCRIPTIONS}

To use a tool, respond with:
THOUGHT: <your reasoning>
ACTION: <tool_name>
ARGS: <json args>

When you have the final answer, respond with:
THOUGHT: <your reasoning>
FINAL ANSWER: <your answer to the user>

Be concise and accurate. Cite document sources when available.
"""


async def _call_llm(prompt: str, provider: str, model: str) -> str | None:
    """
    Call the appropriate LLM provider.
    Returns None if no LLM is available (caller uses tool-only fallback).
    """
    provider = provider or settings.default_llm_provider
    model    = model    or settings.default_llm_model

    if provider == "openai" and settings.openai_api_key:
        import openai
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        resp = await client.chat.completions.create(
            model=model or "gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        return resp.choices[0].message.content or ""

    elif provider == "anthropic" and settings.anthropic_api_key:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        resp = await client.messages.create(
            model=model or "claude-haiku-4-5-20251001",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text if resp.content else ""

    elif provider not in ("openai", "anthropic"):
        # Auto-select: try Anthropic → OpenAI → Ollama
        if settings.anthropic_api_key:
            return await _call_llm(prompt, "anthropic", "claude-haiku-4-5-20251001")
        if settings.openai_api_key:
            return await _call_llm(prompt, "openai", "gpt-4o-mini")
        # Try Ollama
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{settings.ollama_base_url}/api/generate",
                    json={"model": model, "prompt": prompt, "stream": False},
                )
                resp.raise_for_status()
                return resp.json().get("response", "")
        except Exception:
            return None  # No LLM available

    return None  # API key not configured


def _parse_action(text: str) -> tuple[str, dict] | None:
    """Extract tool name and args from LLM output."""
    action_match = re.search(r"ACTION:\s*(\w+)", text)
    args_match   = re.search(r"ARGS:\s*(\{.*?\})", text, re.DOTALL)
    if not action_match:
        return None
    tool_name = action_match.group(1).strip()
    args = {}
    if args_match:
        try:
            args = json.loads(args_match.group(1))
        except json.JSONDecodeError:
            pass
    return tool_name, args


def _parse_final_answer(text: str) -> str | None:
    match = re.search(r"FINAL ANSWER:\s*(.*)", text, re.DOTALL)
    return match.group(1).strip() if match else None


async def _no_llm_fallback(message: str) -> str:
    """
    When no LLM is configured, run relevant tools based on keywords in the message
    and return a structured summary of the results.
    """
    msg = message.lower()
    results = []

    try:
        if any(k in msg for k in ("stat", "graph", "node", "edge", "count")):
            stats_fn = TOOLS.get("get_graph_stats")
            if stats_fn:
                data = await stats_fn()
                results.append(f"**Graph Statistics:**\n{json.dumps(data, indent=2)}")

        if any(k in msg for k in ("search", "find", "show", "list", "document", "anomal", "critical", "substation", "line", "bus")):
            query = message.strip()
            search_fn = TOOLS.get("search_graph")
            if search_fn:
                data = await search_fn(query=query[:100], limit=10)
                if data and data.get("nodes"):
                    nodes_text = "\n".join([f"• {n.get('label','?')} ({n.get('id','')})" for n in data["nodes"][:10]])
                    results.append(f"**Search results for '{query[:50]}':**\n{nodes_text}")

        if any(k in msg for k in ("rag", "question", "explain", "summarize", "what", "why", "how")):
            rag_fn = TOOLS.get("ask_knowledge_base")
            if rag_fn:
                data = await rag_fn(query=message, use_graph=True)
                if isinstance(data, dict) and data.get("answer"):
                    results.append(f"**Knowledge Base:**\n{data['answer'][:500]}")
    except Exception as e:
        logger.warning("No-LLM fallback tool error: %s", e)

    if results:
        answer = "\n\n".join(results)
        answer += "\n\n*Note: No LLM configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY for AI-generated responses.*"
    else:
        answer = (
            "I can help you explore the CogniGrid knowledge graph.\n\n"
            "Available capabilities:\n"
            "• Graph statistics (nodes, edges, relationships)\n"
            "• Entity search across the knowledge graph\n"
            "• Semantic search over indexed documents\n\n"
            "*Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for full AI agent capabilities.*"
        )
    return answer


async def run_agent(req: AgentRequest) -> AgentResponse:
    import uuid
    session_id  = req.session_id or str(uuid.uuid4())
    tool_calls  = []
    observations = []
    max_steps   = 5

    # Build initial prompt
    history_text = ""
    for msg in req.history[-6:]:
        role = "User" if msg.role == "user" else "Assistant"
        history_text += f"{role}: {msg.content}\n"

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"{'Conversation history:' + chr(10) + history_text if history_text else ''}"
        f"User: {req.message}\n\n"
        f"Begin reasoning:"
    )

    final_answer = ""
    reasoning_parts = []

    # Try one LLM call to check availability
    test_output = await _call_llm(prompt, req.llm_provider, req.llm_model)

    if test_output is None:
        # No LLM available — run inferred tools directly and format output
        final_answer = await _no_llm_fallback(req.message)
    else:
        llm_output = test_output
        for step in range(max_steps):
            reasoning_parts.append(llm_output)

            final = _parse_final_answer(llm_output)
            if final:
                final_answer = final
                break

            action = _parse_action(llm_output)
            if action:
                tool_name, args = action
                tool_fn = TOOLS.get(tool_name)
                if tool_fn:
                    try:
                        result = await tool_fn(**args)
                        tc = ToolCall(tool=tool_name, args=args, result=result)
                        tool_calls.append(tc)
                        observations.append(
                            f"\nOBSERVATION (from {tool_name}):\n{json.dumps(result, indent=2)[:1000]}\n"
                        )
                    except Exception as e:
                        observations.append(f"\nOBSERVATION: Tool {tool_name} failed: {e}\n")
                else:
                    observations.append(f"\nOBSERVATION: Unknown tool '{tool_name}'\n")
            else:
                final_answer = llm_output
                break

            if step < max_steps - 1:
                next_prompt = prompt + "\n".join(observations) + "\n\nContinue reasoning:"
                next_output = await _call_llm(next_prompt, req.llm_provider, req.llm_model)
                if next_output is None:
                    break
                llm_output = next_output

        if not final_answer:
            final_answer = reasoning_parts[-1] if reasoning_parts else "I could not generate a response."

    return AgentResponse(
        answer=final_answer,
        session_id=session_id,
        tool_calls=tool_calls,
        reasoning="\n---\n".join(reasoning_parts),
        tokens_used=sum(len(r.split()) for r in reasoning_parts),
    )

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


async def _call_llm(prompt: str, provider: str, model: str) -> str:
    """Call the appropriate LLM provider."""
    provider = provider or settings.default_llm_provider
    model    = model    or settings.default_llm_model

    if provider == "openai":
        import openai
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        resp = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        return resp.choices[0].message.content or ""

    elif provider == "anthropic":
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        resp = await client.messages.create(
            model=model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text if resp.content else ""

    else:  # ollama
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
            )
            resp.raise_for_status()
            return resp.json().get("response", "")


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

    for step in range(max_steps):
        # Add previous observations to prompt
        if observations:
            prompt += "\n".join(observations) + "\n\nContinue reasoning:"

        llm_output = await _call_llm(prompt, req.llm_provider, req.llm_model)
        reasoning_parts.append(llm_output)

        # Check for final answer
        final = _parse_final_answer(llm_output)
        if final:
            final_answer = final
            break

        # Check for tool call
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
            # No action and no final answer — use output as answer
            final_answer = llm_output
            break

    if not final_answer:
        final_answer = reasoning_parts[-1] if reasoning_parts else "I could not generate a response."

    return AgentResponse(
        answer=final_answer,
        session_id=session_id,
        tool_calls=tool_calls,
        reasoning="\n---\n".join(reasoning_parts),
        tokens_used=sum(len(r.split()) for r in reasoning_parts),
    )

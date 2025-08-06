#!/usr/bin/env python3
"""Example trading assistant powered by R&D-Agent and a local gpt-oss-20b model."""
from dataclasses import dataclass
import os
from rdagent.utils.agent.workflow import build_cls_from_json_with_retry


@dataclass
class TradeIdea:
    ticker: str
    action: str
    rationale: str


def main() -> None:
    system_prompt = (
        "You are a quantitative trading assistant. Respond with JSON containing "
        "'ticker', 'action' (buy/sell), and 'rationale'."
    )
    user_prompt = "Generate a sample trade idea for SPY."

    idea = build_cls_from_json_with_retry(
        TradeIdea,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=os.getenv("CHAT_MODEL", "gpt-oss-20b"),
        base_url=os.getenv("OPENAI_API_BASE", "http://localhost:8000"),
        api_key=os.getenv("OPENAI_API_KEY", "dummy"),
    )

    print(idea)


if __name__ == "__main__":
    main()

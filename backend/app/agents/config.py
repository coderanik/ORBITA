"""
Agent configuration and model initialization.
"""

import os
from langchain_openai import ChatOpenAI

def get_llm(provider: str = "gemini", temperature: float = 0.0):
    """
    Returns the configured LLM for the agent.
    """
    normalized = provider.lower().strip()

    # OpenAI and Anthropic are intentionally disabled for now.
    # if normalized == "anthropic":
    #     return ChatAnthropic(
    #         model_name="claude-3-5-sonnet-20240620",
    #         temperature=temperature,
    #         api_key=os.getenv("ANTHROPIC_API_KEY")
    #     )
    # if normalized == "openai":
    #     return ChatOpenAI(
    #         model="gpt-4o",
    #         temperature=temperature,
    #         api_key=os.getenv("OPENAI_API_KEY")
    #     )

    if normalized == "deepseek":
        return ChatOpenAI(
            model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            temperature=temperature,
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        )
    if normalized in {"huggingface", "hf"}:
        return ChatOpenAI(
            model=os.getenv("HF_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct"),
            temperature=temperature,
            api_key=os.getenv("HF_TOKEN"),
            base_url=os.getenv("HF_BASE_URL", "https://router.huggingface.co/v1")
        )
    if normalized == "gemini":
        return ChatOpenAI(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            temperature=temperature,
            api_key=os.getenv("GOOGLE_API_KEY"),
            base_url=os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
        )

    # Safe default for unsupported provider values.
    return ChatOpenAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        temperature=temperature,
        api_key=os.getenv("GOOGLE_API_KEY"),
        base_url=os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai")
    )

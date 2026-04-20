"""
Agent configuration and model initialization.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

def get_llm(provider: str = "openai", temperature: float = 0.0):
    """
    Returns the configured LLM for the agent.
    """
    if provider.lower() == "anthropic":
        return ChatAnthropic(
            model_name="claude-3-5-sonnet-20240620", 
            temperature=temperature,
            api_key=os.getenv("ANTHROPIC_API_KEY")
        )
    else:
        # Default to OpenAI
        return ChatOpenAI(
            model="gpt-4o", 
            temperature=temperature,
            api_key=os.getenv("OPENAI_API_KEY")
        )

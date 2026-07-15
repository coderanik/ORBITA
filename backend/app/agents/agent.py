"""
Main ReAct Agent orchestrator.
"""

from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from .config import get_llm
from .prompts import AGENT_SYSTEM_PROMPT
from .tools.db_query import query_telemetry, query_space_weather
from .tools.propagation import run_propagation
from .tools.weather_correlator import correlate_events
from .tools.report_writer import generate_report

class OrbitalAnomalyAgent:
    def __init__(self, provider: str = "openai"):
        self.llm = get_llm(provider=provider, temperature=0.1)
        self.tools = [
            query_telemetry,
            query_space_weather,
            run_propagation,
            correlate_events,
            generate_report
        ]
        
        # Construct the tool calling agent using the new factory
        self.agent = create_agent(
            model=self.llm, 
            tools=self.tools, 
            system_prompt=AGENT_SYSTEM_PROMPT
        )

    async def investigate(self, alert_id: int) -> str:
        """
        Runs the full autonomous investigation using the compiled agent graph.
        """
        try:
            # The new create_agent factory uses a graph-based state.
            # We pass the input as a dictionary.
            result = await self.agent.ainvoke({
                "messages": [HumanMessage(content=f"Investigate anomaly alert ID {alert_id}. Provide a final incident report.")]
            })
            
            # The result is the final state of the graph.
            # We extract the last message content or the output field if available.
            messages = result.get("messages", [])
            if messages:
                return messages[-1].content
            return "Failed to generate report."
            
        except Exception as e:
            return f"Agent execution failed: {str(e)}"

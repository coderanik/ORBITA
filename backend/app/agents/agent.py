"""
Main ReAct Agent orchestrator.
"""

from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
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
        
        # Create prompt
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", AGENT_SYSTEM_PROMPT),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}")
        ])
        
        # Construct the tool calling agent
        self.agent = create_tool_calling_agent(self.llm, self.tools, self.prompt)
        
        # Create an agent executor
        self.agent_executor = AgentExecutor(
            agent=self.agent, 
            tools=self.tools, 
            verbose=True,
            return_intermediate_steps=True
        )

    async def investigate(self, alert_id: int) -> str:
        """
        Runs the full autonomous investigation.
        """
        try:
            result = await self.agent_executor.ainvoke({
                "input": f"Investigate anomaly alert ID {alert_id}. Provide a final incident report."
            })
            
            # The agent should ideally call the `generate_report` tool, 
            # but if it just outputs the text, we return that.
            return result.get("output", "Failed to generate report.")
            
        except Exception as e:
            return f"Agent execution failed: {str(e)}"

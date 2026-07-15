"""
API routes for Autonomous AI Agents.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.agent import OrbitalAnomalyAgent

router = APIRouter(prefix="/agents", tags=["Autonomous Agents"])

class InvestigateRequest(BaseModel):
    alert_id: int
    provider: str = "gemini"  # gemini | deepseek | huggingface

class InvestigateResponse(BaseModel):
    report: str

@router.post("/investigate", response_model=InvestigateResponse)
async def trigger_investigation(req: InvestigateRequest):
    """
    Triggers an autonomous AI agent to investigate an anomaly.
    The agent will use tools to query the DB, correlate space weather, 
    run physics simulations, and write a report.
    """
    agent = OrbitalAnomalyAgent(provider=req.provider)
    
    report = await agent.investigate(alert_id=req.alert_id)
    
    if "failed" in report.lower() and "agent execution failed" in report.lower():
        raise HTTPException(status_code=500, detail=report)
        
    return InvestigateResponse(report=report)

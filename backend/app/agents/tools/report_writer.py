"""
Report writing tool.
"""

from langchain_core.tools import tool

@tool
def generate_report(findings: str, root_cause: str, recommendation: str) -> str:
    """
    Compiles the agent's findings into a standardized markdown Incident Report.
    Always use this as your FINAL action before finishing.
    """
    report = f"""# Autonomous Incident Report

## Executive Summary
{findings}

## Root Cause Analysis
{root_cause}

## Recommended Actions
{recommendation}
"""
    return report

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

## Evidence Snapshot
- Telemetry evidence: include key parameters, values, and timestamp deltas from nominal baselines.
- Space weather evidence: include Kp/F10.7/flare class and event timing relation to anomaly.
- Orbital evidence: include conjunction risk, miss distance, and relative-motion findings.

## Root Cause Analysis
{root_cause}

## Confidence & Uncertainty
- Confidence level: state High / Medium / Low with rationale.
- Primary uncertainty drivers: data quality gaps, sparse telemetry, timing ambiguity, or model limitations.

## Operational Impact
- Current mission risk: immediate/near-term impact and affected subsystem(s).
- Escalation criteria: concrete trigger thresholds for paging or emergency maneuvers.

## Recommended Actions
{recommendation}

## Follow-up Plan (24h)
1. Monitoring actions with sampling cadence.
2. Validation tests to confirm or reject the root cause.
3. Owner assignment and rollback/contingency plan.
"""
    return report

"""
DriveGuard AI — FastAPI Microservice & Telemetry Ingestion Hub
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import time

app = FastAPI(
    title="DriveGuard AI Telemetry API",
    description="Intelligent Driver Safety & Accident Prevention Platform REST Service",
    version="1.0.0"
)

class TelemetryPayload(BaseModel):
    trip_id: str
    driver_id: str
    vehicle_id: str
    ear: float = Field(..., ge=0.0, le=1.0)
    mar: float = Field(..., ge=0.0, le=1.0)
    eye_closure_sec: float = Field(..., ge=0.0)
    perclos: float = Field(..., ge=0.0, le=1.0)
    pitch: float
    yaw: float
    roll: float
    is_yawning: bool
    attention_state: str

class RiskEvaluationResponse(BaseModel):
    risk_level: str
    safety_score: int
    intervention_stage: str
    primary_cause: str
    recommendation: str
    escalate_to_fleet: bool

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "driveguard-ai-backend", "timestamp": time.time()}

@app.post("/api/v1/telemetry/evaluate", response_model=RiskEvaluationResponse)
def evaluate_telemetry(payload: TelemetryPayload):
    # Deterministic scoring
    prolonged_penalty = 35 if payload.eye_closure_sec >= 1.5 else (15 if payload.eye_closure_sec >= 0.8 else 0)
    fatigue_penalty = (25 if payload.perclos >= 0.28 else (12 if payload.perclos >= 0.15 else 0)) + (8 if payload.is_yawning else 0)
    distraction_penalty = 20 if abs(payload.yaw) > 24 or payload.pitch < -16 else 0

    total_deductions = prolonged_penalty + fatigue_penalty + distraction_penalty
    score = max(0, min(100, 100 - total_deductions))

    if score >= 88:
        risk_level = "SAFE"
        stage = "STAGE_0_NORMAL"
        cause = "Normal driving conditions."
        rec = "Maintain safe distance and remain alert."
    elif score >= 70:
        risk_level = "LOW"
        stage = "STAGE_1_EARLY_FATIGUE"
        cause = "Early signs of fatigue detected."
        rec = "Increase vigilance and circulate cabin air."
    elif score >= 50:
        risk_level = "MODERATE"
        stage = "STAGE_2_DRIVER_WARNING"
        cause = "Inattention or sustained drowsy flutter."
        rec = "Refocus on forward roadway trajectory."
    elif score >= 25:
        risk_level = "HIGH"
        stage = "STAGE_3_CRITICAL_ALERT"
        cause = f"Prolonged closure ({payload.eye_closure_sec:.1f}s) / Microsleep."
        rec = "PULL OVER SAFELY. Severe imminent accident risk."
    else:
        risk_level = "CRITICAL"
        stage = "STAGE_4_OWNER_ALERT"
        cause = "Chronic unresolved driver impairment."
        rec = "Emergency fleet intervention initiated."

    return RiskEvaluationResponse(
        risk_level=risk_level,
        safety_score=score,
        intervention_stage=stage,
        primary_cause=cause,
        recommendation=rec,
        escalate_to_fleet=(stage == "STAGE_4_OWNER_ALERT" or payload.eye_closure_sec >= 2.5)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""Pydantic schemas for the ATSAD Benchmark framework."""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# ── Dataset Schemas ───────────────────────────────────────────

class DatasetBase(BaseModel):
    name: str
    description: str | None = None
    task_type: str = Field(..., description="UNIVARIATE or MULTIVARIATE")
    domain: str = "SPACECRAFT"
    num_channels: int = 1
    num_data_points: int | None = None
    num_anomalies: int | None = None
    anomaly_ratio: float | None = None
    sampling_rate_hz: float | None = None
    source: str | None = None
    file_path: str | None = None

class DatasetCreate(DatasetBase): pass

class DatasetRead(DatasetBase):
    model_config = ConfigDict(from_attributes=True)
    dataset_id: int
    created_at: datetime

class DatasetList(BaseModel):
    total: int
    items: list[DatasetRead]


# ── Model Schemas ─────────────────────────────────────────────

class ModelBase(BaseModel):
    name: str
    model_type: str = Field(..., description="LLM, STATISTICAL, DEEP_LEARNING, HYBRID")
    architecture: str | None = None
    version: str | None = None
    description: str | None = None
    hyperparameters: dict | None = None
    prompt_template: str | None = None
    context_strategy: str | None = Field(None, description="ZERO_SHOT, FEW_SHOT, RAG, FINE_TUNED")
    is_baseline: bool = False

class ModelCreate(ModelBase): pass

class ModelUpdate(BaseModel):
    description: str | None = None
    hyperparameters: dict | None = None
    prompt_template: str | None = None
    version: str | None = None

class ModelRead(ModelBase):
    model_config = ConfigDict(from_attributes=True)
    model_id: int
    created_at: datetime
    updated_at: datetime

class ModelList(BaseModel):
    total: int
    items: list[ModelRead]


# ── Run Schemas ───────────────────────────────────────────────

class RunBase(BaseModel):
    dataset_id: int
    model_id: int
    run_name: str | None = None
    config: dict | None = None
    notes: str | None = None

class RunCreate(RunBase): pass

class RunUpdate(BaseModel):
    status: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    notes: str | None = None

class RunRead(RunBase):
    model_config = ConfigDict(from_attributes=True)
    run_id: int
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    created_at: datetime

class RunList(BaseModel):
    total: int
    items: list[RunRead]


# ── Result Schemas ────────────────────────────────────────────

class ResultBase(BaseModel):
    run_id: int
    # Standard ML metrics
    precision: float | None = None
    recall: float | None = None
    f1_score: float | None = None
    accuracy: float | None = None
    auc_roc: float | None = None
    auc_pr: float | None = None
    # ATSADBench metrics
    alarm_accuracy: float | None = None
    alarm_latency: float | None = None
    alarm_contiguity: float | None = None
    atsad_composite_score: float | None = None
    # Point-Adjust metrics
    pa_precision: float | None = None
    pa_recall: float | None = None
    pa_f1: float | None = None
    # Operational
    total_predictions: int | None = None
    true_positives: int | None = None
    false_positives: int | None = None
    false_negatives: int | None = None
    inference_time_ms: float | None = None
    tokens_used: int | None = None
    # Extra
    channel_metrics: dict | None = None
    confusion_matrix: dict | None = None

class ResultCreate(ResultBase): pass

class ResultRead(ResultBase):
    model_config = ConfigDict(from_attributes=True)
    result_id: int
    created_at: datetime


# ── Detection Event Schemas ───────────────────────────────────

class DetectionEventBase(BaseModel):
    run_id: int
    timestamp_index: int
    channel: str | None = None
    predicted_label: int
    true_label: int | None = None
    anomaly_score: float | None = None
    confidence: float | None = None
    is_correct: bool | None = None

class DetectionEventCreate(DetectionEventBase): pass

class DetectionEventBatchCreate(BaseModel):
    items: list[DetectionEventCreate]

class DetectionEventRead(DetectionEventBase):
    model_config = ConfigDict(from_attributes=True)
    detection_id: int
    created_at: datetime


# ── Leaderboard Entry ─────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    """Aggregated view for the benchmark leaderboard."""
    model_name: str
    model_type: str
    architecture: str | None = None
    context_strategy: str | None = None
    dataset_name: str
    task_type: str
    run_id: int
    # Scores
    f1_score: float | None = None
    alarm_accuracy: float | None = None
    alarm_latency: float | None = None
    alarm_contiguity: float | None = None
    atsad_composite_score: float | None = None
    inference_time_ms: float | None = None
    tokens_used: int | None = None

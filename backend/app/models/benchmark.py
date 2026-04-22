"""SQLAlchemy models for the ATSAD benchmark framework.

ORBITA-ATSAD: Integrated Platform for Benchmarking and Operational Deployment
of LLM-Based Anomaly Detection in Spacecraft Telemetry.

Models:
  - BenchmarkDataset: Registered time-series datasets (ATSADBench tasks)
  - BenchmarkModel:   Registered detection models / LLM configurations
  - BenchmarkRun:     A single evaluation run linking dataset + model
  - BenchmarkResult:  Per-run metrics (Alarm Accuracy, Latency, Contiguity, etc.)
  - DetectionEvent:   Individual anomaly detections from a run (for visualization)
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, Integer, String, Float, Boolean, Text, ForeignKey,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


# ── Dataset Registry ──────────────────────────────────────────

class BenchmarkDataset(Base):
    """A registered time-series dataset for anomaly detection benchmarking."""
    __tablename__ = "benchmark_dataset"
    __table_args__ = {"schema": "ml"}

    dataset_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    task_type: Mapped[str] = mapped_column(String(30), nullable=False)  # UNIVARIATE, MULTIVARIATE
    domain: Mapped[str] = mapped_column(String(50), default="SPACECRAFT")  # SPACECRAFT, SATELLITE, SIMULATED
    num_channels: Mapped[int] = mapped_column(Integer, default=1)
    num_data_points: Mapped[int | None] = mapped_column(Integer)
    num_anomalies: Mapped[int | None] = mapped_column(Integer)
    anomaly_ratio: Mapped[float | None] = mapped_column(Float)
    sampling_rate_hz: Mapped[float | None] = mapped_column(Float)
    source: Mapped[str | None] = mapped_column(String(200))  # ATSADBench, custom, etc.
    file_path: Mapped[str | None] = mapped_column(String(500))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    org_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    created_by: Mapped[int | None] = mapped_column(BigInteger)
    updated_by: Mapped[int | None] = mapped_column(BigInteger)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    runs = relationship("BenchmarkRun", back_populates="dataset", lazy="noload")


# ── Model Registry ────────────────────────────────────────────

class BenchmarkModel(Base):
    """A registered anomaly detection model or LLM configuration."""
    __tablename__ = "benchmark_model"
    __table_args__ = {"schema": "ml"}

    model_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)  # LLM, STATISTICAL, DEEP_LEARNING, HYBRID
    architecture: Mapped[str | None] = mapped_column(String(100))  # GPT-4, LLaMA, LSTM-AE, Isolation Forest, etc.
    version: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    hyperparameters: Mapped[dict | None] = mapped_column(JSONB, default={})
    prompt_template: Mapped[str | None] = mapped_column(Text)  # For LLM-based models
    context_strategy: Mapped[str | None] = mapped_column(String(30))  # ZERO_SHOT, FEW_SHOT, RAG, FINE_TUNED
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False)
    org_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    created_by: Mapped[int | None] = mapped_column(BigInteger)
    updated_by: Mapped[int | None] = mapped_column(BigInteger)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    runs = relationship("BenchmarkRun", back_populates="model", lazy="noload")


# ── Benchmark Runs ────────────────────────────────────────────

class BenchmarkRun(Base):
    """A single evaluation run of a model on a dataset."""
    __tablename__ = "benchmark_run"
    __table_args__ = {"schema": "ml"}

    run_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dataset_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("ml.benchmark_dataset.dataset_id"), nullable=False)
    model_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("ml.benchmark_model.model_id"), nullable=False)
    run_name: Mapped[str | None] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    started_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    config: Mapped[dict | None] = mapped_column(JSONB, default={})  # Run-specific configuration overrides
    notes: Mapped[str | None] = mapped_column(Text)
    org_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    created_by: Mapped[int | None] = mapped_column(BigInteger)
    updated_by: Mapped[int | None] = mapped_column(BigInteger)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    dataset = relationship("BenchmarkDataset", back_populates="runs")
    model = relationship("BenchmarkModel", back_populates="runs")
    results = relationship("BenchmarkResult", back_populates="run", lazy="selectin")
    detections = relationship("DetectionEvent", back_populates="run", lazy="noload")


# ── Benchmark Results (Metrics) ───────────────────────────────

class BenchmarkResult(Base):
    """Aggregated evaluation metrics for a benchmark run.

    Implements ATSADBench user-oriented metrics:
    - Alarm Accuracy (precision of alarm windows)
    - Alarm Latency  (delay from anomaly onset to first detection)
    - Alarm Contiguity (fragmentation of detection within anomaly)
    Plus standard ML metrics for compatibility.
    """
    __tablename__ = "benchmark_result"
    __table_args__ = {"schema": "ml"}

    result_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("ml.benchmark_run.run_id", ondelete="CASCADE"), nullable=False)

    # ── Standard ML Metrics ───────────────────────────────────
    precision: Mapped[float | None] = mapped_column(Float)
    recall: Mapped[float | None] = mapped_column(Float)
    f1_score: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    auc_roc: Mapped[float | None] = mapped_column(Float)
    auc_pr: Mapped[float | None] = mapped_column(Float)

    # ── ATSADBench User-Oriented Metrics ──────────────────────
    alarm_accuracy: Mapped[float | None] = mapped_column(Float)
    alarm_latency: Mapped[float | None] = mapped_column(Float)  # in time steps
    alarm_contiguity: Mapped[float | None] = mapped_column(Float)  # 0 to 1
    atsad_composite_score: Mapped[float | None] = mapped_column(Float)

    # ── Point-Adjust Metrics ──────────────────────────────────
    pa_precision: Mapped[float | None] = mapped_column(Float)
    pa_recall: Mapped[float | None] = mapped_column(Float)
    pa_f1: Mapped[float | None] = mapped_column(Float)

    # ── Operational Metrics ───────────────────────────────────
    total_predictions: Mapped[int | None] = mapped_column(Integer)
    true_positives: Mapped[int | None] = mapped_column(Integer)
    false_positives: Mapped[int | None] = mapped_column(Integer)
    false_negatives: Mapped[int | None] = mapped_column(Integer)
    inference_time_ms: Mapped[float | None] = mapped_column(Float)
    tokens_used: Mapped[int | None] = mapped_column(Integer)  # For LLM cost tracking

    # ── Extra ─────────────────────────────────────────────────
    channel_metrics: Mapped[dict | None] = mapped_column(JSONB)  # Per-channel breakdown
    confusion_matrix: Mapped[dict | None] = mapped_column(JSONB)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default={})
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    run = relationship("BenchmarkRun", back_populates="results")


# ── Detection Events (Individual) ─────────────────────────────

class DetectionEvent(Base):
    """An individual anomaly detection from a benchmark run (for visualization)."""
    __tablename__ = "detection_event"
    __table_args__ = {"schema": "ml"}

    detection_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    run_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("ml.benchmark_run.run_id", ondelete="CASCADE"), nullable=False)
    timestamp_index: Mapped[int] = mapped_column(Integer, nullable=False)  # Position in the time series
    channel: Mapped[str | None] = mapped_column(String(100))
    predicted_label: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 = normal, 1 = anomaly
    true_label: Mapped[int | None] = mapped_column(Integer)
    anomaly_score: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default="now()")

    run = relationship("BenchmarkRun", back_populates="detections")

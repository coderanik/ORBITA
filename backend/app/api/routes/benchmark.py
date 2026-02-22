"""ORBITA-ATSAD Benchmark API endpoints.

Provides a full lifecycle for benchmarking anomaly detection models:
  - Register datasets and models
  - Create and manage evaluation runs
  - Submit predictions and compute ATSADBench metrics
  - Query results and leaderboard
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.benchmark import (
    BenchmarkDataset,
    BenchmarkModel,
    BenchmarkRun,
    BenchmarkResult,
    DetectionEvent,
)
from app.schemas.benchmark import (
    DatasetCreate, DatasetRead, DatasetList,
    ModelCreate, ModelRead, ModelUpdate, ModelList,
    RunCreate, RunRead, RunUpdate, RunList,
    ResultCreate, ResultRead,
    DetectionEventCreate, DetectionEventBatchCreate, DetectionEventRead,
    LeaderboardEntry,
)
from app.services.atsad_evaluator import evaluate

router = APIRouter(prefix="/atsad", tags=["ATSAD Benchmark"])


# ══════════════════════════════════════════════════════════════
#  DATASETS
# ══════════════════════════════════════════════════════════════

@router.get("/datasets", response_model=DatasetList)
async def list_datasets(
    task_type: str | None = Query(None, description="UNIVARIATE or MULTIVARIATE"),
    domain: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List registered benchmark datasets."""
    query = select(BenchmarkDataset)
    count_query = select(func.count()).select_from(BenchmarkDataset)

    if task_type:
        query = query.where(BenchmarkDataset.task_type == task_type.upper())
        count_query = count_query.where(BenchmarkDataset.task_type == task_type.upper())
    if domain:
        query = query.where(BenchmarkDataset.domain == domain.upper())
        count_query = count_query.where(BenchmarkDataset.domain == domain.upper())

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(BenchmarkDataset.name).offset(offset).limit(limit))
    items = result.scalars().all()
    return DatasetList(total=total, items=[DatasetRead.model_validate(d) for d in items])


@router.get("/datasets/{dataset_id}", response_model=DatasetRead)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single benchmark dataset."""
    result = await db.execute(
        select(BenchmarkDataset).where(BenchmarkDataset.dataset_id == dataset_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetRead.model_validate(obj)


@router.post("/datasets", response_model=DatasetRead, status_code=201)
async def create_dataset(payload: DatasetCreate, db: AsyncSession = Depends(get_db)):
    """Register a new benchmark dataset."""
    obj = BenchmarkDataset(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return DatasetRead.model_validate(obj)


# ══════════════════════════════════════════════════════════════
#  MODELS
# ══════════════════════════════════════════════════════════════

@router.get("/models", response_model=ModelList)
async def list_models(
    model_type: str | None = Query(None, description="LLM, STATISTICAL, DEEP_LEARNING, HYBRID"),
    context_strategy: str | None = Query(None),
    is_baseline: bool | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List registered anomaly detection models."""
    query = select(BenchmarkModel)
    count_query = select(func.count()).select_from(BenchmarkModel)

    if model_type:
        query = query.where(BenchmarkModel.model_type == model_type.upper())
        count_query = count_query.where(BenchmarkModel.model_type == model_type.upper())
    if context_strategy:
        query = query.where(BenchmarkModel.context_strategy == context_strategy.upper())
        count_query = count_query.where(BenchmarkModel.context_strategy == context_strategy.upper())
    if is_baseline is not None:
        query = query.where(BenchmarkModel.is_baseline == is_baseline)
        count_query = count_query.where(BenchmarkModel.is_baseline == is_baseline)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(query.order_by(BenchmarkModel.name).offset(offset).limit(limit))
    items = result.scalars().all()
    return ModelList(total=total, items=[ModelRead.model_validate(m) for m in items])


@router.get("/models/{model_id}", response_model=ModelRead)
async def get_model(model_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single registered model."""
    result = await db.execute(
        select(BenchmarkModel).where(BenchmarkModel.model_id == model_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Model not found")
    return ModelRead.model_validate(obj)


@router.post("/models", response_model=ModelRead, status_code=201)
async def create_model(payload: ModelCreate, db: AsyncSession = Depends(get_db)):
    """Register a new anomaly detection model."""
    obj = BenchmarkModel(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return ModelRead.model_validate(obj)


@router.patch("/models/{model_id}", response_model=ModelRead)
async def update_model(
    model_id: int, payload: ModelUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a registered model."""
    result = await db.execute(
        select(BenchmarkModel).where(BenchmarkModel.model_id == model_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Model not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return ModelRead.model_validate(obj)


# ══════════════════════════════════════════════════════════════
#  RUNS
# ══════════════════════════════════════════════════════════════

@router.get("/runs", response_model=RunList)
async def list_runs(
    dataset_id: int | None = Query(None),
    model_id: int | None = Query(None),
    status: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List benchmark runs with optional filters."""
    query = select(BenchmarkRun)
    count_query = select(func.count()).select_from(BenchmarkRun)

    if dataset_id:
        query = query.where(BenchmarkRun.dataset_id == dataset_id)
        count_query = count_query.where(BenchmarkRun.dataset_id == dataset_id)
    if model_id:
        query = query.where(BenchmarkRun.model_id == model_id)
        count_query = count_query.where(BenchmarkRun.model_id == model_id)
    if status:
        query = query.where(BenchmarkRun.status == status.upper())
        count_query = count_query.where(BenchmarkRun.status == status.upper())

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.order_by(BenchmarkRun.created_at.desc()).offset(offset).limit(limit)
    )
    items = result.scalars().all()
    return RunList(total=total, items=[RunRead.model_validate(r) for r in items])


@router.get("/runs/{run_id}", response_model=RunRead)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single benchmark run."""
    result = await db.execute(
        select(BenchmarkRun).where(BenchmarkRun.run_id == run_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunRead.model_validate(obj)


@router.post("/runs", response_model=RunRead, status_code=201)
async def create_run(payload: RunCreate, db: AsyncSession = Depends(get_db)):
    """Create a new benchmark evaluation run."""
    obj = BenchmarkRun(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return RunRead.model_validate(obj)


@router.patch("/runs/{run_id}", response_model=RunRead)
async def update_run(
    run_id: int, payload: RunUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a benchmark run (e.g., mark as RUNNING, COMPLETED)."""
    result = await db.execute(
        select(BenchmarkRun).where(BenchmarkRun.run_id == run_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Run not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)

    await db.flush()
    await db.refresh(obj)
    return RunRead.model_validate(obj)


# ══════════════════════════════════════════════════════════════
#  RESULTS
# ══════════════════════════════════════════════════════════════

@router.get("/runs/{run_id}/results", response_model=list[ResultRead])
async def get_run_results(run_id: int, db: AsyncSession = Depends(get_db)):
    """Get all result metrics for a benchmark run."""
    result = await db.execute(
        select(BenchmarkResult).where(BenchmarkResult.run_id == run_id)
    )
    items = result.scalars().all()
    return [ResultRead.model_validate(r) for r in items]


@router.post("/results", response_model=ResultRead, status_code=201)
async def create_result(payload: ResultCreate, db: AsyncSession = Depends(get_db)):
    """Submit evaluation results for a benchmark run."""
    obj = BenchmarkResult(**payload.model_dump(exclude_unset=True))
    db.add(obj)
    await db.flush()
    await db.refresh(obj)
    return ResultRead.model_validate(obj)


# ══════════════════════════════════════════════════════════════
#  EVALUATE (compute metrics from predictions)
# ══════════════════════════════════════════════════════════════

from pydantic import BaseModel as PydanticBaseModel


class EvaluateRequest(PydanticBaseModel):
    """Submit ground-truth and predictions for automatic evaluation."""
    run_id: int
    y_true: list[int]
    y_pred: list[int]
    composite_weights: dict[str, float] | None = None
    save_detections: bool = False  # Also save individual DetectionEvents


@router.post("/evaluate", response_model=ResultRead, status_code=201)
async def evaluate_predictions(
    payload: EvaluateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Run the ATSADBench evaluation pipeline and store results.

    Computes all metrics (standard, ATSADBench, point-adjust) from
    the provided ground-truth and predictions, stores them as a
    BenchmarkResult, and optionally stores individual DetectionEvents.
    """
    # Validate run exists
    run_result = await db.execute(
        select(BenchmarkRun).where(BenchmarkRun.run_id == payload.run_id)
    )
    run = run_result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if len(payload.y_true) != len(payload.y_pred):
        raise HTTPException(
            status_code=400,
            detail="y_true and y_pred must have the same length"
        )

    # Run evaluation
    eval_result = evaluate(
        payload.y_true, payload.y_pred, payload.composite_weights
    )

    # Store result
    result_obj = BenchmarkResult(
        run_id=payload.run_id,
        **eval_result.to_dict(),
    )
    db.add(result_obj)

    # Optionally save individual detection events
    if payload.save_detections:
        for i, (yt, yp) in enumerate(zip(payload.y_true, payload.y_pred)):
            det = DetectionEvent(
                run_id=payload.run_id,
                timestamp_index=i,
                predicted_label=yp,
                true_label=yt,
                is_correct=(yt == yp),
            )
            db.add(det)

    # Update run status
    run.status = "COMPLETED"
    run.completed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(result_obj)
    return ResultRead.model_validate(result_obj)


# ══════════════════════════════════════════════════════════════
#  DETECTION EVENTS
# ══════════════════════════════════════════════════════════════

@router.get("/runs/{run_id}/detections", response_model=list[DetectionEventRead])
async def get_run_detections(
    run_id: int,
    from_index: int | None = Query(None),
    to_index: int | None = Query(None),
    predicted_label: int | None = Query(None),
    limit: int = Query(1000, ge=1, le=50000),
    db: AsyncSession = Depends(get_db),
):
    """Get detection events for a run (for time-series visualization)."""
    query = select(DetectionEvent).where(DetectionEvent.run_id == run_id)

    if from_index is not None:
        query = query.where(DetectionEvent.timestamp_index >= from_index)
    if to_index is not None:
        query = query.where(DetectionEvent.timestamp_index <= to_index)
    if predicted_label is not None:
        query = query.where(DetectionEvent.predicted_label == predicted_label)

    query = query.order_by(DetectionEvent.timestamp_index).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()
    return [DetectionEventRead.model_validate(d) for d in items]


@router.post("/detections/batch", status_code=201)
async def create_detections_batch(
    payload: DetectionEventBatchCreate,
    db: AsyncSession = Depends(get_db),
):
    """Batch-insert detection events."""
    records = [DetectionEvent(**d.model_dump(exclude_unset=True)) for d in payload.items]
    db.add_all(records)
    await db.flush()
    return {"ingested": len(records)}


# ══════════════════════════════════════════════════════════════
#  LEADERBOARD
# ══════════════════════════════════════════════════════════════

@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    task_type: str | None = Query(None, description="UNIVARIATE or MULTIVARIATE"),
    dataset_id: int | None = Query(None),
    model_type: str | None = Query(None),
    sort_by: str = Query("atsad_composite_score", description="Metric to sort by"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Get the benchmark leaderboard ranked by a selected metric.

    Joins runs, models, datasets, and results to produce a unified
    leaderboard sorted by the chosen metric.
    """
    query = (
        select(
            BenchmarkModel.name.label("model_name"),
            BenchmarkModel.model_type,
            BenchmarkModel.architecture,
            BenchmarkModel.context_strategy,
            BenchmarkDataset.name.label("dataset_name"),
            BenchmarkDataset.task_type,
            BenchmarkRun.run_id,
            BenchmarkResult.f1_score,
            BenchmarkResult.alarm_accuracy,
            BenchmarkResult.alarm_latency,
            BenchmarkResult.alarm_contiguity,
            BenchmarkResult.atsad_composite_score,
            BenchmarkResult.inference_time_ms,
            BenchmarkResult.tokens_used,
        )
        .join(BenchmarkRun, BenchmarkResult.run_id == BenchmarkRun.run_id)
        .join(BenchmarkModel, BenchmarkRun.model_id == BenchmarkModel.model_id)
        .join(BenchmarkDataset, BenchmarkRun.dataset_id == BenchmarkDataset.dataset_id)
    )

    if task_type:
        query = query.where(BenchmarkDataset.task_type == task_type.upper())
    if dataset_id:
        query = query.where(BenchmarkDataset.dataset_id == dataset_id)
    if model_type:
        query = query.where(BenchmarkModel.model_type == model_type.upper())

    # Dynamic sort
    sort_col = getattr(BenchmarkResult, sort_by, BenchmarkResult.atsad_composite_score)
    query = query.order_by(sort_col.desc().nullslast()).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        LeaderboardEntry(
            model_name=row.model_name,
            model_type=row.model_type,
            architecture=row.architecture,
            context_strategy=row.context_strategy,
            dataset_name=row.dataset_name,
            task_type=row.task_type,
            run_id=row.run_id,
            f1_score=row.f1_score,
            alarm_accuracy=row.alarm_accuracy,
            alarm_latency=row.alarm_latency,
            alarm_contiguity=row.alarm_contiguity,
            atsad_composite_score=row.atsad_composite_score,
            inference_time_ms=row.inference_time_ms,
            tokens_used=row.tokens_used,
        )
        for row in rows
    ]

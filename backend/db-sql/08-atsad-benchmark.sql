-- ============================================================
-- 08 - ATSAD Benchmark Tables
-- Adds tables for the ORBITA-ATSAD anomaly detection benchmark.
-- ============================================================

SET search_path TO ml, public;

-- ── Benchmark Datasets ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml.benchmark_dataset (
    dataset_id       BIGSERIAL PRIMARY KEY,
    name             VARCHAR(200) NOT NULL UNIQUE,
    description      TEXT,
    task_type        VARCHAR(30) NOT NULL CHECK (task_type IN ('UNIVARIATE','MULTIVARIATE')),
    domain           VARCHAR(50) DEFAULT 'SPACECRAFT',
    num_channels     INTEGER DEFAULT 1,
    num_data_points  INTEGER,
    num_anomalies    INTEGER,
    anomaly_ratio    DOUBLE PRECISION,
    sampling_rate_hz DOUBLE PRECISION,
    source           VARCHAR(200),
    file_path        VARCHAR(500),
    metadata         JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Benchmark Models ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml.benchmark_model (
    model_id          BIGSERIAL PRIMARY KEY,
    name              VARCHAR(200) NOT NULL,
    model_type        VARCHAR(50) NOT NULL CHECK (model_type IN ('LLM','STATISTICAL','DEEP_LEARNING','HYBRID')),
    architecture      VARCHAR(100),
    version           VARCHAR(50),
    description       TEXT,
    hyperparameters   JSONB DEFAULT '{}',
    prompt_template   TEXT,
    context_strategy  VARCHAR(30) CHECK (context_strategy IN ('ZERO_SHOT','FEW_SHOT','RAG','FINE_TUNED')),
    is_baseline       BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Benchmark Runs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml.benchmark_run (
    run_id            BIGSERIAL PRIMARY KEY,
    dataset_id        BIGINT NOT NULL REFERENCES ml.benchmark_dataset(dataset_id),
    model_id          BIGINT NOT NULL REFERENCES ml.benchmark_model(model_id),
    run_name          VARCHAR(200),
    status            VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
    started_at        TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    duration_seconds  DOUBLE PRECISION,
    config            JSONB DEFAULT '{}',
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Benchmark Results (Metrics) ─────────────────────────────
CREATE TABLE IF NOT EXISTS ml.benchmark_result (
    result_id              BIGSERIAL PRIMARY KEY,
    run_id                 BIGINT NOT NULL REFERENCES ml.benchmark_run(run_id) ON DELETE CASCADE,
    -- Standard ML Metrics
    precision              DOUBLE PRECISION,
    recall                 DOUBLE PRECISION,
    f1_score               DOUBLE PRECISION,
    accuracy               DOUBLE PRECISION,
    auc_roc                DOUBLE PRECISION,
    auc_pr                 DOUBLE PRECISION,
    -- ATSADBench User-Oriented Metrics
    alarm_accuracy         DOUBLE PRECISION,
    alarm_latency          DOUBLE PRECISION,
    alarm_contiguity       DOUBLE PRECISION,
    atsad_composite_score  DOUBLE PRECISION,
    -- Point-Adjust Metrics
    pa_precision           DOUBLE PRECISION,
    pa_recall              DOUBLE PRECISION,
    pa_f1                  DOUBLE PRECISION,
    -- Operational Metrics
    total_predictions      INTEGER,
    true_positives         INTEGER,
    false_positives        INTEGER,
    false_negatives        INTEGER,
    inference_time_ms      DOUBLE PRECISION,
    tokens_used            INTEGER,
    -- Extra
    channel_metrics        JSONB,
    confusion_matrix       JSONB,
    metadata               JSONB DEFAULT '{}',
    created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── Detection Events ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml.detection_event (
    detection_id     BIGSERIAL PRIMARY KEY,
    run_id           BIGINT NOT NULL REFERENCES ml.benchmark_run(run_id) ON DELETE CASCADE,
    timestamp_index  INTEGER NOT NULL,
    channel          VARCHAR(100),
    predicted_label  INTEGER NOT NULL,
    true_label       INTEGER,
    anomaly_score    DOUBLE PRECISION,
    confidence       DOUBLE PRECISION,
    is_correct       BOOLEAN,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_benchmark_run_dataset ON ml.benchmark_run(dataset_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_run_model   ON ml.benchmark_run(model_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_run_status  ON ml.benchmark_run(status);
CREATE INDEX IF NOT EXISTS idx_benchmark_result_run  ON ml.benchmark_result(run_id);
CREATE INDEX IF NOT EXISTS idx_detection_run_index   ON ml.detection_event(run_id, timestamp_index);
CREATE INDEX IF NOT EXISTS idx_benchmark_result_composite ON ml.benchmark_result(atsad_composite_score DESC NULLS LAST);

-- ── Triggers ────────────────────────────────────────────────
CREATE TRIGGER trg_benchmark_model_updated
    BEFORE UPDATE ON ml.benchmark_model
    FOR EACH ROW EXECUTE FUNCTION catalog.fn_set_updated_at();

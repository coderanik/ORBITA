-- ============================================================
-- 09 - ATSAD Seed Data
-- Sample datasets and models for the ORBITA-ATSAD benchmark.
-- ============================================================

SET search_path TO ml, public;

-- ── ATSADBench Datasets ─────────────────────────────────────

INSERT INTO ml.benchmark_dataset (name, description, task_type, domain, num_channels, num_data_points, num_anomalies, anomaly_ratio, source)
VALUES
    ('ATSAD-SMAP-Uni', 'Soil Moisture Active Passive satellite - univariate telemetry', 'UNIVARIATE', 'SPACECRAFT', 1, 12000, 340, 0.028, 'ATSADBench'),
    ('ATSAD-MSL-Uni', 'Mars Science Laboratory rover - univariate anomaly task', 'UNIVARIATE', 'SPACECRAFT', 1, 8640, 210, 0.024, 'ATSADBench'),
    ('ATSAD-SMAP-Multi', 'SMAP satellite - multivariate telemetry (25 channels)', 'MULTIVARIATE', 'SPACECRAFT', 25, 12000, 340, 0.028, 'ATSADBench'),
    ('ATSAD-MSL-Multi', 'MSL rover - multivariate telemetry (55 channels)', 'MULTIVARIATE', 'SPACECRAFT', 55, 8640, 210, 0.024, 'ATSADBench'),
    ('ATSAD-Power-Uni', 'Spacecraft power subsystem - univariate voltage anomalies', 'UNIVARIATE', 'SPACECRAFT', 1, 6000, 150, 0.025, 'ATSADBench'),
    ('ATSAD-Thermal-Multi', 'Satellite thermal subsystem - multivariate temperature profiles', 'MULTIVARIATE', 'SPACECRAFT', 12, 9600, 280, 0.029, 'ATSADBench'),
    ('ATSAD-ADCS-Multi', 'Attitude Determination & Control - multivariate gyro/magnetometer', 'MULTIVARIATE', 'SPACECRAFT', 9, 7200, 180, 0.025, 'ATSADBench'),
    ('ATSAD-Comm-Uni', 'Communication subsystem - univariate signal strength anomalies', 'UNIVARIATE', 'SPACECRAFT', 1, 5400, 120, 0.022, 'ATSADBench'),
    ('ATSAD-Synthetic-Simple', 'Synthetic benchmark - simple periodic signals with injected faults', 'UNIVARIATE', 'SIMULATED', 1, 10000, 500, 0.050, 'ATSADBench')
ON CONFLICT (name) DO NOTHING;

-- ── Baseline Models ─────────────────────────────────────────

INSERT INTO ml.benchmark_model (name, model_type, architecture, version, description, context_strategy, is_baseline, hyperparameters)
VALUES
    ('GPT-4o Zero-Shot', 'LLM', 'GPT-4o', 'v2024-08', 'OpenAI GPT-4o with zero-shot anomaly detection prompt', 'ZERO_SHOT', TRUE,
     '{"temperature": 0.0, "max_tokens": 512, "window_size": 128}'),
    ('GPT-4o Few-Shot', 'LLM', 'GPT-4o', 'v2024-08', 'GPT-4o with 5-shot examples from training set', 'FEW_SHOT', TRUE,
     '{"temperature": 0.0, "max_tokens": 512, "window_size": 128, "num_shots": 5}'),
    ('GPT-4o RAG', 'LLM', 'GPT-4o', 'v2024-08', 'GPT-4o with Retrieval-Augmented Generation from telemetry docs', 'RAG', FALSE,
     '{"temperature": 0.0, "max_tokens": 1024, "window_size": 128, "retrieval_top_k": 5}'),
    ('LLaMA-3 70B Zero-Shot', 'LLM', 'LLaMA-3-70B', 'v3.0', 'Meta LLaMA-3 70B with zero-shot aerospace anomaly prompt', 'ZERO_SHOT', TRUE,
     '{"temperature": 0.0, "max_tokens": 512, "window_size": 128}'),
    ('Isolation Forest', 'STATISTICAL', 'IsolationForest', 'v1.0', 'Scikit-learn Isolation Forest baseline', NULL, TRUE,
     '{"n_estimators": 200, "contamination": 0.05, "random_state": 42}'),
    ('LSTM Autoencoder', 'DEEP_LEARNING', 'LSTM-AE', 'v1.0', 'LSTM autoencoder with reconstruction-error thresholding', NULL, TRUE,
     '{"hidden_size": 64, "num_layers": 2, "window_size": 100, "threshold_percentile": 95}'),
    ('Transformer AD', 'DEEP_LEARNING', 'TransformerEncoder', 'v1.0', 'Transformer encoder for multivariate anomaly detection', NULL, FALSE,
     '{"d_model": 128, "nhead": 8, "num_layers": 3, "window_size": 128}'),
    ('ORBITA Hybrid v1', 'HYBRID', 'LLM+StatisticalEnsemble', 'v0.1', 'Novel ORBITA method: LLM reasoning + statistical ensemble', 'FEW_SHOT', FALSE,
     '{"llm_model": "GPT-4o", "stat_models": ["IsolationForest", "LOF"], "fusion": "weighted_vote"}')
ON CONFLICT DO NOTHING;

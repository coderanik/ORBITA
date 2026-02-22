"""ORBITA-ATSAD: Anomaly Detection Evaluation Service.

Implements the ATSADBench evaluation framework with user-oriented metrics:
- Alarm Accuracy    : Precision of alarm windows (not individual points)
- Alarm Latency     : How quickly anomalies are detected after onset
- Alarm Contiguity  : Whether detections are fragmented within anomaly segments

Reference: ATSADBench (Aerospace Time Series Anomaly Detection Benchmark)
"""

import numpy as np
from dataclasses import dataclass


@dataclass
class EvaluationResult:
    """Container for all computed metrics."""
    # Standard
    precision: float
    recall: float
    f1_score: float
    accuracy: float
    # ATSADBench
    alarm_accuracy: float
    alarm_latency: float
    alarm_contiguity: float
    atsad_composite_score: float
    # Point-Adjust
    pa_precision: float
    pa_recall: float
    pa_f1: float
    # Counts
    total_predictions: int
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int

    def to_dict(self) -> dict:
        return {
            "precision": self.precision,
            "recall": self.recall,
            "f1_score": self.f1_score,
            "accuracy": self.accuracy,
            "alarm_accuracy": self.alarm_accuracy,
            "alarm_latency": self.alarm_latency,
            "alarm_contiguity": self.alarm_contiguity,
            "atsad_composite_score": self.atsad_composite_score,
            "pa_precision": self.pa_precision,
            "pa_recall": self.pa_recall,
            "pa_f1": self.pa_f1,
            "total_predictions": self.total_predictions,
            "true_positives": self.true_positives,
            "false_positives": self.false_positives,
            "false_negatives": self.false_negatives,
            "true_negatives": self.true_negatives,
        }


def _find_segments(labels: np.ndarray) -> list[tuple[int, int]]:
    """Find contiguous segments of 1s in a binary array.

    Returns list of (start_idx, end_idx) inclusive tuples.
    """
    segments = []
    in_segment = False
    start = 0

    for i, val in enumerate(labels):
        if val == 1 and not in_segment:
            start = i
            in_segment = True
        elif val == 0 and in_segment:
            segments.append((start, i - 1))
            in_segment = False

    if in_segment:
        segments.append((start, len(labels) - 1))

    return segments


def compute_standard_metrics(
    y_true: np.ndarray, y_pred: np.ndarray
) -> tuple[float, float, float, float, int, int, int, int]:
    """Compute point-wise precision, recall, F1, accuracy."""
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (tp + tn) / len(y_true) if len(y_true) > 0 else 0.0

    return precision, recall, f1, accuracy, tp, fp, fn, tn


def compute_alarm_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute Alarm Accuracy (ATSADBench metric).

    Measures the fraction of predicted alarm windows that overlap
    with actual anomaly segments. A predicted alarm is "accurate"
    if any of its predicted-1 points fall within a true anomaly segment.
    """
    pred_segments = _find_segments(y_pred)
    true_segments = _find_segments(y_true)

    if not pred_segments:
        return 0.0

    accurate_alarms = 0
    for ps_start, ps_end in pred_segments:
        for ts_start, ts_end in true_segments:
            # Check overlap
            if ps_start <= ts_end and ps_end >= ts_start:
                accurate_alarms += 1
                break

    return accurate_alarms / len(pred_segments)


def compute_alarm_latency(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute Alarm Latency (ATSADBench metric).

    Measures the average delay (in time steps) between the start of
    a true anomaly segment and the first detection within that segment.
    Lower is better. Returns 0 if all anomalies are detected at onset.
    """
    true_segments = _find_segments(y_true)

    if not true_segments:
        return 0.0

    latencies = []
    for ts_start, ts_end in true_segments:
        # Find first prediction=1 within this segment
        segment_preds = y_pred[ts_start:ts_end + 1]
        detected_indices = np.where(segment_preds == 1)[0]

        if len(detected_indices) > 0:
            latencies.append(float(detected_indices[0]))
        else:
            # Anomaly was missed entirely; penalise with segment length
            latencies.append(float(ts_end - ts_start + 1))

    return float(np.mean(latencies))


def compute_alarm_contiguity(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute Alarm Contiguity (ATSADBench metric).

    Measures how continuous the detections are within each true anomaly
    segment. A score of 1.0 means no fragmentation; lower values indicate
    that detections are broken into multiple sub-segments within the anomaly.
    """
    true_segments = _find_segments(y_true)

    if not true_segments:
        return 1.0

    contiguities = []
    for ts_start, ts_end in true_segments:
        segment_preds = y_pred[ts_start:ts_end + 1]
        segment_len = ts_end - ts_start + 1

        if np.sum(segment_preds) == 0:
            contiguities.append(0.0)
            continue

        # Count the number of contiguous runs of 1s within the segment
        pred_sub_segments = _find_segments(segment_preds)
        num_fragments = len(pred_sub_segments)

        # Ideal = 1 contiguous block, penalise fragmentation
        contiguity = 1.0 / num_fragments if num_fragments > 0 else 0.0
        contiguities.append(contiguity)

    return float(np.mean(contiguities))


def compute_point_adjust_f1(y_true: np.ndarray, y_pred: np.ndarray) -> tuple[float, float, float]:
    """Compute Point-Adjust F1 score.

    If *any* point in a true anomaly segment is predicted as anomaly,
    all points in that segment are considered detected (point-adjusted).
    This is a common (but critiqued) metric in time-series AD.
    """
    y_adjusted = y_pred.copy()
    true_segments = _find_segments(y_true)

    for ts_start, ts_end in true_segments:
        if np.any(y_pred[ts_start:ts_end + 1] == 1):
            y_adjusted[ts_start:ts_end + 1] = 1

    pa_precision, pa_recall, pa_f1, _, _, _, _, _ = compute_standard_metrics(y_true, y_adjusted)
    return pa_precision, pa_recall, pa_f1


def evaluate(
    y_true: list[int] | np.ndarray,
    y_pred: list[int] | np.ndarray,
    composite_weights: dict[str, float] | None = None,
) -> EvaluationResult:
    """Run the full ATSADBench evaluation pipeline.

    Args:
        y_true: Ground-truth binary labels (0=normal, 1=anomaly).
        y_pred: Predicted binary labels (0=normal, 1=anomaly).
        composite_weights: Optional weights for the composite score.
            Keys: 'alarm_accuracy', 'alarm_latency', 'alarm_contiguity', 'f1_score'.

    Returns:
        EvaluationResult with all metrics populated.
    """
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)

    assert len(y_true) == len(y_pred), "y_true and y_pred must have the same length"

    # Standard metrics
    precision, recall, f1, accuracy, tp, fp, fn, tn = compute_standard_metrics(y_true, y_pred)

    # ATSADBench metrics
    alarm_acc = compute_alarm_accuracy(y_true, y_pred)
    alarm_lat = compute_alarm_latency(y_true, y_pred)
    alarm_cont = compute_alarm_contiguity(y_true, y_pred)

    # Point-Adjust metrics
    pa_prec, pa_rec, pa_f1 = compute_point_adjust_f1(y_true, y_pred)

    # Composite score
    if composite_weights is None:
        composite_weights = {
            "alarm_accuracy": 0.3,
            "alarm_contiguity": 0.2,
            "f1_score": 0.3,
            "alarm_latency": 0.2,
        }

    # Normalise latency (lower is better) to 0..1 range
    max_possible_latency = len(y_true)
    normalised_latency = 1.0 - (alarm_lat / max_possible_latency) if max_possible_latency > 0 else 1.0

    composite = (
        composite_weights.get("alarm_accuracy", 0.3) * alarm_acc
        + composite_weights.get("alarm_contiguity", 0.2) * alarm_cont
        + composite_weights.get("f1_score", 0.3) * f1
        + composite_weights.get("alarm_latency", 0.2) * normalised_latency
    )

    return EvaluationResult(
        precision=round(precision, 6),
        recall=round(recall, 6),
        f1_score=round(f1, 6),
        accuracy=round(accuracy, 6),
        alarm_accuracy=round(alarm_acc, 6),
        alarm_latency=round(alarm_lat, 6),
        alarm_contiguity=round(alarm_cont, 6),
        atsad_composite_score=round(composite, 6),
        pa_precision=round(pa_prec, 6),
        pa_recall=round(pa_rec, 6),
        pa_f1=round(pa_f1, 6),
        total_predictions=int(len(y_pred)),
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        true_negatives=tn,
    )

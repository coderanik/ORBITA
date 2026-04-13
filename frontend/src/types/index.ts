export interface AnomalyAlert {
  alert_id: number;
  object_id: number;
  subsystem: string;
  anomaly_type: string;
  severity: string;
  is_acknowledged: boolean;
  detected_at: string;
  confidence_score?: number;
  description?: string;
}

export interface PlatformStats {
  total_tracked_objects: number;
  objects_by_type: Record<string, number>;
  objects_by_status: Record<string, number>;
  objects_by_orbit_class: Record<string, number>;
  active_high_risk_alerts: number;
  active_models?: number;
  total_anomaly_alerts?: number;
}

export interface ConjunctionAlert {
  conjunction_id: number;
  primary_name: string;
  secondary_name: string;
  time_of_closest_approach: string;
  miss_distance_km: number;
  collision_probability: number;
  risk_level: string;
  status: string;
}

export interface TelemetryReading {
  telemetry_id: number;
  object_id: number;
  ts: string;
  subsystem: string;
  parameter_name: string;
  value: number;
  unit: string;
  quality: string;
}

export interface LeaderboardEntry {
  model_name: string;
  model_type: string;
  architecture?: string;
  context_strategy?: string;
  dataset_name: string;
  task_type: string;
  run_id: number;
  f1_score?: number;
  alarm_accuracy?: number;
  alarm_latency?: number;
  alarm_contiguity?: number;
  atsad_composite_score?: number;
  inference_time_ms?: number;
  tokens_used?: number;
}

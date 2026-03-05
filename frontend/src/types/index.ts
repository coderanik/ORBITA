export interface AnomalyAlert {
  alert_id: number;
  object_id: number;
  subsystem: string;
  anomaly_type: string;
  severity: string;
  is_acknowledged: boolean;
  detected_at: string;
}

export interface PlatformStats {
  total_tracked_objects: number;
  objects_by_type: Record<string, number>;
  objects_by_status: Record<string, number>;
  objects_by_orbit_class: Record<string, number>;
  active_high_risk_alerts: number;
}

import type { AnomalyAlert, PlatformStats, ConjunctionAlert, LeaderboardEntry } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('orbita_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function fetchUnacknowledgedAlerts(): Promise<AnomalyAlert[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/anomaly-alerts/unacknowledged`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Network error fetching alerts');
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Failed to fetch anomaly alerts:", err);
    return [];
  }
}

export async function acknowledgeAlert(alertId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/anomaly-alerts/${alertId}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_acknowledged: true }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to acknowledge alert:", err);
    return false;
  }
}

export async function downloadMissionReport(objectId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/anomaly-alerts/reports/mission/${objectId}`, { headers: getAuthHeaders() })
    if (!res.ok) return false
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mission_report_${objectId}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error("Failed to download mission report:", err)
    return false
  }
}

export interface ScheduledManeuver {
  maneuver_id: number
  object_id: number
  conjunction_id: number | null
  planned_time: string
  delta_v_m_s: number | null
  direction: Record<string, unknown> | null
  status: string
  notes: string | null
  created_at: string
}

export async function scheduleManeuver(
  objectId: number,
  options?: {
    conjunctionId?: number
    alertId?: number
    anomalyType?: string
    severity?: string
    subsystem?: string
    requestedBy?: string
  }
): Promise<{ ok: boolean; item?: ScheduledManeuver }> {
  try {
    const planned = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    const noteParts = [
      'Scheduled from operator quick actions.',
      options?.alertId ? `alert_id=${options.alertId}` : null,
      options?.anomalyType ? `anomaly=${options.anomalyType}` : null,
      options?.severity ? `severity=${options.severity}` : null,
      options?.subsystem ? `subsystem=${options.subsystem}` : null,
      options?.requestedBy ? `requested_by=${options.requestedBy}` : null,
    ].filter(Boolean)
    const res = await fetch(`${API_BASE_URL}/maneuvers/`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object_id: objectId,
        conjunction_id: options?.conjunctionId ?? null,
        planned_time: planned,
        delta_v_m_s: 0.35,
        direction: {
          frame: 'RTN',
          radial: 0.0,
          transverse: 1.0,
          normal: 0.1,
          burn_duration_s: 120,
          strategy: 'collision-avoidance-preplan',
        },
        status: 'PLANNED',
        notes: noteParts.join(' | '),
      }),
    })
    if (!res.ok) return { ok: false }
    const item = await res.json()
    return { ok: true, item }
  } catch (err) {
    console.error("Failed to schedule maneuver:", err)
    return { ok: false }
  }
}

export async function flagAlertForReview(alertId: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/anomaly-alerts/${alertId}`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_acknowledged: false,
        resolution_notes: 'Flagged for review by operator.',
      }),
    })
    return res.ok
  } catch (err) {
    console.error("Failed to flag alert for review:", err)
    return false
  }
}

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/stats/overview`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Network error fetching stats');
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch platform stats:", err);
    return null;
  }
}

export async function fetchConjunctionAlerts(): Promise<ConjunctionAlert[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/conjunctions/alerts`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch conjunction alerts:", err);
    return [];
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/atsad/leaderboard?limit=50`, { headers: getAuthHeaders() });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return [];
  }
}

export interface EvaluatePayload {
  run_id: number
  y_true: number[]
  y_pred: number[]
  save_detections?: boolean
}

export async function evaluateAtsadRun(payload: EvaluatePayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/atsad/evaluate`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const detail = data?.detail
      const errMsg = typeof detail === 'string' ? detail : (detail && JSON.stringify(detail)) || 'Evaluation failed'
      return { ok: false, error: errMsg }
    }
    return { ok: true }
  } catch (err) {
    console.error("Failed to evaluate ATSAD run:", err)
    return { ok: false, error: 'Failed to connect to benchmark API' }
  }
}

export interface AtsadRunListItem {
  run_id: number
  dataset_id: number
  model_id: number
  run_name: string | null
  status: string
  created_at: string
}

export async function fetchAtsadRunsList(limit = 100): Promise<AtsadRunListItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/atsad/runs?limit=${limit}`, { headers: getAuthHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch (err) {
    console.error('Failed to fetch ATSAD runs:', err)
    return []
  }
}

export async function fetchAtsadStats(): Promise<{ modelTotal: number; runTotal: number }> {
  try {
    const [mRes, rRes] = await Promise.all([
      fetch(`${API_BASE_URL}/atsad/models?limit=1&offset=0`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE_URL}/atsad/runs?limit=1&offset=0`, { headers: getAuthHeaders() }),
    ])
    const models = mRes.ok ? await mRes.json() : { total: 0 }
    const runs = rRes.ok ? await rRes.json() : { total: 0 }
    return { modelTotal: models.total ?? 0, runTotal: runs.total ?? 0 }
  } catch {
    return { modelTotal: 0, runTotal: 0 }
  }
}

async function postJson<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = (data as { detail?: unknown })?.detail
      const errMsg: string =
        typeof detail === 'string'
          ? detail
          : detail != null
            ? JSON.stringify(detail)
            : `HTTP ${res.status}`
      return { ok: false, error: errMsg }
    }
    return { ok: true, data: data as T }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' }
  }
}

/** Creates dataset + model + run, then runs evaluate so the leaderboard populates without manual run_id. */
export async function seedAndEvaluateAtsadDemo(
  yTrue: number[],
  yPred: number[]
): Promise<{ ok: boolean; runId?: number; error?: string }> {
  const tag = Date.now()
  const ds = await postJson<{ dataset_id: number }>('/atsad/datasets', {
    name: `ORBITA Demo ${tag}`,
    description: 'Auto-created from Benchmark page demo',
    task_type: 'UNIVARIATE',
    domain: 'SPACECRAFT',
    num_channels: 1,
    num_data_points: yTrue.length,
    source: 'benchmark-ui',
  })
  if (!ds.ok) return { ok: false, error: ds.error }

  const mdl = await postJson<{ model_id: number }>('/atsad/models', {
    name: `Z-Score Baseline ${tag}`,
    model_type: 'STATISTICAL',
    architecture: 'z-score',
    version: '1.0.0',
    description: 'Demo model for leaderboard seed',
    is_baseline: true,
    context_strategy: 'ZERO_SHOT',
  })
  if (!mdl.ok) return { ok: false, error: mdl.error }

  const run = await postJson<{ run_id: number }>('/atsad/runs', {
    dataset_id: ds.data.dataset_id,
    model_id: mdl.data.model_id,
    run_name: `demo-run-${tag}`,
    notes: 'Seeded from Benchmark quick demo',
  })
  if (!run.ok) return { ok: false, error: run.error }

  const ev = await evaluateAtsadRun({
    run_id: run.data.run_id,
    y_true: yTrue,
    y_pred: yPred,
    save_detections: true,
  })
  if (!ev.ok) return { ok: false, runId: run.data.run_id, error: ev.error }
  return { ok: true, runId: run.data.run_id }
}

export function getGraphUrl(type: string): string {
  return `${API_BASE_URL}/graphs/${type}`;
}

export async function fetchRealPositions(): Promise<Record<string, {name: string, lat: number, lon: number, alt: number}>> {
  try {
    const res = await fetch(`${API_BASE_URL}/real-positions`, { headers: getAuthHeaders() });
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch real positions:", err);
    return {};
  }
}

export interface TelemetryPoint {
  telemetry_id: number
  object_id: number
  subsystem: string
  parameter_name: string
  value: number
  unit: string | null
  quality: string | null
  ts: string
}

export async function fetchTelemetryForObject(objectId: number, limit = 20): Promise<TelemetryPoint[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/telemetry/${objectId}?limit=${limit}`, { headers: getAuthHeaders() })
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error("Failed to fetch telemetry:", err)
    return []
  }
}

export interface SystemOpsStatus {
  generated_at: string
  api: { ok: boolean }
  celery: {
    ok: boolean
    online_workers: string[]
    worker_count: number
    error?: string
  }
  redis: {
    ok: boolean
    db_size: number | null
    used_memory_human: string | null
    error?: string
  }
  rabbitmq: {
    ok: boolean
    queue_count: number
    messages_ready_total: number | null
    messages_unacked_total: number | null
    error?: string
  }
}

export async function fetchSystemOpsStatus(): Promise<SystemOpsStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/system-ops/status`, { headers: getAuthHeaders() })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    console.error("Failed to fetch system ops status:", err)
    return null
  }
}

export interface UserLoginActivity {
  user_id: number
  username: string
  email_masked: string | null
  role: string
  is_active: boolean
  latest_logged_in_at: string | null
  timezone_name: string | null
  timezone_offset_minutes: number | null
  ip_fingerprint: string | null
}

export async function fetchUsersActivity(): Promise<UserLoginActivity[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/system-ops/users-activity`, { headers: getAuthHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch (err) {
    console.error("Failed to fetch users activity:", err)
    return []
  }
}

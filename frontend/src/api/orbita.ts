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

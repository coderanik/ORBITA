import type { AnomalyAlert, PlatformStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export async function fetchUnacknowledgedAlerts(): Promise<AnomalyAlert[]> {
  try {
    const token = localStorage.getItem('orbita_token');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const res = await fetch(`${API_BASE_URL}/anomaly-alerts/unacknowledged`, { headers });
    if (!res.ok) throw new Error('Network error fetching alerts');
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Failed to fetch anomaly alerts:", err);
    return [];
  }
}

export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  try {
    const token = localStorage.getItem('orbita_token');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
    
    const res = await fetch(`${API_BASE_URL}/stats/overview`, { headers });
    if (!res.ok) throw new Error('Network error fetching stats');
    return await res.json();
  } catch (err) {
    console.error("Failed to fetch platform stats:", err);
    return null;
  }
}

export function getGraphUrl(type: string): string {
  return `${API_BASE_URL}/graphs/${type}`;
}

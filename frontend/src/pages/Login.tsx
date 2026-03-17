import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Orbit, LogIn, Lock, User as UserIcon, Activity } from 'lucide-react';
import { API_BASE_URL } from '../api/orbita';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = new URLSearchParams();
      data.append('username', username);
      data.append('password', password);

      const res = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data,
      });

      if (!res.ok) {
        throw new Error('Invalid credentials. Please check your username and password.');
      }

      const rawJSON = await res.json();
      const token = rawJSON.access_token;

      const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const userData = await userRes.json();
      login(token, userData);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04060b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.15),transparent)]" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl" />

      {/* Branding top-left */}
      <div className="absolute top-6 left-8 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.5)]">
          <Activity className="w-[18px] h-[18px] text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-widest text-white">ORBITA<span className="text-blue-400 font-light">ATSAD</span></p>
          <p className="text-[9px] text-slate-500 tracking-[0.2em] uppercase">Space Situational Awareness</p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-[#0b1221]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden">

          {/* Top accent bar */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

          {/* Header */}
          <div className="p-8 pb-6 text-center">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/25 to-cyan-500/15 flex items-center justify-center border border-white/10 shadow-[0_0_25px_rgba(59,130,246,0.25)] backdrop-blur-md">
                  <Orbit className="w-8 h-8 text-blue-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl border border-blue-500/20 scale-110 animate-ping opacity-20" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">ORBITA</h1>
            <p className="text-slate-400 text-sm mt-1.5 font-medium">Aerospace Telemetry Security Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all placeholder:text-slate-600 text-sm"
                  placeholder="Officer username"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all placeholder:text-slate-600 tracking-wider text-sm"
                  placeholder="Clearance code"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.35)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.5)] transform transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 group disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
              ) : (
                <>
                  Authenticate
                  <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="px-8 pb-6 text-center">
            <p className="text-[11px] text-slate-600 flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" />
              JWT-secured · E2E encrypted ATSAD session
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="text-center text-[10px] text-slate-600 mt-4 tracking-wide">ORBITA-ATSAD v2.0 · Space Situational Awareness Platform</p>
      </div>
    </div>
  );
}

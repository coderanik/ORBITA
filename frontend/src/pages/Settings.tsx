import { useState } from 'react'
import Header from '../components/Header'
import { useAuth } from '../contexts/useAuth'
import { Key, Bell, Globe, User, Shield, Moon, Sun, Monitor, BellRing, BellOff } from 'lucide-react'

type SettingsSection = 'account' | 'preferences' | 'api-keys' | 'notifications'
type TimeFormat = 'utc' | 'local'

const PREFERENCES_STORAGE_KEY = 'orbita-user-preferences'

type StoredPreferences = {
  theme: string
  mapDefault: string
  timeFormat: TimeFormat
  soundEnabled: boolean
  emailAlerts: boolean
}

function readStoredPreferences(): StoredPreferences {
  const defaults: StoredPreferences = {
    theme: 'system',
    mapDefault: '3d',
    timeFormat: 'utc',
    soundEnabled: true,
    emailAlerts: true,
  }

  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw) as Partial<StoredPreferences>
    return {
      theme: saved.theme ?? defaults.theme,
      mapDefault: saved.mapDefault ?? defaults.mapDefault,
      timeFormat: saved.timeFormat === 'local' ? 'local' : defaults.timeFormat,
      soundEnabled: typeof saved.soundEnabled === 'boolean' ? saved.soundEnabled : defaults.soundEnabled,
      emailAlerts: typeof saved.emailAlerts === 'boolean' ? saved.emailAlerts : defaults.emailAlerts,
    }
  } catch {
    return defaults
  }
}

export default function Settings() {
  const { user } = useAuth()
  const isViewer = (user?.role ?? 'viewer') === 'viewer'
  const [storedPreferences] = useState<StoredPreferences>(() => readStoredPreferences())
  
  // Mock states for settings
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [theme, setTheme] = useState(storedPreferences.theme)
  const [mapDefault, setMapDefault] = useState(storedPreferences.mapDefault)
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(storedPreferences.timeFormat)
  const [soundEnabled, setSoundEnabled] = useState(storedPreferences.soundEnabled)
  const [emailAlerts, setEmailAlerts] = useState(storedPreferences.emailAlerts)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  
  // Mock API Keys
  const [apiKeys] = useState<{ id: number, name: string, created: string, lastUsed: string }[]>([
    { id: 1, name: 'Python Analytics Script', created: '2025-10-12', lastUsed: '2026-04-25' }
  ])

  const handleSavePreferences = () => {
    const prefs = {
      theme,
      mapDefault,
      timeFormat,
      soundEnabled,
      emailAlerts
    }
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new CustomEvent('orbita:preferences-updated', { detail: prefs }))
    setSaveMessage('Preferences saved.')
  }

  return (
    <div className="min-h-screen w-full bg-[#04060b] text-slate-200 pt-[4.5rem] overflow-y-auto">
      <Header />
      
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account, preferences, and external access keys.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar Nav */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveSection('account')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium border flex items-center gap-3 transition-colors ${
                activeSection === 'account'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <User className="w-4 h-4" /> Account Info
            </button>
            <button
              onClick={() => setActiveSection('preferences')}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium border flex items-center gap-3 transition-colors ${
                activeSection === 'preferences'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
              }`}
            >
              <Globe className="w-4 h-4" /> Preferences
            </button>
            {!isViewer && (
              <button
                onClick={() => setActiveSection('api-keys')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium border flex items-center gap-3 transition-colors ${
                  activeSection === 'api-keys'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Key className="w-4 h-4" /> API Keys
              </button>
            )}
            {!isViewer && (
              <button
                onClick={() => setActiveSection('notifications')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium border flex items-center gap-3 transition-colors ${
                  activeSection === 'notifications'
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Bell className="w-4 h-4" /> Notifications
              </button>
            )}
          </div>

          {/* Settings Content */}
          <div className="space-y-8">
            
            {/* Account Info Section */}
            {activeSection === 'account' && (
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Shield className="w-32 h-32 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" /> Account Identity
              </h2>
              <div className="space-y-4 max-w-md relative z-10">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-widest mb-1.5">Username</label>
                  <input type="text" disabled value={user?.username || ''} className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-slate-300 opacity-75 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-widest mb-1.5">Assigned Role</label>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm font-bold uppercase tracking-wider">
                    {user?.role || 'Viewer'}
                  </div>
                </div>
                <div className="pt-2">
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors">
                    Change Password
                  </button>
                </div>
              </div>
            </section>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" /> Display & UI Preferences
              </h2>
              
              <div className="space-y-6 max-w-2xl">
                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Color Theme</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'dark', icon: Moon, label: 'Dark' },
                      { id: 'light', icon: Sun, label: 'Light (Unsupported)' },
                      { id: 'system', icon: Monitor, label: 'System' }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        disabled={t.id === 'light'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                          theme === t.id 
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' 
                            : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:text-slate-300'
                        } ${t.id === 'light' ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <t.icon className="w-4 h-4" /> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Map Default */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Default Dashboard View</label>
                  <div className="flex gap-3">
                    <button onClick={() => setMapDefault('3d')} className={`px-4 py-2 rounded-lg border text-sm transition-all ${mapDefault === '3d' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-black/20 border-white/10 text-slate-400'}`}>3D Globe (Cesium)</button>
                    <button onClick={() => setMapDefault('2d')} className={`px-4 py-2 rounded-lg border text-sm transition-all ${mapDefault === '2d' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-black/20 border-white/10 text-slate-400'}`}>2D Map (Flat)</button>
                  </div>
                </div>

                {/* Time Format */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Time Format standard</label>
                  <div className="flex gap-3">
                    <button onClick={() => setTimeFormat('utc')} className={`px-4 py-2 rounded-lg border text-sm transition-all ${timeFormat === 'utc' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-black/20 border-white/10 text-slate-400'}`}>UTC (ZULU)</button>
                    <button onClick={() => setTimeFormat('local')} className={`px-4 py-2 rounded-lg border text-sm transition-all ${timeFormat === 'local' ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-black/20 border-white/10 text-slate-400'}`}>Local Timezone</button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleSavePreferences}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Save Preferences
                  </button>
                  {saveMessage && <span className="text-xs text-emerald-300">{saveMessage}</span>}
                </div>
              </div>
            </section>
            )}

            {/* API Keys Section */}
            {!isViewer && activeSection === 'api-keys' && (
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-400" /> Personal API Keys
                </h2>
                <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                  + Generate New Key
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-6">Use these keys to authenticate external scripts to the ORBITA REST API.</p>
              
              <div className="space-y-3">
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-200">{key.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Created: {key.created} &bull; Last used: {key.lastUsed}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">orb_live_******************</span>
                      <button className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors border border-transparent hover:border-red-500/30">
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* Notifications Section */}
            {!isViewer && activeSection === 'notifications' && (
            <section className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-400" /> Alert Notifications
              </h2>
              
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-200">Critical Anomaly Emails</div>
                    <div className="text-xs text-slate-500 mt-0.5">Receive immediate emails for RED and CRITICAL severity events.</div>
                  </div>
                  <button 
                    onClick={() => setEmailAlerts(!emailAlerts)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${emailAlerts ? 'bg-blue-500' : 'bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${emailAlerts ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-200">UI Sound Effects</div>
                    <div className="text-xs text-slate-500 mt-0.5">Play radar ping sounds for incoming alerts.</div>
                  </div>
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all flex items-center gap-2 ${soundEnabled ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-black/40 border-white/10 text-slate-500'}`}
                  >
                    {soundEnabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    {soundEnabled ? 'Enabled' : 'Muted'}
                  </button>
                </div>
              </div>
            </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage('Settings saved');
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <nav className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Streamer Admin
          </h1>
          <div className="flex gap-4 items-center">
            <Link href="/dashboard" className="text-slate-300 hover:text-white transition">
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('Failed') ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
            {message}
          </div>
        )}

        <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ingest Key</h2>
          <p className="text-sm text-slate-400 mb-3">
            Stream key required for incoming RTMP connections
          </p>
          <input
            type="text"
            value={settings.ingest_key || ''}
            onChange={(e) => setSettings({ ...settings, ingest_key: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </section>

        <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Nginx Template</h2>
          <p className="text-sm text-slate-400 mb-3">
            Use <code className="bg-slate-700 px-1 rounded">{'{{PUSH_DESTINATIONS}}'}</code> placeholder for auto-generated push directives
          </p>
          <textarea
            value={settings.nginx_template || ''}
            onChange={(e) => setSettings({ ...settings, nginx_template: e.target.value })}
            rows={20}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </section>

        <div className="flex gap-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <Link
            href="/dashboard"
            className="py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

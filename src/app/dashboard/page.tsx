'use client';

import { useState, useEffect } from 'react';
import { Shell } from '@/components/Shell';

interface Stream {
  id: number;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: number | null;
}

export default function DashboardPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [stats, setStats] = useState<string | null>(null);
  const [config, setConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [newStream, setNewStream] = useState({
    name: '',
    rtmpUrl: '',
    streamKey: '',
  });

  // Edit state
  const [editingStreamId, setEditingStreamId] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingName, setEditingName] = useState('');
  const [editingUrl, setEditingUrl] = useState('');

  useEffect(() => {
    fetchStreams();
    fetchStats();
    fetchConfig();
  }, []);

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/streams');
      const data = await res.json();
      setStreams(data);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/nginx/stats');
      if (res.ok) {
        const xml = await res.text();
        setStats(xml);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/nginx/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const addStream = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStream),
      });
      if (res.ok) {
        setNewStream({ name: '', rtmpUrl: '', streamKey: '' });
        fetchStreams();
        setMessage('Stream added');
      }
    } catch (error) {
      setMessage('Failed to add stream');
    }
  };

  const deleteStream = async (id: number) => {
    try {
      await fetch(`/api/streams/${id}`, { method: 'DELETE' });
      fetchStreams();
      setMessage('Stream deleted');
    } catch (error) {
      setMessage('Failed to delete stream');
    }
  };

  const toggleStream = async (id: number, currentEnabled: number | null) => {
    // Optimistic update
    const newEnabled = currentEnabled ? 0 : 1;
    setStreams(streams.map(s => s.id === id ? { ...s, enabled: newEnabled } : s));

    try {
      const stream = streams.find(s => s.id === id);
      if (!stream) return;

      const res = await fetch(`/api/streams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stream, enabled: newEnabled }),
      });

      if (!res.ok) {
        // Revert on failure
        setStreams(streams.map(s => s.id === id ? { ...s, enabled: currentEnabled } : s));
        setMessage('Failed to update stream status');
      }
    } catch (error) {
       // Revert on failure
       setStreams(streams.map(s => s.id === id ? { ...s, enabled: currentEnabled } : s));
       setMessage('Failed to update stream status');
    }
  };

  const applyConfig = async () => {
    setApplying(true);
    setMessage('');
    try {
      const res = await fetch('/api/nginx/apply', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Config applied and nginx reloaded');
        fetchStats();
        fetchConfig();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Failed to apply config');
    } finally {
      setApplying(false);
    }
  };

  const startEditing = (stream: Stream) => {
    setEditingStreamId(stream.id);
    setEditingKey('');
    setEditingName(stream.name);
    setEditingUrl(stream.rtmpUrl);
  };

  const cancelEditing = () => {
    setEditingStreamId(null);
    setEditingKey('');
    setEditingName('');
    setEditingUrl('');
  };

  const saveStream = async (id: number) => {
    try {
      const stream = streams.find(s => s.id === id);
      if (!stream) return;

      const updatedStream = {
        ...stream,
        name: editingName,
        rtmpUrl: editingUrl,
        streamKey: editingKey || stream.streamKey // Keep old key if empty
      };

      const res = await fetch(`/api/streams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStream),
      });

      if (res.ok) {
        setStreams(streams.map(s => s.id === id ? updatedStream : s));
        setMessage('Stream updated');
        cancelEditing();
      } else {
        setMessage('Failed to update stream');
      }
    } catch (error) {
      setMessage('Failed to update stream');
    }
  };

  const [showConfig, setShowConfig] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <Shell>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-500/20 border border-red-500/50' : 'bg-green-500/20 border border-green-500/50'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Stream Form */}
          <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Add Stream Destination</h2>
            <form onSubmit={addStream} className="space-y-4">
              <input
                type="text"
                placeholder="Name (e.g. Twitch)"
                value={newStream.name}
                onChange={(e) => setNewStream({ ...newStream, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <input
                type="text"
                placeholder="RTMP URL (e.g. rtmp://live.twitch.tv/app)"
                value={newStream.rtmpUrl}
                onChange={(e) => setNewStream({ ...newStream, rtmpUrl: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <input
                type="password"
                placeholder="Stream Key"
                value={newStream.streamKey}
                onChange={(e) => setNewStream({ ...newStream, streamKey: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <button
                type="submit"
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
              >
                Add Stream
              </button>
            </form>
          </section>

          {/* Stream List */}
          <section className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Stream Destinations</h2>
              <button
                onClick={applyConfig}
                disabled={applying}
                className="py-2 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg shadow-lg shadow-green-500/25 transition disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply & Reload'}
              </button>
            </div>

            {loading ? (
              <p className="text-slate-400">Loading...</p>
            ) : streams.length === 0 ? (
              <p className="text-slate-400">No streams configured</p>
            ) : (
              <ul className="space-y-3">
                {streams.map((stream) => (
                  <li
                    key={stream.id}
                    className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-center gap-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!stream.enabled}
                          onChange={() => toggleStream(stream.id, stream.enabled)}
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                      <div>
                        {editingStreamId === stream.id ? (
                          <div className="space-y-2 mb-2">
                             <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                                placeholder="Stream Name"
                              />
                              <input
                                type="text"
                                value={editingUrl}
                                onChange={(e) => setEditingUrl(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                                placeholder="RTMP URL"
                              />
                          </div>
                        ) : (
                          <>
                            <p className={`font-medium ${!stream.enabled ? 'text-slate-500 line-through' : ''}`}>{stream.name}</p>
                            <p className="text-sm text-slate-400 truncate max-w-xs mb-1">
                              {stream.rtmpUrl}
                            </p>
                          </>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {editingStreamId === stream.id ? (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                              <input
                                type="text"
                                value={editingKey}
                                placeholder="New stream key (optional)"
                                onChange={(e) => setEditingKey(e.target.value)}
                                className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 w-48"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group">
                              <span className="text-xs text-slate-500 font-mono">
                                ••••••••
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingStreamId === stream.id ? (
                        <>
                           <button
                              onClick={() => saveStream(stream.id)}
                              className="p-1 text-green-400 hover:text-green-300 transition"
                              title="Save"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="p-1 text-red-400 hover:text-red-300 transition"
                              title="Cancel"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                        </>
                      ) : (
                        <>
                           <button
                              onClick={() => startEditing(stream)}
                              className="p-1 text-slate-400 hover:text-purple-400 transition"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteStream(stream.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Current Config */}
        <section className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
          <div 
            className="flex justify-between items-center mb-4 cursor-pointer select-none" 
            onClick={() => setShowConfig(!showConfig)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Current Nginx Config</h2>
              <svg 
                className={`w-5 h-5 transition-transform ${showConfig ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {showConfig && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchConfig();
                }}
                className="text-purple-400 hover:text-purple-300 transition"
              >
                Refresh
              </button>
            )}
          </div>
          {showConfig && (
            config ? (
              <pre className="text-xs text-slate-300 bg-slate-900/50 p-4 rounded-lg overflow-x-auto max-h-96 animate-in fade-in duration-300">
                {config}
              </pre>
            ) : (
              <p className="text-slate-400">Config not available</p>
            )
          )}
        </section>

        {/* Stats */}
        <section className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 p-6">
          <div 
            className="flex justify-between items-center mb-4 cursor-pointer select-none" 
            onClick={() => setShowStats(!showStats)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Nginx Stats</h2>
              <svg 
                className={`w-5 h-5 transition-transform ${showStats ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {showStats && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchStats();
                }}
                className="text-purple-400 hover:text-purple-300 transition"
              >
                Refresh
              </button>
            )}
          </div>
          {showStats && (
            stats ? (
              <pre className="text-xs text-slate-300 bg-slate-900/50 p-4 rounded-lg overflow-x-auto max-h-64 animate-in fade-in duration-300">
                {stats}
              </pre>
            ) : (
              <p className="text-slate-400">Nginx not running or stats unavailable</p>
            )
          )}
        </section>
      </main>
    </Shell>
  );
}

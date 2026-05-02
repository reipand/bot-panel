import { useState } from 'react';
import { Rocket, CheckCircle, XCircle, Loader } from 'lucide-react';
import { deploy as deployApi } from '../api/client.js';

const DISCORD_ID = import.meta.env.VITE_DISCORD_ID || '';

const SERVER_TYPES = [
  { value: 'minecraft', label: 'Minecraft',  emoji: '⛏️', desc: 'Paper / Vanilla' },
  { value: 'rust',      label: 'Rust',       emoji: '🔧', desc: 'Dedicated Server' },
  { value: 'terraria',  label: 'Terraria',   emoji: '🌿', desc: 'Dedicated Server' },
];

export default function Deploy() {
  const [form, setForm]     = useState({ type: 'minecraft', name: '', version: 'latest' });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  async function handleDeploy(e) {
    e.preventDefault();
    if (!DISCORD_ID) return setError('VITE_DISCORD_ID not set in .env');
    setStatus('loading');
    setError('');

    try {
      const { job_id, estimated_seconds } = await deployApi.create({
        discord_id: DISCORD_ID,
        ...form,
      });

      // Poll for completion
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const { job } = await deployApi.status(job_id);
        if (job.status === 'completed') {
          clearInterval(poll);
          setResult(job.result);
          setStatus('success');
        } else if (job.status === 'failed') {
          clearInterval(poll);
          setError(job.error_message || 'Deployment failed.');
          setStatus('error');
        } else if (attempts > 30) {
          clearInterval(poll);
          setError('Timed out waiting for deployment. Check Discord.');
          setStatus('error');
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to queue deployment.');
      setStatus('error');
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Deploy Server</h1>
        <p className="text-gray-500 text-sm mt-1">Provision a new game server via Pterodactyl</p>
      </div>

      <form onSubmit={handleDeploy} className="card space-y-5">
        {/* Server Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Server Type</label>
          <div className="grid grid-cols-3 gap-3">
            {SERVER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, type: t.value }))}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.type === t.value
                    ? 'border-brand-500 bg-brand-600/10 text-brand-400'
                    : 'border-gray-700 hover:border-gray-600 text-gray-400'
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <p className="text-sm font-medium mt-1">{t.label}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Server Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Server Name</label>
          <input
            className="input w-full"
            placeholder="my-minecraft-server"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            pattern="[a-zA-Z0-9_-]+"
            maxLength={32}
            required
          />
          <p className="text-xs text-gray-600 mt-1">Letters, numbers, _ and - only</p>
        </div>

        {/* Version (Minecraft only) */}
        {form.type === 'minecraft' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Version</label>
            <select
              className="input w-full"
              value={form.version}
              onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
            >
              <option value="latest">Latest (Paper)</option>
              <option value="1.20.4">1.20.4</option>
              <option value="1.19.4">1.19.4</option>
              <option value="1.18.2">1.18.2</option>
            </select>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 text-sm">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
        >
          {status === 'loading' ? (
            <><Loader size={15} className="animate-spin" /> Deploying...</>
          ) : (
            <><Rocket size={15} /> Deploy Server</>
          )}
        </button>
      </form>

      {/* Success result */}
      {status === 'success' && result && (
        <div className="card mt-5 border-green-800/50">
          <div className="flex items-center gap-2 text-green-400 mb-4">
            <CheckCircle size={18} />
            <span className="font-semibold">Server Deployed!</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Panel URL',   result.panel_url],
              ['Identifier',  result.identifier],
              ['IP:Port',     `${result.ip}:${result.port}`],
              ['Username',    result.username],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-500">{k}</span>
                <span className="mono text-gray-200">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

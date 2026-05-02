import { useState } from 'react';
import { Play, Square, RotateCcw, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { servers as serverApi } from '../api/client.js';

const STATUS_CONFIG = {
  running:  { color: 'bg-green-500',  label: 'Running',  textColor: 'text-green-400'  },
  starting: { color: 'bg-yellow-500', label: 'Starting', textColor: 'text-yellow-400' },
  stopping: { color: 'bg-orange-500', label: 'Stopping', textColor: 'text-orange-400' },
  offline:  { color: 'bg-red-500',    label: 'Offline',  textColor: 'text-red-400'    },
  error:    { color: 'bg-red-700',    label: 'Error',    textColor: 'text-red-500'    },
};

function formatMB(bytes) {
  if (bytes == null) return '—';
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

export default function ServerCard({ server, discordId, onRefresh }) {
  const [loading, setLoading] = useState(null);
  const cfg = STATUS_CONFIG[server.status] || STATUS_CONFIG.offline;

  async function power(action) {
    setLoading(action);
    try {
      await serverApi[action](server.pterodactyl_identifier, { discord_id: discordId });
      setTimeout(onRefresh, 1500);
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} server.`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="card hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-100 text-base">{server.name}</h3>
          <p className="text-xs text-gray-500 mono mt-0.5">{server.pterodactyl_identifier}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.textColor} bg-opacity-10`}>
          <span className={`status-dot ${cfg.color}`} />
          {cfg.label}
        </span>
      </div>

      {/* Resources */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
          <Cpu size={14} className="mx-auto text-blue-400 mb-1" />
          <p className="text-xs text-gray-500">CPU</p>
          <p className="text-sm font-semibold text-gray-200">{server.cpu != null ? `${server.cpu}%` : '—'}</p>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
          <MemoryStick size={14} className="mx-auto text-purple-400 mb-1" />
          <p className="text-xs text-gray-500">RAM</p>
          <p className="text-sm font-semibold text-gray-200">{formatMB(server.memory_bytes)}</p>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-2.5 text-center">
          <HardDrive size={14} className="mx-auto text-green-400 mb-1" />
          <p className="text-xs text-gray-500">Disk</p>
          <p className="text-sm font-semibold text-gray-200">{formatMB(server.disk_bytes)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => power('start')}
          disabled={!!loading || server.status === 'running'}
          className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <Play size={12} />
          {loading === 'start' ? '...' : 'Start'}
        </button>
        <button
          onClick={() => power('stop')}
          disabled={!!loading || server.status === 'offline'}
          className="btn-danger flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <Square size={12} />
          {loading === 'stop' ? '...' : 'Stop'}
        </button>
        <button
          onClick={() => power('restart')}
          disabled={!!loading || server.status === 'offline'}
          className="btn-ghost flex items-center justify-center gap-1.5 text-xs"
        >
          <RotateCcw size={12} />
          {loading === 'restart' ? '...' : 'Restart'}
        </button>
      </div>
    </div>
  );
}

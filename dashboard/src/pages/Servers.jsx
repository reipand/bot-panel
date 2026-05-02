import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import ServerCard from '../components/ServerCard.jsx';
import { users as userApi } from '../api/client.js';

const DISCORD_ID = import.meta.env.VITE_DISCORD_ID || '';

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!DISCORD_ID) return;
    try {
      const { servers: s } = await userApi.servers(DISCORD_ID);
      setServers(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Servers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and monitor your game servers</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-2">No servers found</p>
          <p className="text-gray-600 text-sm">Deploy one with <code className="mono text-brand-400">/deploy</code> in Discord.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((s) => (
            <ServerCard
              key={s.pterodactyl_identifier}
              server={s}
              discordId={DISCORD_ID}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

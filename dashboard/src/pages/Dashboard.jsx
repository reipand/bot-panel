import { useEffect, useState } from 'react';
import { Server, Users, Activity, TrendingUp } from 'lucide-react';
import { users as userApi } from '../api/client.js';

const DISCORD_ID = import.meta.env.VITE_DISCORD_ID || '';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-100">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!DISCORD_ID) { setLoading(false); return; }
    Promise.all([
      userApi.get(DISCORD_ID),
      userApi.servers(DISCORD_ID),
    ]).then(([user, { servers }]) => {
      setData({ user: user.user, servers });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const online = data?.servers?.filter(s => s.status === 'running').length ?? 0;
  const total  = data?.servers?.length ?? 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your Pterodactyl bot infrastructure</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Server}   label="Total Servers"  value={total}  color="bg-brand-600" />
            <StatCard icon={Activity} label="Online"         value={online} color="bg-green-600" />
            <StatCard icon={Users}    label="Server Limit"   value={data?.user?.server_limit ?? '—'} color="bg-purple-600" />
            <StatCard icon={TrendingUp} label="Role"         value={data?.user?.role?.toUpperCase() ?? '—'} color="bg-orange-600" />
          </div>

          <div className="card">
            <h2 className="font-semibold text-gray-200 mb-4">Your Servers</h2>
            {!data?.servers?.length ? (
              <p className="text-gray-500 text-sm">No servers yet. Use <code className="mono text-brand-400">/deploy</code> in Discord.</p>
            ) : (
              <div className="space-y-2">
                {data.servers.map((s) => {
                  const statusColors = {
                    running: 'text-green-400', offline: 'text-red-400',
                    starting: 'text-yellow-400', stopping: 'text-orange-400',
                  };
                  return (
                    <div key={s.pterodactyl_identifier} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`status-dot ${s.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm text-gray-200">{s.name}</span>
                        <span className="mono text-xs text-gray-500">{s.pterodactyl_identifier}</span>
                      </div>
                      <span className={`text-xs font-medium ${statusColors[s.status] || 'text-gray-400'}`}>
                        {s.status?.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

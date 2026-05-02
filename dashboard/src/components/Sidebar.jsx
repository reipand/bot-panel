import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Server, Rocket, Users, ScrollText, Settings } from 'lucide-react';

const NAV = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { to: '/servers', label: 'Servers',   icon: Server          },
  { to: '/deploy',  label: 'Deploy',    icon: Rocket          },
  { to: '/users',   label: 'Users',     icon: Users           },
  { to: '/logs',    label: 'Audit Log', icon: ScrollText      },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Server size={16} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-100">PteroBot</p>
            <p className="text-xs text-gray-500">Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-brand-600/15 text-brand-400 font-medium'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

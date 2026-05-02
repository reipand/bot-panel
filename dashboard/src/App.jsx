import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Servers from './pages/Servers.jsx';
import Deploy from './pages/Deploy.jsx';

function Placeholder({ title }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-2">{title}</h1>
      <p className="text-gray-500 text-sm">This page is coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/servers"  element={<Servers />} />
            <Route path="/deploy"   element={<Deploy />} />
            <Route path="/users"    element={<Placeholder title="Users" />} />
            <Route path="/logs"     element={<Placeholder title="Audit Log" />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

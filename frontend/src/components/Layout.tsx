import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, MessageSquare, Search, History, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/ask', icon: MessageSquare, label: 'Ask' },
  { to: '/inspector', icon: Search, label: 'Inspector' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/evaluation', icon: BarChart3, label: 'Evaluation' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="flex h-screen" style={{ background: '#0f172a' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex flex-col flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)', borderRight: '1px solid rgba(51,65,85,0.5)' }}
      >
        {/* Logo */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)' }}
            >
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none tracking-tight">DocIntel</p>
              <p className="text-xs leading-none mt-0.5" style={{ color: '#475569' }}>Knowledge Base</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                  isActive ? 'text-white font-medium' : 'text-slate-400 hover:text-white'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(67,97,238,0.18)', boxShadow: 'inset 0 0 0 1px rgba(67,97,238,0.2)' }
                  : undefined
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-400' : ''}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Decorative divider */}
        <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(67,97,238,0.3), transparent)' }} />

        {/* User section */}
        <div className="px-3 py-3 space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.username}</p>
              <p className="text-xs truncate" style={{ color: '#475569' }}>{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 transition-colors"
            style={{ ':hover': { background: 'rgba(239,68,68,0.08)' } } as React.CSSProperties}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto" style={{ background: '#0f172a' }}>
        <Outlet />
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  CheckSquare, 
  Ticket, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  LogOut, 
  Bell 
} from 'lucide-react';
import client from './api/client';

// Pages (placeholders for now, we'll create them next)
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tickets from './pages/Tickets';
import Chat from './pages/Chat';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';

const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projetos e Tarefas', path: '/projetos', icon: Briefcase },
    { name: 'Chamados', path: '/chamados', icon: Ticket },
    { name: 'Chat', path: '/chat', icon: MessageSquare },
    { name: 'Base de Conhecimento', path: '/conhecimento', icon: BookOpen },
  ];

  if (user && (user.role === 'super_admin' || user.role === 'admin')) {
    navItems.push({ name: 'Administração', path: '/admin', icon: Settings });
  }

  return (
    <div className="sidebar" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'hsl(var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
          M
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Mais Tecnologia</h2>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Gestão Integrada</span>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              color: isActive(item.path) ? '#fff' : 'hsl(var(--text-secondary))',
              background: isActive(item.path) ? 'hsla(var(--accent-primary), 0.15)' : 'transparent',
              border: isActive(item.path) ? '1px solid hsla(var(--accent-primary), 0.3)' : '1px solid transparent',
              fontWeight: isActive(item.path) ? '500' : '400',
              transition: 'all 0.2s',
            }}
          >
            <item.icon size={20} color={isActive(item.path) ? 'hsl(var(--accent-primary-hover))' : 'currentColor'} />
            {item.name}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid hsl(var(--border))', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <img src={user.avatar || 'https://via.placeholder.com/40'} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{user.role}</p>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={onLogout}>
          <LogOut size={18} /> Sair
        </button>
      </div>
    </div>
  );
};

const Topbar = () => {
  return (
    <div className="topbar">
      <div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={20} color="hsl(var(--text-secondary))" />
          <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: 'hsl(var(--danger))', borderRadius: '50%' }}></span>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await client.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
        
        <Route path="/*" element={
          <ProtectedRoute user={user}>
            <div className="app-container">
              <Sidebar user={user} onLogout={handleLogout} />
              <div className="main-content">
                <Topbar />
                <div className="page-container animate-fade-in">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projetos" element={<Projects />} />
                    <Route path="/chamados" element={<Tickets />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/conhecimento" element={<div className="glass-card" style={{ padding: '2rem' }}><h2>Base de Conhecimento</h2><p>Módulo em desenvolvimento.</p></div>} />
                  </Routes>
                </div>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;

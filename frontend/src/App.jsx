/**
 * ==========================================
 * PONTO DE ENTRADA DO FRONTEND (APP SHELL)
 * ==========================================
 * Este é o componente raiz do React.
 * 
 * ESTRUTURA E RESPONSABILIDADES:
 * 1. Roteamento: Usa `react-router-dom` para gerenciar as telas.
 * 2. Layout Principal: Envolve todas as páginas (Dashboard, Projetos, etc.) com a Barra Lateral (Sidebar) e o Cabeçalho (Header).
 * 3. Proteção de Rotas: O componente `ProtectedRoute` verifica se o usuário tem um Token JWT válido no `localStorage`.
 *    Se não tiver, redireciona para `/login`.
 * 
 * GUIA PARA A IA E DESENVOLVEDORES:
 * - Para criar uma nova tela:
 *   1. Crie o arquivo em `src/pages/SuaTela.jsx`.
 *   2. Importe-o aqui no `App.jsx`.
 *   3. Adicione a rota `<Route path="/sua-tela" element={<SuaTela />} />` dentro do `<Route element={<Layout />}>`.
 *   4. Adicione o link na Sidebar (dentro deste mesmo arquivo, no componente `Sidebar`).
 */
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Ticket, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  LogOut, 
  Bell,
  Menu,
  X
} from 'lucide-react';
import client from './api/client';

// Pages
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Tickets from './pages/Tickets';
import Chat from './pages/Chat';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import KnowledgeBase from './pages/KnowledgeBase';

const ProtectedRoute = ({ children, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const Sidebar = ({ user, onLogout, mobileOpen, onClose }) => {
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
    <div className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyBorders: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'hsl(var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff', boxShadow: 'var(--shadow-neon)' }}>
            M
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>Mais Tecnologia</h2>
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Gestão Integrada</span>
          </div>
        </div>
        
        {mobileOpen && (
          <button 
            onClick={onClose} 
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              color: isActive(item.path) ? '#fff' : 'hsl(var(--text-secondary))',
              background: isActive(item.path) ? 'hsla(var(--accent-primary), 0.15)' : 'transparent',
              border: isActive(item.path) ? '1px solid hsla(var(--accent-primary), 0.3)' : '1px solid transparent',
              fontWeight: isActive(item.path) ? '600' : '400',
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
          <img src={user.avatar || 'https://via.placeholder.com/40'} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid hsl(var(--border))' }} />
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))', textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={onLogout}>
          <LogOut size={18} /> Sair
        </button>
      </div>
    </div>
  );
};

const Topbar = ({ 
  onToggleMenu, 
  activeTheme, 
  onChangeTheme, 
  notifications, 
  showNotifications, 
  setShowNotifications, 
  onClearNotifications 
}) => {
  const themes = [
    { name: 'indigo', color: '#6366f1' },
    { name: 'blue', color: '#3b82f6' },
    { name: 'emerald', color: '#10b981' },
    { name: 'orange', color: '#f97316' }
  ];

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button className="hamburger-btn" onClick={onToggleMenu}>
          <Menu size={24} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        
        {/* Dynamic Accent Theme dots */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginRight: '0.25rem' }}>Accent:</span>
          {themes.map(t => (
            <div 
              key={t.name}
              className={`theme-dot ${activeTheme === t.name ? 'active' : ''}`}
              style={{ background: t.color }}
              onClick={() => onChangeTheme(t.name)}
              title={`Tema ${t.name}`}
            />
          ))}
        </div>

        {/* Notifications bell */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} color="hsl(var(--text-secondary))" />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: 'hsl(var(--danger))', borderRadius: '50%', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {notifications.length}
              </span>
            )}
          </div>

          {/* Floating Dropdown for notifications */}
          {showNotifications && (
            <div className="glass-panel notification-dropdown" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Notificações</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={onClearNotifications}
                    style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-primary))', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textAlign: 'center', margin: '1rem 0' }}>Nenhuma notificação por enquanto.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', borderBottom: '1px solid hsla(var(--border), 0.5)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{n.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '500', color: '#fff', lineHeight: '1.3' }}>{n.text}</p>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') || 'indigo');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, icon: '⚠️', text: 'Alerta SLA: Chamado crítico #tkt-1 violou o prazo!', time: 'Há 5 min' },
    { id: 2, icon: '🔔', text: 'Novo chamado aberto: "Problema no POS da Loja 01"', time: 'Há 20 min' },
    { id: 3, icon: '🔒', text: 'Chamado #tkt-2 foi resolvido por Lucas', time: 'Há 1 hora' }
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await client.get('/auth/me');
          setUser(res.data);
        } catch {
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
              {/* Mobile Drawer Overlay Backdrop */}
              <div 
                className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`} 
                onClick={() => setMobileMenuOpen(false)} 
              />
              
              <Sidebar 
                user={user} 
                onLogout={handleLogout} 
                mobileOpen={mobileMenuOpen} 
                onClose={() => setMobileMenuOpen(false)} 
              />
              
              <div className="main-content">
                <Topbar 
                  onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
                  activeTheme={activeTheme} 
                  onChangeTheme={(theme) => setActiveTheme(theme)} 
                  notifications={notifications}
                  showNotifications={showNotifications}
                  setShowNotifications={setShowNotifications}
                  onClearNotifications={() => setNotifications([])}
                />
                
                <div className="page-container animate-fade-in">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projetos" element={<Projects />} />
                    <Route path="/chamados" element={<Tickets />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/conhecimento" element={<KnowledgeBase />} />
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

import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Ticket, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  Sliders,
  LogOut, 
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Plus,
  Search,
  Sparkles,
  Bot,
  Send,
  Loader,
  ChevronDown
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
import SettingsPage from './pages/Settings';

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
    { name: 'Configurações', path: '/settings', icon: Settings }
  ];

  if (user && (user.role === 'super_admin' || user.role === 'admin' || user.role === 'system_admin' || user.role === 'team_admin')) {
    navItems.push({ name: 'Administração', path: '/admin', icon: Sliders });
  }

  return (
    <div className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#fff', boxShadow: 'var(--shadow-neon)' }}>
            M
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700' }}>{user ? (user.systemName || 'Mais Tecnologia') : 'Mais Tecnologia'}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gestão Integrada</span>
          </div>
        </div>
        
        {mobileOpen && (
          <button 
            onClick={onClose} 
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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
              color: isActive(item.path) ? 'var(--text-active)' : 'var(--text-secondary)',
              background: isActive(item.path) ? 'hsla(var(--accent-primary-val), 0.15)' : 'transparent',
              border: isActive(item.path) ? '1px solid hsla(var(--accent-primary-val), 0.3)' : '1px solid transparent',
              fontWeight: isActive(item.path) ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            <item.icon size={20} color={isActive(item.path) ? 'var(--accent-primary)' : 'currentColor'} />
            {item.name}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <img src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60'} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border)' }} />
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</p>
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
  colorScheme,
  onChangeScheme,
  notifications, 
  showNotifications, 
  setShowNotifications, 
  onClearNotifications,
  onOpenQuickCreate
}) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const themes = [
    { name: 'indigo', color: '#6366f1' },
    { name: 'blue', color: '#3b82f6' },
    { name: 'emerald', color: '#10b981' },
    { name: 'orange', color: '#f97316' }
  ];

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button className="hamburger-btn" onClick={onToggleMenu}>
          <Menu size={24} />
        </button>
        
        {/* Global Search Bar (Linear style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.8rem', width: '320px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Pesquisar projetos, chamados, tarefas..." 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.82rem', width: '100%' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        
        {/* Quick create button dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            onClick={() => setShowCreateMenu(!showCreateMenu)}
          >
            <Plus size={16} /> Criar <ChevronDown size={14} />
          </button>
          
          {showCreateMenu && (
            <div className="glass-panel" style={{ position: 'absolute', top: '42px', right: 0, width: '160px', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '0.5rem', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => { onOpenQuickCreate('project'); setShowCreateMenu(false); }} 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', border: 'none', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                + Novo Projeto
              </button>
              <button 
                onClick={() => { onOpenQuickCreate('task'); setShowCreateMenu(false); }} 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', border: 'none', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                + Nova Tarefa
              </button>
              <button 
                onClick={() => { onOpenQuickCreate('ticket'); setShowCreateMenu(false); }} 
                className="btn btn-secondary" 
                style={{ justifyContent: 'flex-start', border: 'none', fontSize: '0.8rem', padding: '0.5rem' }}
              >
                + Novo Chamado
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Color Accent Dots */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {themes.map(t => (
            <div 
              key={t.name}
              className={`theme-dot ${activeTheme === t.name ? 'active' : ''}`}
              style={{ background: t.color }}
              onClick={() => onChangeTheme(t.name)}
              title={`Cor de destaque: ${t.name}`}
            />
          ))}
        </div>

        {/* Light/Dark Toggle */}
        <button 
          onClick={() => onChangeScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          className="btn btn-secondary"
          style={{ padding: '0.45rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={colorScheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        >
          {colorScheme === 'dark' ? <Sun size={18} color="var(--text-secondary)" /> : <Moon size={18} color="var(--text-secondary)" />}
        </button>

        {/* Notifications bell */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowNotifications(!showNotifications)}>
            <Bell size={20} color="var(--text-secondary)" />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', background: 'var(--danger)', borderRadius: '50%', color: '#fff', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {notifications.length}
              </span>
            )}
          </div>

          {/* Floating Dropdown for notifications */}
          {showNotifications && (
            <div className="glass-panel notification-dropdown" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Notificações</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={onClearNotifications}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: '1rem 0' }}>Nenhuma notificação por enquanto.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1rem' }}>{n.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.3' }}>{n.text}</p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.time}</span>
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

// ProMais AI floating copilot widget
const ProMaisAIWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    { id: 1, sender: 'ai', text: 'Olá! Sou o **ProMais AI**, copiloto de operações para a Lojas Moda Verão. Como posso te auxiliar hoje?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("Analisando o problema...");
  const [settings, setSettings] = useState({
    aiTypingDelay: 1500,
    aiHumanMode: true,
    aiRepeatGreeting: false,
    aiMaxQuestions: 3,
    aiInvestigativeMode: true,
    aiMaintainContext: true
  });
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  // Carregar configurações do banco de dados quando abrir o copiloto
  useEffect(() => {
    if (isOpen) {
      client.get('/settings').then(res => {
        if (res.data) {
          setSettings({
            aiTypingDelay: res.data.aiTypingDelay !== undefined ? Number(res.data.aiTypingDelay) : 1500,
            aiHumanMode: res.data.aiHumanMode ?? true,
            aiRepeatGreeting: res.data.aiRepeatGreeting ?? false,
            aiMaxQuestions: res.data.aiMaxQuestions !== undefined ? Number(res.data.aiMaxQuestions) : 3,
            aiInvestigativeMode: res.data.aiInvestigativeMode ?? true,
            aiMaintainContext: res.data.aiMaintainContext ?? true
          });
        }
      }).catch(err => console.error("Erro ao carregar configurações de IA no widget:", err));
    }
  }, [isOpen]);

  // Ciclo das mensagens intermediárias de carregamento
  useEffect(() => {
    let interval;
    if (loading) {
      const statuses = [
        "Analisando o problema...",
        "Consultando nossa base de conhecimento...",
        "Verificando possíveis causas..."
      ];
      let currentIndex = 0;
      setLoadingStatus(statuses[0]);

      interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % statuses.length;
        setLoadingStatus(statuses[currentIndex]);
      }, 750);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSendAI = async (textToSend) => {
    if (!textToSend.trim()) return;

    setChatMsgs(prev => [...prev, { id: Date.now(), sender: 'user', text: textToSend }]);
    setInputText('');
    setLoading(true);

    const historyPayload = chatMsgs.map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));

    try {
      const start = Date.now();
      const res = await client.post('/ai/chat', { 
        message: textToSend,
        history: settings.aiMaintainContext ? historyPayload : []
      });

      const elapsed = Date.now() - start;
      const delayNeeded = Math.max(0, settings.aiTypingDelay - elapsed);
      if (delayNeeded > 0) {
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
      }

      setChatMsgs(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: res.data.reply }]);

      // Process automated actions from backend
      if (res.data.actions && res.data.actions.length > 0) {
        for (const action of res.data.actions) {
          if (action.type === 'create_ticket') {
            try {
              // Call API to create ticket on user's behalf
              const ticketRes = await client.post('/tickets', action.payload);
              const ticket = ticketRes.data;
              
              // Give some short delay to simulate creation processing for premium UX
              await new Promise(resolve => setTimeout(resolve, 800));

              setChatMsgs(prev => [...prev, {
                id: Date.now() + 2,
                sender: 'ai',
                text: `⚙️ **Abertura de Chamado Realizada!**\n\nRegistrei o incidente automaticamente com os seguintes dados:\n• **Chamado:** #${ticket.id}\n• **Assunto:** "${ticket.subject}"\n• **Categoria:** ${ticket.category}\n• **Prioridade:** ${ticket.priority.toUpperCase()}\n• **SLA Escalação:** ${new Date(ticket.slaEscalationTime).toLocaleString()}\n\nUm técnico de suporte foi notificado.`
              }]);
            } catch (ticketErr) {
              console.error("Erro ao registrar chamado via IA:", ticketErr);
              setChatMsgs(prev => [...prev, {
                id: Date.now() + 2,
                sender: 'ai',
                text: `❌ **Falha na Ação Automatizada:** Não consegui registrar o chamado automaticamente no sistema. Por favor, tente criar pela aba lateral "Chamados".`
              }]);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setChatMsgs(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: 'Desculpe, tive um problema ao me conectar ao servidor de IA.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendAI(suggestion);
  };

  const suggestions = [
    'Resumir chamado tkt-1',
    'Prever SLA do chamado tkt-1',
    'Quem está livre para chamado?',
    'Sugerir subtarefas de implantação'
  ];

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, fontFamily: 'inherit' }}>
      
      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="glow-btn"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--accent-primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-neon)',
          transition: 'transform 0.2s'
        }}
      >
        {isOpen ? <X size={24} /> : <Bot size={28} />}
      </button>

      {/* Floating AI Panel */}
      {isOpen && (
        <div 
          className="glass-panel animate-fade-in" 
          style={{
            position: 'absolute',
            bottom: '70px',
            right: 0,
            width: '380px',
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'linear-gradient(135deg, hsla(var(--accent-primary-val), 0.1), transparent)' }}>
            <Bot size={24} color="var(--accent-primary)" />
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                ProMais AI <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Copilot</span>
              </h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Análises inteligentes em tempo real</span>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {chatMsgs.map(m => (
              <div key={m.id} style={{ alignSelf: m.sender === 'ai' ? 'flex-start' : 'flex-end', maxWidth: '85%' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '14px',
                  fontSize: '0.85rem',
                  lineHeight: 1.4,
                  background: m.sender === 'ai' ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                  color: '#fff',
                  border: m.sender === 'ai' ? '1px solid var(--border)' : 'none',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Loader size={14} className="spin" /> {loadingStatus}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{ padding: '0.5rem 1.25rem', display: 'flex', gap: '0.4rem', overflowX: 'auto', whiteSpace: 'nowrap', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
            {suggestions.map(s => (
              <button 
                key={s} 
                className="btn btn-secondary" 
                onClick={() => handleSuggestionClick(s)}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.7rem', borderRadius: '100px' }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendAI(inputText); }} 
            style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem' }}
          >
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Pergunte ao copiloto..."
              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.6rem 1rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem' }}><Send size={16} /></button>
          </form>
        </div>
      )}
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('theme') || 'indigo');
  const [colorScheme, setColorScheme] = useState(() => localStorage.getItem('colorScheme') || 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [systemName, setSystemName] = useState('Mais Tecnologia');

  useEffect(() => {
    document.title = systemName;
  }, [systemName]);
  const [notifications, setNotifications] = useState([
    { id: 1, icon: '⚠️', text: 'Alerta SLA: Chamado crítico #tkt-1 violou o prazo!', time: 'Há 5 min' },
    { id: 2, icon: '🔔', text: 'Novo chamado aberto: "Problema no POS da Loja 01"', time: 'Há 20 min' },
    { id: 3, icon: '🔒', text: 'Chamado #tkt-2 foi resolvido por Lucas', time: 'Há 1 hora' }
  ]);

  // Global Quick Create Modals
  const [quickCreateType, setQuickCreateType] = useState(null); // null, 'project', 'task', 'ticket'
  const [quickProjName, setQuickProjName] = useState('');
  const [quickProjCode, setQuickProjCode] = useState('');
  const [quickProjDesc, setQuickProjDesc] = useState('');
  
  const [quickTskTitle, setQuickTskTitle] = useState('');
  const [quickTskProj, setQuickTskProj] = useState('');
  const [quickTskPriority, setQuickTskPriority] = useState('media');
  
  const [quickTktSubject, setQuickTktSubject] = useState('');
  const [quickTktDesc, setQuickTktDesc] = useState('');
  const [quickTktCat, setQuickTktCat] = useState('TI e Infraestrutura');
  const [quickTktPriority, setQuickTktPriority] = useState('media');

  const [globalProjectsList, setGlobalProjectsList] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await client.get('/auth/me');
          setUser(res.data);
          
          // Preload settings
          try {
            const settingsRes = await client.get('/settings');
            if (settingsRes.data) {
              const name = settingsRes.data.systemName || 'Mais Tecnologia';
              setSystemName(name);
              // Also temporarily inject it on the user object for convenience in the sidebar
              res.data.systemName = name;
              if (settingsRes.data.accentColor && !localStorage.getItem('theme')) {
                setActiveTheme(settingsRes.data.accentColor);
              }
            }
          } catch (e) {
            console.error("Erro ao carregar configuracoes globais no App:", e);
          }
          
          // Preload projects for task creation dropdown
          const projRes = await client.get('/projects');
          setGlobalProjectsList(projRes.data || []);
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
    client.get('/projects').then(res => setGlobalProjectsList(res.data || []));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleQuickCreateProject = async (e) => {
    e.preventDefault();
    if (!quickProjName || !quickProjCode) return;
    try {
      await client.post('/projects', {
        name: quickProjName,
        code: quickProjCode.toUpperCase(),
        description: quickProjDesc,
        lists: ['Backlog', 'Planejada', 'Em andamento', 'Concluída'],
        companyId: user?.companyId || 'comp-1'
      });
      setQuickProjName(''); setQuickProjCode(''); setQuickProjDesc('');
      setQuickCreateType(null);
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const handleQuickCreateTask = async (e) => {
    e.preventDefault();
    if (!quickTskTitle || !quickTskProj) return;
    try {
      await client.post('/tasks', {
        title: quickTskTitle,
        projectId: quickTskProj,
        priority: quickTskPriority,
        list: 'Backlog',
        status: 'backlog',
        companyId: user?.companyId || 'comp-1',
        checklist: []
      });
      setQuickTskTitle(''); setQuickTskProj('');
      setQuickCreateType(null);
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const handleQuickCreateTicket = async (e) => {
    e.preventDefault();
    if (!quickTktSubject || !quickTktDesc) return;
    try {
      await client.post('/tickets', {
        subject: quickTktSubject,
        description: quickTktDesc,
        category: quickTktCat,
        priority: quickTktPriority
      });
      setQuickTktSubject(''); setQuickTktDesc('');
      setQuickCreateType(null);
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06142D', color: '#fff' }}>Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
        
        <Route path="/*" element={
          <ProtectedRoute user={user}>
            <div className="app-container">
              {/* Mobile Drawer Overlay */}
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
                  colorScheme={colorScheme}
                  onChangeScheme={(scheme) => setColorScheme(scheme)}
                  notifications={notifications}
                  showNotifications={showNotifications}
                  setShowNotifications={setShowNotifications}
                  onClearNotifications={() => setNotifications([])}
                  onOpenQuickCreate={(type) => setQuickCreateType(type)}
                />
                
                <div className="page-container animate-fade-in">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projetos" element={<Projects />} />
                    <Route path="/chamados" element={<Tickets />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/conhecimento" element={<KnowledgeBase />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </div>
              </div>

              {/* Floating ProMais AI Assistant */}
              <ProMaisAIWidget />

              {/* ==========================================
                  GLOBAL MODALS FOR QUICK ACTIONS
                  ========================================== */}
              
              {/* Quick Project Modal */}
              {quickCreateType === 'project' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
                    <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setQuickCreateType(null)}>
                      <X size={20} />
                    </button>
                    <h2 style={{ marginBottom: '1.5rem' }}>Abrir Novo Projeto</h2>
                    <form onSubmit={handleQuickCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="input-group">
                        <label className="input-label">Nome do Projeto</label>
                        <input type="text" className="input-field" value={quickProjName} onChange={e => setQuickProjName(e.target.value)} placeholder="Ex: App Loja Virtual" required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Sigla / Código</label>
                        <input type="text" className="input-field" value={quickProjCode} onChange={e => setQuickProjCode(e.target.value)} placeholder="Ex: ALV" required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Descrição</label>
                        <textarea className="input-field" value={quickProjDesc} onChange={e => setQuickProjDesc(e.target.value)} placeholder="Objetivos e escopo do projeto..." />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setQuickCreateType(null)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Criar Projeto</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Quick Task Modal */}
              {quickCreateType === 'task' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
                    <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setQuickCreateType(null)}>
                      <X size={20} />
                    </button>
                    <h2 style={{ marginBottom: '1.5rem' }}>Adicionar Nova Tarefa</h2>
                    <form onSubmit={handleQuickCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="input-group">
                        <label className="input-label">Título da Atividade</label>
                        <input type="text" className="input-field" value={quickTskTitle} onChange={e => setQuickTskTitle(e.target.value)} placeholder="O que deve ser feito?" required />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Projeto Relacionado</label>
                        <select className="input-field" value={quickTskProj} onChange={e => setQuickTskProj(e.target.value)} required>
                          <option value="">Selecione o projeto...</option>
                          {globalProjectsList.map(p => (
                            <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Prioridade</label>
                        <select className="input-field" value={quickTskPriority} onChange={e => setQuickTskPriority(e.target.value)}>
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                          <option value="critica">Crítica</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setQuickCreateType(null)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Criar Tarefa</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Quick Ticket Modal */}
              {quickCreateType === 'ticket' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '2rem', position: 'relative' }}>
                    <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setQuickCreateType(null)}>
                      <X size={20} />
                    </button>
                    <h2 style={{ marginBottom: '1.5rem' }}>Abrir Chamado Urgente</h2>
                    <form onSubmit={handleQuickCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="input-group">
                        <label className="input-label">Título do Problema</label>
                        <input type="text" className="input-field" value={quickTktSubject} onChange={e => setQuickTktSubject(e.target.value)} placeholder="Título rápido..." required />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="input-group">
                          <label className="input-label">Categoria</label>
                          <select className="input-field" value={quickTktCat} onChange={e => setQuickTktCat(e.target.value)}>
                            <option value="TI e Infraestrutura">TI e Infraestrutura</option>
                            <option value="Recursos Humanos">Recursos Humanos</option>
                            <option value="Financeiro">Financeiro</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label className="input-label">Criticidade (Prioridade)</label>
                          <select className="input-field" value={quickTktPriority} onChange={e => setQuickTktPriority(e.target.value)}>
                            <option value="baixa">Baixa (48h)</option>
                            <option value="media">Média (24h)</option>
                            <option value="alta">Alta (12h)</option>
                            <option value="critica">Crítica (4h)</option>
                          </select>
                        </div>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Descrição Detalhada</label>
                        <textarea className="input-field" style={{ height: '90px', resize: 'vertical' }} value={quickTktDesc} onChange={e => setQuickTktDesc(e.target.value)} placeholder="Descreva os detalhes..." required />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setQuickCreateType(null)}>Cancelar</button>
                        <button type="submit" className="btn btn-primary">Abrir Chamado</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;

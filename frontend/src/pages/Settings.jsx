import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Shield, Laptop, BarChart2, Folder, 
  AlertTriangle, MessageSquare, BookOpen, Save, RefreshCw, 
  Plus, X, Lock, Check, Bot 
} from 'lucide-react';
import client from '../api/client';

const readTokenPayload = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

export default function Settings() {
  const [user] = useState(() => readTokenPayload());
  const isAdmin = user && ['super_admin', 'admin', 'gestor', 'system_admin', 'team_admin'].includes(user.role);
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Settings State variables
  const [systemName, setSystemName] = useState('Mais Tecnologia');
  const [accentColor, setAccentColor] = useState('indigo');
  const [passwordMinLength, setPasswordMinLength] = useState(6);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [allowRegister, setAllowRegister] = useState(true);
  const [dashboardRefreshRate, setDashboardRefreshRate] = useState(30);
  const [enableSparklines, setEnableSparklines] = useState(true);
  const [defaultProjectLists, setDefaultProjectLists] = useState(["Backlog", "Planejada", "Em andamento", "Concluída"]);
  const [newProjectList, setNewProjectList] = useState('');
  const [allowTaskSelfAssign, setAllowTaskSelfAssign] = useState(true);
  const [chatFileSharing, setChatFileSharing] = useState(true);
  const [chatEmojis, setChatEmojis] = useState(["👍", "❤️", "😂", "😮", "😢", "🎉"]);
  const [newEmoji, setNewEmoji] = useState('');
  const [kbRequireApproval, setKbRequireApproval] = useState(false);
  const [kbCategories, setKbCategories] = useState(["TI", "Recursos Humanos", "Financeiro", "Dúvidas Frequentes", "Processos Internos"]);
  const [newKbCategory, setNewKbCategory] = useState('');
  const [slaLowHours, setSlaLowHours] = useState(48);
  const [slaMediumHours, setSlaMediumHours] = useState(24);
  const [slaHighHours, setSlaHighHours] = useState(12);
  const [slaCriticalHours, setSlaCriticalHours] = useState(4);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiHumanMode, setAiHumanMode] = useState(true);
  const [aiTypingDelay, setAiTypingDelay] = useState(1500);
  const [aiRepeatGreeting, setAiRepeatGreeting] = useState(false);
  const [aiMaxQuestions, setAiMaxQuestions] = useState(3);
  const [aiInvestigativeMode, setAiInvestigativeMode] = useState(true);
  const [aiMaintainContext, setAiMaintainContext] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await client.get('/settings');
        const d = res.data;
        if (d) {
          setSystemName(d.systemName ?? 'Mais Tecnologia');
          setAccentColor(d.accentColor ?? 'indigo');
          setPasswordMinLength(d.passwordMinLength ?? 6);
          setSessionTimeout(d.sessionTimeout ?? 60);
          setAllowRegister(d.allowRegister ?? true);
          setDashboardRefreshRate(d.dashboardRefreshRate ?? 30);
          setEnableSparklines(d.enableSparklines ?? true);
          setDefaultProjectLists(d.defaultProjectLists ?? ["Backlog", "Planejada", "Em andamento", "Concluída"]);
          setAllowTaskSelfAssign(d.allowTaskSelfAssign ?? true);
          setChatFileSharing(d.chatFileSharing ?? true);
          setChatEmojis(d.chatEmojis ?? ["👍", "❤️", "😂", "😮", "😢", "🎉"]);
          setKbRequireApproval(d.kbRequireApproval ?? false);
          setKbCategories(d.kbCategories ?? ["TI", "Recursos Humanos", "Financeiro", "Dúvidas Frequentes", "Processos Internos"]);
          setSlaLowHours(d.slaLowHours ?? 48);
          setSlaMediumHours(d.slaMediumHours ?? 24);
          setSlaHighHours(d.slaHighHours ?? 12);
          setSlaCriticalHours(d.slaCriticalHours ?? 4);
          setGeminiApiKey(d.geminiApiKey ?? '');
          setAiHumanMode(d.aiHumanMode ?? true);
          setAiTypingDelay(d.aiTypingDelay ?? 1500);
          setAiRepeatGreeting(d.aiRepeatGreeting ?? false);
          setAiMaxQuestions(d.aiMaxQuestions ?? 3);
          setAiInvestigativeMode(d.aiInvestigativeMode ?? true);
          setAiMaintainContext(d.aiMaintainContext ?? true);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações", err);
        setMessage({ text: 'Falha ao buscar configurações do servidor.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setMessage({ text: '', type: '' });

    const payload = {
      systemName,
      accentColor,
      passwordMinLength: parseInt(passwordMinLength),
      sessionTimeout: parseInt(sessionTimeout),
      allowRegister,
      dashboardRefreshRate: parseInt(dashboardRefreshRate),
      enableSparklines,
      defaultProjectLists,
      allowTaskSelfAssign,
      chatFileSharing,
      chatEmojis,
      kbRequireApproval,
      kbCategories,
      slaLowHours: parseInt(slaLowHours),
      slaMediumHours: parseInt(slaMediumHours),
      slaHighHours: parseInt(slaHighHours),
      slaCriticalHours: parseInt(slaCriticalHours),
      geminiApiKey,
      aiHumanMode,
      aiTypingDelay: parseInt(aiTypingDelay),
      aiRepeatGreeting,
      aiMaxQuestions: parseInt(aiMaxQuestions),
      aiInvestigativeMode,
      aiMaintainContext
    };

    try {
      await client.put('/settings', payload);
      setMessage({ text: 'Configurações globais salvas com sucesso!', type: 'success' });
      
      // Apply theme changes dynamically if they match the user's active UI variables
      if (payload.accentColor) {
        document.documentElement.setAttribute('data-theme', payload.accentColor);
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: err.response?.data?.message || 'Erro ao salvar configurações.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddProjectList = () => {
    if (newProjectList.trim() && !defaultProjectLists.includes(newProjectList.trim())) {
      setDefaultProjectLists([...defaultProjectLists, newProjectList.trim()]);
      setNewProjectList('');
    }
  };

  const handleRemoveProjectList = (index) => {
    setDefaultProjectLists(defaultProjectLists.filter((_, i) => i !== index));
  };

  const handleAddEmoji = () => {
    if (newEmoji.trim() && !chatEmojis.includes(newEmoji.trim())) {
      setChatEmojis([...chatEmojis, newEmoji.trim()]);
      setNewEmoji('');
    }
  };

  const handleRemoveEmoji = (emoji) => {
    setChatEmojis(chatEmojis.filter(e => e !== emoji));
  };

  const handleAddKbCategory = () => {
    if (newKbCategory.trim() && !kbCategories.includes(newKbCategory.trim())) {
      setKbCategories([...kbCategories, newKbCategory.trim()]);
      setNewKbCategory('');
    }
  };

  const handleRemoveKbCategory = (category) => {
    setKbCategories(kbCategories.filter(c => c !== category));
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--text-secondary)' }}>
      <RefreshCw size={24} className="spin" /> Carregando Painel de Configurações...
    </div>
  );

  return (
    <div style={{ paddingBottom: '3rem' }}>
      <style>{`
        .settings-tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.9rem;
          border-radius: 12px;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
        }
        .settings-tab-btn:hover {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .settings-tab-btn.active {
          background: hsla(var(--accent-primary-val), 0.12);
          color: var(--accent-primary);
          font-weight: 700;
        }
        .settings-section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 0.8rem;
          color: #fff;
        }
        .tag-remove-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }
        .tag-remove-btn:hover {
          color: #ef4444;
        }
        .lock-overlay {
          position: absolute;
          inset: 0;
          background: rgba(6, 20, 45, 0.4);
          backdrop-filter: blur(1.5px);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: inherit;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SettingsIcon size={28} color="var(--accent-primary)" /> Painel de Configurações
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gerencie as regras do sistema, prazos de SLAs, segurança e preferências estéticas globais.</p>
        </div>
      </div>

      {message.text && (
        <div style={{
          background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: message.type === 'error' ? '#ef4444' : '#10b981',
          border: `1.5px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
          padding: '1rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'error' ? <AlertTriangle size={18} /> : <Check size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings Grid Panel */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        
        {/* Left: Tab selectors */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
            <Laptop size={16} /> Geral & Identidade
          </button>
          <button className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
            <Shield size={16} /> Segurança & Acessos
          </button>
          <button className={`settings-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <BarChart2 size={16} /> Dashboard & Gráficos
          </button>
          <button className={`settings-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            <Folder size={16} /> Projetos & Kanban
          </button>
          <button className={`settings-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
            <AlertTriangle size={16} /> Chamados & SLAs
          </button>
          <button className={`settings-tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <MessageSquare size={16} /> Chat & Reações
          </button>
          <button className={`settings-tab-btn ${activeTab === 'kb' ? 'active' : ''}`} onClick={() => setActiveTab('kb')}>
            <BookOpen size={16} /> Central de Ajuda
          </button>
          <button className={`settings-tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
            <Bot size={16} /> Inteligência Artificial
          </button>
        </div>

        {/* Right: Tab content form */}
        <form onSubmit={handleSave} style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
          
          {/* Read Only Warning for non-admins */}
          {!isAdmin && (
            <div className="lock-overlay">
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '380px', textAlign: 'center', border: '1.5px solid rgba(245, 158, 11, 0.3)' }}>
                <Lock size={32} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Apenas Leitura</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Suas credenciais corporativas permitem visualizar os parâmetros de configuração do sistema, porém a edição é restrita a administradores.
                </p>
              </div>
            </div>
          )}

          <div style={{ flex: 1 }}>
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Geral & Identidade Visual</h3>
                
                <div className="input-group">
                  <label className="input-label">Título da Plataforma</label>
                  <input type="text" className="input-field" value={systemName} onChange={e => setSystemName(e.target.value)} disabled={!isAdmin} required />
                </div>

                <div className="input-group">
                  <label className="input-label">Cor de Accent (Tema de Destaque)</label>
                  <select className="input-field" value={accentColor} onChange={e => setAccentColor(e.target.value)} disabled={!isAdmin}>
                    <option value="indigo">💜 Roxo / Índigo (Linear Style)</option>
                    <option value="blue">💙 Azul Elétrico (iCloud Style)</option>
                    <option value="emerald">💚 Verde Esmeralda (Vercel Style)</option>
                    <option value="orange">🧡 Laranja Solar (ClickUp Style)</option>
                  </select>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Segurança & Acessos</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="input-group">
                    <label className="input-label">Comprimento Mínimo de Senhas</label>
                    <input type="number" className="input-field" min="4" max="20" value={passwordMinLength} onChange={e => setPasswordMinLength(e.target.value)} disabled={!isAdmin} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Tempo Limite da Sessão (minutos)</label>
                    <input type="number" className="input-field" min="10" max="1440" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} disabled={!isAdmin} required />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input type="checkbox" id="allowRegister" checked={allowRegister} onChange={e => setAllowRegister(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                  <label htmlFor="allowRegister" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                    Permitir cadastro livre de novos funcionários da corporação
                  </label>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  Nota: Usuários que se cadastram automaticamente são designados por padrão como membros e restringidos ao domínio institucional @modaverao.com.br.
                </p>

              </div>
            )}

            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Dashboard & Estatísticas</h3>

                <div className="input-group">
                  <label className="input-label">Intervalo de Atualização Automática (segundos)</label>
                  <input type="number" className="input-field" min="10" max="600" value={dashboardRefreshRate} onChange={e => setDashboardRefreshRate(e.target.value)} disabled={!isAdmin} required />
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input type="checkbox" id="enableSparklines" checked={enableSparklines} onChange={e => setEnableSparklines(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                  <label htmlFor="enableSparklines" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                    Habilitar mini-gráficos (Sparklines) nos cards informativos
                  </label>
                </div>
              </div>
            )}

            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Gestão de Projetos & Kanban</h3>

                <div className="input-group">
                  <label className="input-label">Fases de Lista Padrão (Novos Projetos)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input type="text" className="input-field" placeholder="Adicionar nova fase..." value={newProjectList} onChange={e => setNewProjectList(e.target.value)} disabled={!isAdmin} />
                    <button type="button" className="btn btn-secondary" onClick={handleAddProjectList} disabled={!isAdmin}><Plus size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {defaultProjectLists.map((list, idx) => (
                      <span key={idx} className="tag-pill">
                        {list}
                        {isAdmin && (
                          <button type="button" className="tag-remove-btn" onClick={() => handleRemoveProjectList(idx)}>
                            <X size={12} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input type="checkbox" id="allowTaskSelfAssign" checked={allowTaskSelfAssign} onChange={e => setAllowTaskSelfAssign(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                  <label htmlFor="allowTaskSelfAssign" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                    Permitir que membros se auto-atribuam tarefas
                  </label>
                </div>
              </div>
            )}

            {/* TICKETS TAB */}
            {activeTab === 'tickets' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Central de Chamados & Regras de SLA</h3>

                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.5rem 0' }}>Prazos Limites de Resolução (SLA em horas)</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="input-group">
                    <label className="input-label">🟢 Prioridade Baixa</label>
                    <input type="number" className="input-field" min="1" max="168" value={slaLowHours} onChange={e => setSlaLowHours(e.target.value)} disabled={!isAdmin} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">🟡 Prioridade Média</label>
                    <input type="number" className="input-field" min="1" max="168" value={slaMediumHours} onChange={e => setSlaMediumHours(e.target.value)} disabled={!isAdmin} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">🟠 Prioridade Alta</label>
                    <input type="number" className="input-field" min="1" max="168" value={slaHighHours} onChange={e => setSlaHighHours(e.target.value)} disabled={!isAdmin} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">🔴 Prioridade Crítica</label>
                    <input type="number" className="input-field" min="1" max="168" value={slaCriticalHours} onChange={e => setSlaCriticalHours(e.target.value)} disabled={!isAdmin} required />
                  </div>
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Configurações de Chat & Colaboração</h3>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '1rem' }}>
                  <input type="checkbox" id="chatFileSharing" checked={chatFileSharing} onChange={e => setChatFileSharing(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                  <label htmlFor="chatFileSharing" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                    Habilitar envio e upload de anexos de arquivos corporativos
                  </label>
                </div>

                <div className="input-group">
                  <label className="input-label">Emojis Permitidos para Reações Rápidas</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input type="text" className="input-field" placeholder="Inserir emoji..." value={newEmoji} onChange={e => setNewEmoji(e.target.value)} disabled={!isAdmin} />
                    <button type="button" className="btn btn-secondary" onClick={handleAddEmoji} disabled={!isAdmin}><Plus size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {chatEmojis.map(emoji => (
                      <span key={emoji} className="tag-pill" style={{ fontSize: '0.95rem' }}>
                        {emoji}
                        {isAdmin && (
                          <button type="button" className="tag-remove-btn" onClick={() => handleRemoveEmoji(emoji)}>
                            <X size={12} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* HELP / KB TAB */}
            {activeTab === 'kb' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Central de Ajuda (Portal de Conhecimento)</h3>

                <div className="input-group">
                  <label className="input-label">Categorias Ativas do Portal</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input type="text" className="input-field" placeholder="Ex: Logística..." value={newKbCategory} onChange={e => setNewKbCategory(e.target.value)} disabled={!isAdmin} />
                    <button type="button" className="btn btn-secondary" onClick={handleAddKbCategory} disabled={!isAdmin}><Plus size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {kbCategories.map(cat => (
                      <span key={cat} className="tag-pill">
                        {cat}
                        {isAdmin && (
                          <button type="button" className="tag-remove-btn" onClick={() => handleRemoveKbCategory(cat)}>
                            <X size={12} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input type="checkbox" id="kbRequireApproval" checked={kbRequireApproval} onChange={e => setKbRequireApproval(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                  <label htmlFor="kbRequireApproval" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                    Exigir aprovação de administrador para publicar artigos
                  </label>
                </div>
              </div>
            )}

            {/* AI TAB */}
            {activeTab === 'ai' && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="settings-section-title">Configurações do Copiloto (IA)</h3>

                <div className="input-group">
                  <label className="input-label">Chave de API do Gemini (Google AI Studio)</label>
                  <input 
                    type="password" 
                    className="input-field" 
                    placeholder="Chave API (AIzaSy...)" 
                    value={geminiApiKey} 
                    onChange={e => setGeminiApiKey(e.target.value)} 
                    disabled={!isAdmin} 
                  />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Utilizado para habilitar o processamento real em linguagem natural do modelo Gemini RAG. Se deixado vazio, usará heurísticas locais de contingência.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="input-group">
                    <label className="input-label">Atraso de Resposta Simulado (ms)</label>
                    <input type="number" className="input-field" min="0" max="10000" step="500" value={aiTypingDelay} onChange={e => setAiTypingDelay(e.target.value)} disabled={!isAdmin} required />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                      Tempo de simulação de digitação antes de responder (Ex: 1500ms).
                    </p>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Máx. Perguntas Investigativas por Turno</label>
                    <input type="number" className="input-field" min="1" max="10" value={aiMaxQuestions} onChange={e => setAiMaxQuestions(e.target.value)} disabled={!isAdmin} required />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                      Limite máximo de perguntas diagnósticas que a IA pode fazer de cada vez.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="checkbox" id="aiHumanMode" checked={aiHumanMode} onChange={e => setAiHumanMode(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                    <label htmlFor="aiHumanMode" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      Modo de Atendimento Humanizado (Conversa Empática e Pessoal)
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="checkbox" id="aiInvestigativeMode" checked={aiInvestigativeMode} onChange={e => setAiInvestigativeMode(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                    <label htmlFor="aiInvestigativeMode" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      Suporte Investigativo e Diagnóstico (Perguntar antes de resolver)
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="checkbox" id="aiMaintainContext" checked={aiMaintainContext} onChange={e => setAiMaintainContext(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                    <label htmlFor="aiMaintainContext" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      Manter Contexto e Histórico Completo da Conversa
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input type="checkbox" id="aiRepeatGreeting" checked={aiRepeatGreeting} onChange={e => setAiRepeatGreeting(e.target.checked)} disabled={!isAdmin} style={{ width: '18px', height: '18px', cursor: isAdmin ? 'pointer' : 'default' }} />
                    <label htmlFor="aiRepeatGreeting" style={{ fontSize: '0.88rem', color: '#fff', cursor: isAdmin ? 'pointer' : 'default', fontWeight: 600 }}>
                      Permitir que a IA se apresente a cada mensagem enviada (se desativado, saúda apenas no contato inicial)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          {isAdmin && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} disabled={saving}>
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}

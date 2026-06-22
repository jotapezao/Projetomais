import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Mail, Zap, Server, Activity, Plus, Database, CheckCircle, X, Users, Edit, Trash2 } from 'lucide-react';
import client from '../api/client';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [backupTests, setBackupTests] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  // Users State
  const [users, setUsers] = useState([]);
  const [userEditing, setUserEditing] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // New Rule / Automation Form State
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState('ticket_created');
  const [newRuleAction, setNewRuleAction] = useState('send_email_client');
  const [newRuleDelay, setNewRuleDelay] = useState(0);

  // Email Config State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [imapUser, setImapUser] = useState('');
  const [imapPassword, setImapPassword] = useState('');

  const [testResult, setTestResult] = useState({ show: false, success: false, message: '' });
  const [saveStatus, setSaveStatus] = useState('');
  const [backupStatus, setBackupStatus] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, emailRes, autoRes, backupRes, emailsRes, usersRes] = await Promise.all([
        client.get('/admin/audit-logs'),
        client.get('/admin/email-settings'),
        client.get('/admin/automations'),
        client.get('/admin/backup/restore-tests'),
        client.get('/emails/simulated'),
        client.get('/admin/users').catch(() => ({ data: [] }))
      ]);
      
      setLogs(logsRes.data);
      setAutomations(autoRes.data);
      setBackupTests(backupRes.data);
      setEmails(emailsRes.data || []);
      setUsers(usersRes.data || []);
      
      if (emailRes.data && emailRes.data.length > 0) {
        const config = emailRes.data[0];
        setSmtpHost(config.smtpHost || '');
        setSmtpPort(config.smtpPort || 587);
        setSmtpSecure(config.smtpSecure || false);
        setSmtpUser(config.smtpUser || '');
        setSmtpPassword('');
        setImapHost(config.imapHost || '');
        setImapPort(config.imapPort || 993);
        setImapSecure(config.imapSecure || false);
        setImapUser(config.imapUser || '');
        setImapPassword('');
      }
    } catch (error) {
      console.error('Erro ao buscar dados admin', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateAutomation = async (e) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    try {
      const payload = {
        name: newRuleName,
        trigger: newRuleTrigger,
        action: newRuleAction,
        delayMinutes: Number(newRuleDelay),
        active: true
      };
      const res = await client.post('/admin/automations', payload);
      setAutomations(prev => [...prev, res.data]);
      setShowRuleModal(false);
      setNewRuleName('');
      setNewRuleTrigger('ticket_created');
      setNewRuleAction('send_email_client');
      setNewRuleDelay(0);
    } catch (error) {
      console.error('Erro ao criar regra de automação', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    void init();
  }, [fetchData]);

  const handleSaveEmailSettings = async () => {
    setSaveStatus('Salvando...');
    try {
      await client.post('/admin/email-settings', {
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
        smtpPassword,
        imapHost,
        imapPort: Number(imapPort),
        imapSecure,
        imapUser,
        imapPassword
      });
      setSaveStatus('Configurações salvas com sucesso!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      setSaveStatus('Erro ao salvar configurações.');
    }
  };

  const handleTestConnection = async () => {
    setTestResult({ show: true, success: false, message: 'Testando conexão SMTP...' });
    try {
      const res = await client.post('/admin/email-settings/test', {
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
        smtpPassword
      });
      setTestResult({
        show: true,
        success: res.data.success,
        message: res.data.message
      });
    } catch (error) {
      setTestResult({
        show: true,
        success: false,
        message: error.response?.data?.message || 'Falha ao conectar no servidor SMTP.'
      });
    }
  };

  const handleToggleAutomation = async (auto) => {
    const updatedAuto = { ...auto, active: !auto.active };
    setAutomations(prev => prev.map(a => a.id === auto.id ? updatedAuto : a));
    try {
      await client.put(`/admin/automations/${auto.id}`, updatedAuto);
    } catch (error) {
      console.error('Erro ao atualizar automação', error);
      fetchData();
    }
  };

  const handleRunRestoreTest = async () => {
    setBackupStatus('Iniciando teste de restauração...');
    try {
      const res = await client.post('/admin/backup/restore-test');
      setBackupStatus('Restauração validada com sucesso!');
      setBackupTests(prev => [res.data, ...prev]);
      setTimeout(() => setBackupStatus(''), 4000);
    } catch {
      setBackupStatus('Falha ao rodar teste de restauração.');
      setTimeout(() => setBackupStatus(''), 4000);
    }
  };

  const handleEditUser = (u) => {
    setUserEditing(u);
    setEditRole(u.role);
    setEditStatus(u.status);
  };

  const handleSaveUserEdit = async () => {
    if (!userEditing) return;
    try {
      const res = await client.put(`/admin/users/${userEditing.id}`, {
        role: editRole,
        status: editStatus
      });
      setUsers(prev => prev.map(u => u.id === userEditing.id ? res.data : u));
      setUserEditing(null);
    } catch (error) {
      console.error("Erro ao salvar alteração do usuário", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Deseja realmente excluir este usuário corporativo?")) return;
    try {
      await client.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error("Erro ao excluir usuário", error);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Administração...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Administração do Sistema</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configurações globais, segurança e backups.</p>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, overflow: 'hidden' }}>
        
        {/* Sidebar Menu */}
        <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'logs' ? 'none' : '' }}
            onClick={() => setActiveTab('logs')}
          >
            <Activity size={18} /> Logs de Auditoria
          </button>
          <button 
            className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'email' ? 'none' : '' }}
            onClick={() => setActiveTab('email')}
          >
            <Mail size={18} /> Servidor de E-mails
          </button>
          <button 
            className={`btn ${activeTab === 'emails' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'emails' ? 'none' : '' }}
            onClick={() => setActiveTab('emails')}
          >
            <Mail size={18} /> Log de E-mails
          </button>
          <button 
            className={`btn ${activeTab === 'automations' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'automations' ? 'none' : '' }}
            onClick={() => setActiveTab('automations')}
          >
            <Zap size={18} /> Regras e Automações
          </button>
          <button 
            className={`btn ${activeTab === 'backups' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'backups' ? 'none' : '' }}
            onClick={() => setActiveTab('backups')}
          >
            <Database size={18} /> Banco & Backups
          </button>
          <button 
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'security' ? 'none' : '' }}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} /> Permissões (RBAC)
          </button>
          <button 
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'users' ? 'none' : '' }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} /> Usuários
          </button>
        </div>

        {/* Content Area */}
        <div className="glass-card" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          
          {activeTab === 'logs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Auditoria do Sistema</h2>
                <button className="btn btn-secondary" onClick={fetchData}>Atualizar</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '1rem 0' }}>Data/Hora</th>
                    <th style={{ padding: '1rem 0' }}>Usuário</th>
                    <th style={{ padding: '1rem 0' }}>Ação</th>
                    <th style={{ padding: '1rem 0' }}>Entidade</th>
                    <th style={{ padding: '1rem 0' }}>Endereço IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                      <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '1rem 0', fontWeight: '500' }}>{log.userName}</td>
                      <td style={{ padding: '1rem 0' }}>
                        <span className={`badge ${log.action === 'login' ? 'badge-info' : log.action === 'create' ? 'badge-success' : log.action === 'delete' ? 'badge-danger' : 'badge-warning'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0' }}>{log.entity} <br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.details}</span></td>
                      <td style={{ padding: '1rem 0', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Configuração de E-mails (SMTP/IMAP)</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {saveStatus && <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>{saveStatus}</span>}
                  <button className="btn btn-secondary" onClick={handleTestConnection}>Testar Conexão</button>
                  <button className="btn btn-primary" onClick={handleSaveEmailSettings}>Salvar Configurações</button>
                </div>
              </div>

              {testResult.show && (
                <div className={`badge ${testResult.success ? 'badge-success' : 'badge-danger'}`} style={{ width: '100%', padding: '1rem', marginBottom: '1.5rem', display: 'block', borderRadius: 'var(--radius-md)', textTransform: 'none' }}>
                  {testResult.message}
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* SMTP */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={18}/> Saída (SMTP)</h3>
                  <div className="input-group">
                    <label className="input-label">Servidor SMTP</label>
                    <input type="text" className="input-field" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="mail.example.com" />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="input-label">Porta</label>
                      <input type="number" className="input-field" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input type="checkbox" checked={smtpSecure} onChange={e => setSmtpSecure(e.target.checked)} />
                      <label className="input-label" style={{ margin: 0 }}>Usar SSL/TLS</label>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Usuário</label>
                    <input type="text" className="input-field" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="smtp@example.com" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha</label>
                    <input type="password" className="input-field" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder="******" />
                  </div>
                </div>

                {/* IMAP */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={18}/> Entrada (IMAP)</h3>
                  <div className="input-group">
                    <label className="input-label">Servidor IMAP</label>
                    <input type="text" className="input-field" value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.example.com" />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label className="input-label">Porta</label>
                      <input type="number" className="input-field" value={imapPort} onChange={e => setImapPort(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                      <input type="checkbox" checked={imapSecure} onChange={e => setImapSecure(e.target.checked)} />
                      <label className="input-label" style={{ margin: 0 }}>Usar SSL/TLS</label>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Usuário</label>
                    <input type="text" className="input-field" value={imapUser} onChange={e => setImapUser(e.target.value)} placeholder="imap@example.com" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha</label>
                    <input type="password" className="input-field" value={imapPassword} onChange={e => setImapPassword(e.target.value)} placeholder="******" />
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'emails' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>E-mails Simulados Enviados</h2>
                <button className="btn btn-secondary" onClick={fetchData}>Atualizar</button>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Estes são os e-mails que foram disparados pelas regras de automação configuradas no sistema.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {emails.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Nenhum e-mail enviado ainda.
                  </div>
                ) : (
                  emails.map(email => (
                    <div key={email.id} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <strong>Para:</strong> <code style={{ color: 'var(--accent-primary)' }}>{email.to}</code>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(email.sentAt || email.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>{email.subject}</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', background: 'hsla(var(--border), 0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', margin: 0 }}>
                        {email.body}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                        <span style={{ color: email.status === 'sent' || email.status === 'success' ? 'var(--success-light)' : 'var(--danger)' }}>
                          Status: {email.status === 'sent' || email.status === 'success' ? '✔ Enviado' : '✖ Falhou'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>ID: {email.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'automations' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Regras de Automação Ativas</h2>
                <button className="btn btn-primary" onClick={() => setShowRuleModal(true)}><Plus size={18} /> Nova Regra</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {automations.map(auto => (
                  <div key={auto.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{auto.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Gatilho: <strong style={{ color: '#fff' }}>{auto.trigger}</strong> | Ação: <strong style={{ color: '#fff' }}>{auto.action}</strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className={`badge ${auto.active ? 'badge-success' : 'badge-danger'}`}>
                        {auto.active ? 'Ativa' : 'Inativa'}
                      </span>
                      <button 
                        className={`btn ${auto.active ? 'btn-secondary' : 'btn-primary'}`} 
                        onClick={() => handleToggleAutomation(auto)}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                      >
                        {auto.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'backups' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Segurança & Backups do PostgreSQL</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Políticas de backup diário e histórico de testes de restauração de desastre.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {backupStatus && <span style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>{backupStatus}</span>}
                  <button className="btn btn-primary" onClick={handleRunRestoreTest}><Database size={16} /> Validar Teste de Restauração</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', height: 'fit-content' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Políticas Vigentes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Frequência de Backup:</span>
                      <strong>Diário (03:00 AM)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Destino / Storage:</span>
                      <strong>Amazon S3 (modaverao-backups)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Retenção:</span>
                      <strong>30 dias</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Criptografia:</span>
                      <strong>AES-256</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Histórico de Validação de Restauração</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {backupTests.map(test => (
                      <div key={test.id} className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-light)', fontWeight: '500', fontSize: '0.9rem' }}>
                            <CheckCircle size={16} /> Restauração com Sucesso
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(test.date).toLocaleString()}</span>
                        </div>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {test.comment}
                        </p>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Tamanho do Dump: <strong>{test.sizeMB} MB</strong></span>
                          <span>Verificado por: <strong>{test.verifiedBy}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Controle de Acesso (RBAC) & Segurança</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Configurações de Acesso</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                      <h4 style={{ fontSize: '0.95rem', margin: 0 }}>MFA (Autenticação de Dois Fatores)</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Estrutura pronta para evolução. O segundo fator ainda deve ser conectado a um provedor real de código ou app autenticador.</p>
                  </div>
                    <span className="badge badge-warning">Planejado</span>
                </div>
              </div>

                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3>Matriz de Permissões Corporativas</h3>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    <strong>System Admin:</strong> Acesso total à infraestrutura e banco.<br/>
                    <strong>Team Admin:</strong> Gerenciamento de canais de comunicação e controle de usuários.<br/>
                    <strong>Channel Admin:</strong> Moderação do processo corporativo.<br/>
                    <strong>Membro:</strong> Participação ativa em threads e abertura de chamados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Gestão de Usuários Corporativos</h2>
                <button className="btn btn-secondary" onClick={fetchData}>Atualizar</button>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Gerencie permissões (cargos) e o status das contas de funcionários cadastrados na sua organização.
              </p>
              
              <div className="table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '1rem 0.5rem' }}>Nome Completo</th>
                      <th style={{ padding: '1rem 0.5rem' }}>E-mail</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Cargo</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '1rem 0.5rem' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{u.name} {u.lastName}</td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                            {u.role?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                            {u.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.5rem', border: 'none', background: 'transparent' }}
                              onClick={() => handleEditUser(u)}
                            >
                              <Edit size={16} color="var(--accent-primary)" />
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.5rem', border: 'none', background: 'transparent' }}
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              <Trash2 size={16} color="var(--danger)" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* CREATE AUTOMATION MODAL */}
      {showRuleModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowRuleModal(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Criar Regra de Automação</h2>
            
            <form onSubmit={handleCreateAutomation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Nome da Regra</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newRuleName} 
                  onChange={e => setNewRuleName(e.target.value)} 
                  placeholder="Ex: Notificar Cliente Abertura" 
                  required 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Gatilho (Trigger)</label>
                <select className="input-field" value={newRuleTrigger} onChange={e => setNewRuleTrigger(e.target.value)}>
                  <option value="ticket_created">Abertura de Chamado</option>
                  <option value="ticket_priority_critical">Chamado Crítico (SLA)</option>
                  <option value="task_status_changed">Alteração de Status de Tarefa</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Ação (Action)</label>
                <select className="input-field" value={newRuleAction} onChange={e => setNewRuleAction(e.target.value)}>
                  <option value="send_email_client">Enviar E-mail para Cliente</option>
                  <option value="send_email_manager">Enviar E-mail para Gestor</option>
                  <option value="create_log">Criar Log de Eventos</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Carência / Atraso (minutos)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={newRuleDelay} 
                  onChange={e => setNewRuleDelay(e.target.value)} 
                  min="0"
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRuleModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Regra</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT USER MODAL */}
      {userEditing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setUserEditing(null)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Editar Usuário Corporativo</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <strong style={{ display: 'block', fontSize: '1rem', color: '#fff' }}>{userEditing.name} {userEditing.lastName}</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{userEditing.email}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Cargo / Permissões</label>
                <select className="input-field" value={editRole} onChange={e => setEditRole(e.target.value)}>
                  <option value="member">Membro</option>
                  <option value="channel_admin">Channel Admin</option>
                  <option value="team_admin">Team Admin</option>
                  <option value="system_admin">System Admin</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Status da Conta</label>
                <select className="input-field" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                  <option value="active">🟢 Ativo</option>
                  <option value="inactive">🔴 Inativo (Bloqueado)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUserEditing(null)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveUserEdit}>Salvar Alterações</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

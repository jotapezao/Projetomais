import { useState, useEffect } from 'react';
import { Settings, Shield, Mail, Zap, Server, Activity } from 'lucide-react';
import client from '../api/client';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('logs');
  const [logs, setLogs] = useState([]);
  const [emailConfig, setEmailConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, emailRes] = await Promise.all([
          client.get('/admin/audit-logs'),
          client.get('/admin/email-settings')
        ]);
        setLogs(logsRes.data);
        if (emailRes.data.length > 0) {
          setEmailConfig(emailRes.data[0]);
        }
      } catch (error) {
        console.error('Erro ao buscar dados admin', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Administração...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Administração do Sistema</h1>
        <p style={{ color: 'hsl(var(--text-secondary))' }}>Configurações globais, segurança e integrações.</p>
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
            className={`btn ${activeTab === 'automations' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'automations' ? 'none' : '' }}
            onClick={() => setActiveTab('automations')}
          >
            <Zap size={18} /> Regras e Automações
          </button>
          <button 
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', border: activeTab === 'security' ? 'none' : '' }}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={18} /> Permissões
          </button>
        </div>

        {/* Content Area */}
        <div className="glass-card" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          
          {activeTab === 'logs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Auditoria do Sistema</h2>
                <button className="btn btn-secondary">Exportar CSV</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
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
                      <td style={{ padding: '1rem 0', color: 'hsl(var(--text-secondary))' }}>{new Date(log.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '1rem 0', fontWeight: '500' }}>{log.userName}</td>
                      <td style={{ padding: '1rem 0' }}>
                        <span className={`badge ${log.action === 'login' ? 'badge-info' : log.action === 'create' ? 'badge-success' : log.action === 'delete' ? 'badge-danger' : 'badge-warning'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0' }}>{log.entity} <br/><span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{log.details}</span></td>
                      <td style={{ padding: '1rem 0', fontFamily: 'monospace', color: 'hsl(var(--text-muted))' }}>{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'email' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Configuração de E-mails (SMTP/POP/IMAP)</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-secondary">Testar Conexão</button>
                  <button className="btn btn-primary">Salvar Configurações</button>
                </div>
              </div>
              
              {emailConfig ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  
                  {/* SMTP */}
                  <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--bg-secondary))' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={18}/> Saída (SMTP)</h3>
                    <div className="input-group">
                      <label className="input-label">Servidor SMTP</label>
                      <input type="text" className="input-field" defaultValue={emailConfig.smtpHost} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Porta</label>
                        <input type="number" className="input-field" defaultValue={emailConfig.smtpPort} />
                      </div>
                      <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <input type="checkbox" defaultChecked={emailConfig.smtpSecure} />
                        <label className="input-label" style={{ margin: 0 }}>Usar SSL/TLS</label>
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Usuário</label>
                      <input type="text" className="input-field" defaultValue={emailConfig.smtpUser} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Senha</label>
                      <input type="password" className="input-field" defaultValue={emailConfig.smtpPassword} />
                    </div>
                  </div>

                  {/* IMAP */}
                  <div className="glass-panel" style={{ padding: '1.5rem', background: 'hsl(var(--bg-secondary))' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={18}/> Entrada (IMAP)</h3>
                    <div className="input-group">
                      <label className="input-label">Servidor IMAP</label>
                      <input type="text" className="input-field" defaultValue={emailConfig.imapHost} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="input-group" style={{ flex: 1 }}>
                        <label className="input-label">Porta</label>
                        <input type="number" className="input-field" defaultValue={emailConfig.imapPort} />
                      </div>
                      <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <input type="checkbox" defaultChecked={emailConfig.imapSecure} />
                        <label className="input-label" style={{ margin: 0 }}>Usar SSL/TLS</label>
                      </div>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Usuário</label>
                      <input type="text" className="input-field" defaultValue={emailConfig.imapUser} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Senha</label>
                      <input type="password" className="input-field" defaultValue={emailConfig.imapPassword} />
                    </div>
                  </div>

                </div>
              ) : (
                <p>Nenhuma configuração encontrada.</p>
              )}
            </div>
          )}

          {activeTab === 'automations' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Regras de Automação</h2>
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <Zap size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>O construtor visual de automações estará disponível na próxima atualização (Módulo IF/THEN).</p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Controle de Acesso (RBAC)</h2>
              <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Gestão de Perfis de Acesso e Permissões Granulares.</p>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}

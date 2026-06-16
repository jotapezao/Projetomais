import { useState, useEffect, useCallback } from 'react';
import { Ticket as TicketIcon, Search, AlertCircle, Clock, CheckCircle, Plus, X, MessageSquare, Shield } from 'lucide-react';
import client from '../api/client';

const readTokenPayload = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

function SLACounter({ ticket }) {
  const [statusText, setStatusText] = useState('');
  const [badgeStyle, setBadgeStyle] = useState({});
  const [badgeClass, setBadgeClass] = useState('badge-info');

  useEffect(() => {
    if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
      setStatusText('✅ SLA Concluído');
      setBadgeClass('badge-success');
      setBadgeStyle({});
      return;
    }

    const updateSLA = () => {
      const now = new Date();
      const limit = new Date(ticket.slaEscalationTime);
      const diffMs = limit - now;

      if (diffMs <= 0) {
        setStatusText('🚨 SLA Violado');
        setBadgeClass('badge-danger');
        setBadgeStyle({
          animation: 'pulse 1.5s infinite',
          fontWeight: '600'
        });
      } else {
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        if (diffMins < 60) {
          setStatusText(`⚠️ Vence em ${mins} min`);
          setBadgeClass('badge-danger');
          setBadgeStyle({
            animation: 'pulse 1s infinite alternate',
            fontWeight: 'bold'
          });
        } else {
          const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
          setStatusText(`⏳ SLA: ${timeStr}`);
          setBadgeClass('badge-info');
          setBadgeStyle({});
        }
      }
    };

    updateSLA();
    const interval = setInterval(updateSLA, 10000); // 10s interval
    return () => clearInterval(interval);
  }, [ticket]);

  return (
    <span className={`badge ${badgeClass}`} style={badgeStyle}>
      {statusText}
    </span>
  );
}

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [user] = useState(() => readTokenPayload());

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Forms
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('media');
  const [newCatName, setNewCatName] = useState('');
  const [newComment, setNewComment] = useState('');

  const fetchTicketsAndCategories = useCallback(async () => {
    try {
      const [ticketRes, catRes] = await Promise.all([
        client.get('/tickets'),
        client.get('/tickets/categories')
      ]);
      setTickets(ticketRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0 && !category) {
        setCategory(catRes.data[0].name);
      }
    } catch (error) {
      console.error('Erro ao carregar chamados/categorias', error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchTicketsAndCategories();
    });
  }, [fetchTicketsAndCategories]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject || !description || !category) return;

    try {
      await client.post('/tickets', {
        subject,
        description,
        category,
        priority
      });
      setShowCreateModal(false);
      setSubject('');
      setDescription('');
      fetchTicketsAndCategories();
    } catch (error) {
      console.error('Erro ao abrir chamado', error);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await client.post('/tickets/categories', { name: newCatName });
      setNewCatName('');
      fetchTicketsAndCategories();
    } catch (error) {
      console.error('Erro ao criar categoria', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      await client.delete(`/tickets/categories/${id}`);
      fetchTicketsAndCategories();
    } catch (error) {
      console.error('Erro ao excluir categoria', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;

    try {
      const res = await client.post(`/tickets/${selectedTicket.id}/comments`, { content: newComment });
      setNewComment('');
      setSelectedTicket(res.data);
      // Refresh list
      setTickets(prev => prev.map(t => t.id === res.data.id ? res.data : t));
    } catch (error) {
      console.error('Erro ao enviar comentário', error);
    }
  };

  const handleStatusChange = async (ticketId, status, logComment = '') => {
    const id = ticketId || selectedTicket?.id;
    if (!id) return;
    try {
      const res = await client.patch(`/tickets/${id}/status`, {
        status,
        comment: logComment || `Status atualizado para ${status.replace('_', ' ')}`
      });
      if (selectedTicket && selectedTicket.id === id) {
        setSelectedTicket(res.data);
      }
      setTickets(prev => prev.map(t => t.id === id ? res.data : t));
    } catch (error) {
      console.error('Erro ao alterar status', error);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Central de Chamados...</div>;

  const isAdmin = user && ['super_admin', 'admin', 'gestor'].includes(user.role);

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'todos' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Central de Chamados</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Acompanhamento de incidentes, SLAs de suporte e triagem.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)}>
              <Shield size={18} /> Categorias
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <TicketIcon size={18} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ margin: 0, flex: 1, minWidth: '250px', flexDirection: 'row', alignItems: 'center', background: 'hsl(var(--bg-card))', padding: '0 1rem', borderRadius: 'var(--radius-full)' }}>
          <Search size={18} color="hsl(var(--text-muted))" />
          <input 
            type="text" 
            placeholder="Pesquisar por assunto ou ID..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.75rem', outline: 'none', color: '#fff' }} 
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`btn ${filter === 'todos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('todos')}>Todos</button>
          <button className={`btn ${filter === 'novo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('novo')}>Novos</button>
          <button className={`btn ${filter === 'em_atendimento' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('em_atendimento')}>Em Atendimento</button>
          <button className={`btn ${filter === 'resolvido' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('resolvido')}>Resolvidos</button>
        </div>
      </div>

      {/* Tickets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTickets.map(ticket => (
          <div key={ticket.id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', padding: '1.5rem', alignItems: 'center' }}>
            
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              background: ticket.priority === 'critica' ? 'hsla(var(--danger), 0.15)' : 'hsla(var(--info), 0.15)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <TicketIcon size={24} color={ticket.priority === 'critica' ? 'hsl(var(--danger))' : 'hsl(var(--info))'} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{ticket.subject}</h3>
                <span className={`badge ${ticket.status === 'resolvido' ? 'badge-success' : 'badge-warning'}`}>{ticket.status.replace('_', ' ')}</span>
                <SLACounter ticket={ticket} />
              </div>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{ticket.description}</p>
              
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} /> SLA Limite: {new Date(ticket.slaEscalationTime).toLocaleString()}
                </span>
                <span>Categoria: {ticket.category}</span>
                <span>ID: {ticket.id}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedTicket(ticket)} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Detalhes & Histórico</button>
              {ticket.status !== 'resolvido' && ticket.status !== 'fechado' && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleStatusChange(ticket.id, 'resolvido', 'Chamado resolvido pelo operador.')}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'hsl(var(--success))' }}
                >
                  <CheckCircle size={14} /> Resolver
                </button>
              )}
            </div>

          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
            <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum chamado encontrado.</p>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowCreateModal(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Abrir Novo Chamado</h2>
            
            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Assunto / Título</label>
                <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: VPN não conecta" required />
              </div>
              <div className="input-group">
                <label className="input-label">Categoria</label>
                <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} required>
                  {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Prioridade</label>
                <select className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="baixa">Baixa (Até 48h)</option>
                  <option value="media">Média (Até 24h)</option>
                  <option value="alta">Alta (Até 12h)</option>
                  <option value="critica">Crítica (Até 4h - Alerta de SLA)</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Descrição detalhada</label>
                <textarea className="input-field" style={{ height: '120px' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o problema com o máximo de detalhes possível..." required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Abrir Chamado</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowCategoryModal(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Gerenciar Categorias</h2>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input type="text" className="input-field" placeholder="Nova Categoria..." value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              <button type="submit" className="btn btn-primary"><Plus size={18} /></button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-md)' }}>
                  <span>{cat.name}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.25rem', border: 'none', color: 'hsl(var(--danger))' }} onClick={() => handleDeleteCategory(cat.id)}>Excluir</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setSelectedTicket(null)}>
              <X size={24} />
            </button>
            
            <div style={{ borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-info">{selectedTicket.category}</span>
                <span className={`badge ${selectedTicket.priority === 'critica' ? 'badge-danger' : 'badge-warning'}`}>Prioridade: {selectedTicket.priority}</span>
                <span className="badge">{selectedTicket.status}</span>
              </div>
              <h2 style={{ margin: 0 }}>{selectedTicket.subject}</h2>
              <p style={{ color: 'hsl(var(--text-secondary))', marginTop: '0.75rem', fontSize: '0.95rem' }}>{selectedTicket.description}</p>
            </div>

            {/* Scrollable details columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', overflowY: 'auto', paddingBottom: '1rem' }}>
              
              {/* Left Side: Comments & Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Timeline / History */}
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Histórico do Chamado</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid hsl(var(--border))', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                    {selectedTicket.history?.map((h, i) => (
                      <div key={i} style={{ position: 'relative', fontSize: '0.85rem' }}>
                        <div style={{ position: 'absolute', left: '-1.45rem', top: '0.25rem', width: '10px', height: '10px', borderRadius: '50%', background: 'hsl(var(--accent-primary))' }} />
                        <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.75rem' }}>{new Date(h.updatedAt).toLocaleString()} | Por: {h.userName || 'Sistema'}</div>
                        <div style={{ fontWeight: '500' }}>{h.comment}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comments List */}
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={18} /> Respostas ({selectedTicket.comments?.length || 0})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {selectedTicket.comments?.map(c => (
                      <div key={c.id} style={{ padding: '0.75rem 1rem', background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'hsl(var(--accent-primary))' }}>{c.userName}</span>
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))' }}>{c.content}</div>
                      </div>
                    ))}
                  </div>

                  {/* Comment Input */}
                  <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" className="input-field" placeholder="Escreva uma resposta..." value={newComment} onChange={e => setNewComment(e.target.value)} required />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem' }}>Enviar</button>
                  </form>
                </div>

              </div>

              {/* Right Side: Quick Actions & Status Control */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '1px solid hsl(var(--border))', paddingLeft: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Gerenciamento</h3>
                  
                  {/* Status Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedTicket.status !== 'em_atendimento' && selectedTicket.status !== 'resolvido' && selectedTicket.status !== 'fechado' && (
                      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleStatusChange(selectedTicket.id, 'em_atendimento', 'Atendimento iniciado.')}>
                        Iniciar Atendimento
                      </button>
                    )}
                    {selectedTicket.status !== 'resolvido' && selectedTicket.status !== 'fechado' && (
                      <button className="btn btn-primary" style={{ width: '100%', background: 'hsl(var(--success))' }} onClick={() => handleStatusChange(selectedTicket.id, 'resolvido', 'Chamado marcado como resolvido.')}>
                        Resolver Chamado
                      </button>
                    )}
                    {selectedTicket.status === 'resolvido' && (
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleStatusChange(selectedTicket.id, 'fechado', 'Chamado fechado e finalizado.')}>
                        Fechar Chamado
                      </button>
                    )}
                    {(selectedTicket.status === 'resolvido' || selectedTicket.status === 'fechado') && (
                      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleStatusChange(selectedTicket.id, 'em_atendimento', 'Reabertura de chamado.')}>
                        Reabrir Chamado
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding: '1rem', background: 'hsla(var(--border), 0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Aberto por:</strong> {selectedTicket.createdByName}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong>Prazo de Resolução:</strong> {new Date(selectedTicket.slaEscalationTime).toLocaleString()}</div>
                  <div style={{ marginBottom: '0.5rem' }}><strong>ID do Registro:</strong> <code style={{ color: 'hsl(var(--accent-primary))' }}>{selectedTicket.id}</code></div>
                  
                  {(() => {
                    const created = new Date(selectedTicket.createdAt || selectedTicket.history?.[0]?.updatedAt || new Date(new Date(selectedTicket.slaEscalationTime).getTime() - 4 * 60 * 60 * 1000));
                    const limit = new Date(selectedTicket.slaEscalationTime);
                    const now = new Date();
                    const total = limit - created;
                    const elapsed = now - created;
                    
                    let progress = 0;
                    if (total > 0) {
                      progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
                    }
                    
                    const isResolved = selectedTicket.status === 'resolvido' || selectedTicket.status === 'fechado';
                    
                    // Color selection
                    let progressColor = 'hsl(var(--success-light))';
                    if (progress > 85) progressColor = 'hsl(var(--danger))';
                    else if (progress > 50) progressColor = 'hsl(var(--warning))';
                    
                    if (isResolved) {
                      const resolutionEvent = selectedTicket.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
                      const resolvedTime = resolutionEvent ? new Date(resolutionEvent.updatedAt) : now;
                      const violated = resolvedTime > limit;
                      
                      return (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'hsla(var(--border), 0.15)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                            <strong>Status do SLA:</strong>
                            <span style={{ color: violated ? 'hsl(var(--danger))' : 'hsl(var(--success-light))', fontWeight: 'bold' }}>
                              {violated ? '🚨 SLA Violado' : '✅ SLA Cumprido'}
                            </span>
                          </div>
                          <div style={{ height: '6px', background: 'hsla(var(--border), 0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '100%', background: violated ? 'hsl(var(--danger))' : 'hsl(var(--success-light))' }} />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'hsla(var(--border), 0.15)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                          <strong>Progresso do SLA:</strong>
                          <span style={{ color: progressColor, fontWeight: 'bold' }}>{progress}% consumido</span>
                        </div>
                        <div style={{ height: '6px', background: 'hsla(var(--border), 0.5)', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: progressColor, transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>
                          <span>Aberto: {created.toLocaleTimeString()}</span>
                          <span>Prazo: {limit.toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

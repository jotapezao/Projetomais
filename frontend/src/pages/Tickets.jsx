import { useState, useEffect } from 'react';
import { Ticket as TicketIcon, Search, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import client from '../api/client';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await client.get('/tickets');
        setTickets(res.data);
      } catch (error) {
        console.error('Erro ao buscar chamados', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Chamados...</div>;

  const filteredTickets = filter === 'todos' 
    ? tickets 
    : tickets.filter(t => t.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Central de Chamados</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Gerencie SLAs, triagem e resolução de incidentes.</p>
        </div>
        <button className="btn btn-primary"><TicketIcon size={18} /> Novo Chamado</button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div className="input-group" style={{ margin: 0, flex: 1, flexDirection: 'row', alignItems: 'center', background: 'hsl(var(--bg-card))', padding: '0 1rem', borderRadius: 'var(--radius-full)' }}>
          <Search size={18} color="hsl(var(--text-muted))" />
          <input type="text" placeholder="Pesquisar por assunto ou ID..." style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.75rem', outline: 'none', color: '#fff' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${filter === 'todos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('todos')}>Todos</button>
          <button className={`btn ${filter === 'novo' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('novo')}>Novos</button>
          <button className={`btn ${filter === 'em_atendimento' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('em_atendimento')}>Em Atendimento</button>
          <button className={`btn ${filter === 'resolvido' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('resolvido')}>Resolvidos</button>
        </div>
      </div>

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
              </div>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{ticket.description}</p>
              
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} /> SLA: Vence em {new Date(ticket.slaEscalationTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                <span>Categoria: {ticket.category}</span>
                <span>ID: {ticket.id}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>Abrir Detalhes</button>
              {ticket.status !== 'resolvido' && (
                <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'hsl(var(--success))' }}>
                  <CheckCircle size={14} /> Resolver
                </button>
              )}
            </div>

          </div>
        ))}

        {filteredTickets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
            <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum chamado encontrado para este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}

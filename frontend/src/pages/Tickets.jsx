import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Ticket as TicketIcon, Search, AlertCircle, Clock, CheckCircle, Plus, X,
  MessageSquare, Shield, Star, Download, Filter, RefreshCw, User, Tag,
  AlertTriangle, ZapOff, Activity, CheckSquare, Inbox, PlayCircle,
  XCircle, RotateCcw, ChevronDown, Edit3, Save, ArrowRight, BookOpen
} from 'lucide-react';
import client from '../api/client';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ────────────────────────────────────────────────────────────────

const readTokenPayload = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

const PRIORITY_CONFIG = {
  baixa:  { label: 'Baixa',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: '#22c55e' },
  media:  { label: 'Média',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: '#f59e0b' },
  alta:   { label: 'Alta',     color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: '#f97316' },
  critica:{ label: 'Crítica',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: '#ef4444' },
};

const STATUS_CONFIG = {
  novo:          { label: 'Novo',          color: '#60a5fa', icon: Inbox },
  em_atendimento:{ label: 'Em Atendimento',color: '#f59e0b', icon: PlayCircle },
  aguardando:    { label: 'Aguardando',    color: '#a78bfa', icon: Clock },
  resolvido:     { label: 'Resolvido',     color: '#22c55e', icon: CheckCircle },
  fechado:       { label: 'Fechado',       color: '#6b7280', icon: XCircle },
};

const HISTORY_ICONS = {
  created:      { icon: '🔔', label: 'Chamado aberto' },
  attending:    { icon: '▶️', label: 'Atendimento iniciado' },
  resolved:     { icon: '✅', label: 'Resolvido' },
  closed:       { icon: '🔒', label: 'Fechado' },
  waiting:      { icon: '⏸️', label: 'Em espera' },
  comment:      { icon: '💬', label: 'Comentário' },
  assigned:     { icon: '👤', label: 'Atribuído' },
  rated:        { icon: '⭐', label: 'Avaliado' },
  status_change:{ icon: '🔄', label: 'Status alterado' },
};

const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const formatHours = (h) => h == null ? '—' : h < 1 ? `${Math.round(h * 60)}min` : `${h}h`;
const initials = (name = '') => name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

// ─── SLA Badge ───────────────────────────────────────────────────────────────
function SLABadge({ ticket }) {
  const [text, setText] = useState('');
  const [cls, setCls] = useState('');

  useEffect(() => {
    if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
      const resEvent = ticket.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
      const violated = resEvent && new Date(resEvent.updatedAt) > new Date(ticket.slaEscalationTime);
      setText(violated ? '🚨 SLA Violado' : '✅ SLA OK');
      setCls(violated ? 'sla-violated' : 'sla-ok');
      return;
    }
    const update = () => {
      const diff = new Date(ticket.slaEscalationTime) - new Date();
      if (diff <= 0) {
        const elapsed = Math.floor(Math.abs(diff) / 60000);
        const h = Math.floor(elapsed / 60);
        const m = elapsed % 60;
        setText(`🚨 Atrasado (${h}h${m}m)`);
        setCls('sla-violated');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const h = Math.floor(mins / 60); const m = mins % 60;
      const secs = Math.floor((diff % 60000) / 1000);
      if (mins < 60) { setText(`⚠️ Resta ${m}m ${secs}s`); setCls('sla-warning'); }
      else { setText(`⏳ Resta ${h}h ${m}m`); setCls('sla-ok'); }
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [ticket]);

  return <span className={`sla-badge ${cls}`}>{text}</span>;
}

// ─── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          size={20}
          fill={(hovered || value) >= n ? '#f59e0b' : 'transparent'}
          color={(hovered || value) >= n ? '#f59e0b' : 'var(--text-muted)'}
          style={{ cursor: readonly ? 'default' : 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange && onChange(n)}
        />
      ))}
    </div>
  );
}

// ─── SLA Progress Bar ─────────────────────────────────────────────────────────
function SLAProgressBar({ ticket }) {
  const created = new Date(ticket.createdAt || ticket.history?.[0]?.updatedAt || ticket.slaEscalationTime);
  const limit = new Date(ticket.slaEscalationTime);
  const now = new Date();
  const total = limit - created;
  const elapsed = now - created;
  const progress = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
  const isResolved = ticket.status === 'resolvido' || ticket.status === 'fechado';

  const resEvent = ticket.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
  const violated = isResolved && resEvent && new Date(resEvent.updatedAt) > limit;
  const barColor = isResolved
    ? (violated ? '#ef4444' : '#22c55e')
    : progress > 85 ? '#ef4444' : progress > 55 ? '#f97316' : '#22c55e';

  const barGradient = isResolved
    ? (violated ? 'linear-gradient(90deg, #ef4444, #b91c1c)' : 'linear-gradient(90deg, #22c55e, #15803d)')
    : progress > 85
      ? 'linear-gradient(90deg, #ef4444, #f97316)'
      : progress > 55
        ? 'linear-gradient(90deg, #f97316, #eab308)'
        : 'linear-gradient(90deg, #10b981, #10b981)';

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
        <span>Progresso SLA</span>
        <span style={{ color: barColor, fontWeight: 700 }}>
          {isResolved ? (violated ? '🚨 SLA Violado' : '✅ SLA Cumprido') : `${progress}% consumido`}
        </span>
      </div>
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: isResolved ? '100%' : `${progress}%`,
          background: barGradient,
          transition: 'width 0.4s ease',
          borderRadius: '99px',
          boxShadow: `0 0 8px ${barColor}55`
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginTop: '6px', color: 'var(--text-muted)' }}>
        <span>Abertura: {formatDate(created)}</span>
        <span>Prazo: {formatDate(limit)}</span>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color, active, onClick, subtitle }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: '150px',
        padding: '1.25rem',
        borderRadius: '16px',
        background: active ? `${color}22` : 'var(--bg-card)',
        border: `1.5px solid ${active ? color : 'var(--border)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        boxShadow: active ? `0 0 0 2px ${color}44` : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</span>
      </div>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Tickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user] = useState(() => readTokenPayload());

  // Filters
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todas');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [filterOperator, setFilterOperator] = useState('todos');
  const [filterPeriod, setFilterPeriod] = useState('todos');
  const [filterQuick, setFilterQuick] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Create form
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('media');
  const [newCatName, setNewCatName] = useState('');

  // Detail modal state
  const [newComment, setNewComment] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const isAdmin = user && ['super_admin', 'admin', 'gestor', 'system_admin', 'team_admin'].includes(user.role);
  const isStaff = user && ['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'].includes(user.role);

  const loadAll = useCallback(async () => {
    try {
      const [ticketRes, catRes, userRes, statsRes] = await Promise.all([
        client.get('/tickets'),
        client.get('/tickets/categories'),
        client.get('/projects/users'),
        client.get('/tickets/stats').catch(() => ({ data: null })),
      ]);
      setTickets(ticketRes.data);
      setCategories(catRes.data);
      setTeamMembers(userRes.data || []);
      setStats(statsRes.data);
      if (catRes.data.length > 0 && !category) setCategory(catRes.data[0].name);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // When a ticket is selected, prefill edit fields
  useEffect(() => {
    if (selectedTicket) {
      setEditTitle(selectedTicket.subject);
      setEditPriority(selectedTicket.priority);
      setEditCategory(selectedTicket.category);
      setEditDescription(selectedTicket.description);
      setRatingValue(selectedTicket.rating || 0);
      setRatingFeedback(selectedTicket.ratingFeedback || '');
      setEditingTitle(false);
    }
  }, [selectedTicket?.id]);

  // ─── Quick Filter Counts ───────────────────────────────────────────────────
  const quickFilterCounts = useMemo(() => {
    const now = new Date();
    let hoje = 0, semana = 0, atrasados = 0, criticos = 0;

    tickets.forEach(t => {
      const tDate = new Date(t.createdAt || t.history?.[0]?.updatedAt);
      
      // Hoje (same calendar day)
      const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (tDate >= todayCutoff) hoje++;

      // Semana (last 7 days)
      const weekCutoff = new Date(now.getTime() - 7 * 86400000);
      if (tDate >= weekCutoff) semana++;

      // Atrasados
      const isResolved = t.status === 'resolvido' || t.status === 'fechado';
      const isViolated = new Date(t.slaEscalationTime) < now;
      if (!isResolved && isViolated) atrasados++;

      // Criticos
      if (t.priority === 'critica' || t.priority === 'alta') criticos++;
    });

    return { hoje, semana, atrasados, criticos, todos: tickets.length };
  }, [tickets]);

  // ─── Filtered Tickets ──────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter(t => {
      if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
      if (filterPriority !== 'todas' && t.priority !== filterPriority) return false;
      if (filterCategory !== 'todas' && t.category !== filterCategory) return false;
      if (filterOperator !== 'todos') {
        if (filterOperator === 'sem_atribuicao' && t.operatorId) return false;
        if (filterOperator !== 'sem_atribuicao' && t.operatorId !== filterOperator) return false;
      }
      if (filterPeriod !== 'todos') {
        const days = parseInt(filterPeriod);
        const cutoff = new Date(now.getTime() - days * 86400000);
        if (new Date(t.createdAt || t.history?.[0]?.updatedAt) < cutoff) return false;
      }
      if (filterQuick !== 'todos') {
        const tDate = new Date(t.createdAt || t.history?.[0]?.updatedAt);
        if (filterQuick === 'hoje') {
          const todayCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (tDate < todayCutoff) return false;
        } else if (filterQuick === 'semana') {
          const weekCutoff = new Date(now.getTime() - 7 * 86400000);
          if (tDate < weekCutoff) return false;
        } else if (filterQuick === 'atrasados') {
          const isResolved = t.status === 'resolvido' || t.status === 'fechado';
          const isViolated = new Date(t.slaEscalationTime) < now;
          if (isResolved || !isViolated) return false;
        } else if (filterQuick === 'criticos') {
          if (t.priority !== 'critica' && t.priority !== 'alta') return false;
        }
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!t.subject.toLowerCase().includes(s) && !t.id.toLowerCase().includes(s) &&
            !(t.createdByName || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [tickets, filterStatus, filterPriority, filterCategory, filterOperator, filterPeriod, filterQuick, searchTerm]);

  const hasActiveFilters = filterStatus !== 'todos' || filterPriority !== 'todas' ||
    filterCategory !== 'todas' || filterOperator !== 'todos' || filterPeriod !== 'todos' || filterQuick !== 'todos' || searchTerm;

  const clearFilters = () => {
    setFilterStatus('todos'); setFilterPriority('todas'); setFilterCategory('todas');
    setFilterOperator('todos'); setFilterPeriod('todos'); setFilterQuick('todos'); setSearchTerm('');
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject || !description || !category) return;
    try {
      await client.post('/tickets', { subject, description, category, priority });
      setShowCreateModal(false);
      setSubject(''); setDescription('');
      await loadAll();
    } catch (err) { console.error(err); }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await client.post('/tickets/categories', { name: newCatName });
      setNewCatName(''); await loadAll();
    } catch (err) { console.error(err); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Excluir esta categoria?')) return;
    try { await client.delete(`/tickets/categories/${id}`); await loadAll(); } catch (err) { console.error(err); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;
    try {
      const res = await client.post(`/tickets/${selectedTicket.id}/comments`, { content: newComment });
      setNewComment('');
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => t.id === res.data.id ? res.data : t));
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (ticketId, status, logComment = '') => {
    const id = ticketId || selectedTicket?.id;
    if (!id) return;
    try {
      const res = await client.patch(`/tickets/${id}/status`, {
        status, comment: logComment || `Status atualizado para ${status.replace('_', ' ')}`
      });
      if (selectedTicket?.id === id) setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => t.id === id ? res.data : t));
      await loadAll();
    } catch (err) { console.error(err); }
  };

  const handleSaveEdit = async () => {
    if (!selectedTicket) return;
    setSavingEdit(true);
    try {
      const hadOperatorChange = false;
      const updated = {
        ...selectedTicket,
        subject: editTitle,
        priority: editPriority,
        category: editCategory,
        description: editDescription,
      };
      // Log edit to history
      updated.history = [...(updated.history || []), {
        status: updated.status, type: 'status_change',
        updatedAt: new Date().toISOString(), userId: user.id, userName: user.name,
        comment: `Chamado editado: título, prioridade ou descrição alterados`
      }];
      const res = await client.put(`/tickets/${selectedTicket.id}`, updated);
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => t.id === res.data.id ? res.data : t));
      setEditingTitle(false);
    } catch (err) { console.error(err); }
    setSavingEdit(false);
  };

  const handleAssignOperator = async (ticketId, opId) => {
    const targetTicket = tickets.find(t => t.id === ticketId) || selectedTicket;
    if (!targetTicket) return;
    const op = teamMembers.find(m => m.id === opId);
    const operatorName = op ? `${op.name} ${op.lastName}` : null;
    const updated = {
      ...targetTicket, operatorId: opId || null, operatorName: operatorName,
      history: [...(targetTicket.history || []), {
        status: targetTicket.status, type: 'assigned',
        updatedAt: new Date().toISOString(), userId: user.id, userName: user.name,
        comment: opId ? `Chamado atribuído para ${operatorName}` : 'Atribuição removida'
      }]
    };
    try {
      const res = await client.put(`/tickets/${targetTicket.id}`, updated);
      if (selectedTicket?.id === targetTicket.id) {
        setSelectedTicket(res.data);
      }
      setTickets(prev => prev.map(t => t.id === res.data.id ? res.data : t));
      await loadAll();
    } catch (err) { console.error(err); }
  };

  const handleSubmitRating = async () => {
    if (!selectedTicket || !ratingValue) return;
    setSubmittingRating(true);
    try {
      const res = await client.patch(`/tickets/${selectedTicket.id}/rating`, {
        rating: ratingValue, feedback: ratingFeedback
      });
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => t.id === res.data.id ? res.data : t));
    } catch (err) { console.error(err); }
    setSubmittingRating(false);
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Assunto', 'Status', 'Prioridade', 'Categoria', 'Técnico', 'Solicitante', 'Abertura', 'SLA Limite', 'Avaliação'];
    const rows = filteredTickets.map(t => [
      t.id, `"${t.subject}"`, t.status, t.priority, t.category,
      t.operatorName || '', t.createdByName || '',
      formatDate(t.createdAt || t.history?.[0]?.updatedAt),
      formatDate(t.slaEscalationTime),
      t.rating ? `${t.rating}/5` : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `chamados_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem', color: 'var(--text-secondary)' }}>
      <RefreshCw size={24} className="spin" /> Carregando Central de Chamados...
    </div>
  );

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* ── STYLES ─────────────────────────────────────────────────────── */}
      <style>{`
        .sla-badge { padding: 3px 10px; border-radius: 100px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
        .sla-ok { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .sla-warning { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); animation: pulse-badge 1s infinite alternate; }
        .sla-violated { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); animation: pulse-badge 0.8s infinite alternate; }
        @keyframes pulse-badge { from { opacity: 1; } to { opacity: 0.6; } }
        .spin { animation: spin 1.2s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ticket-row { transition: transform 0.15s, box-shadow 0.15s; }
        .ticket-row:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        .filter-chip { padding: 6px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: 1.5px solid transparent; transition: all 0.15s; white-space: nowrap; }
        .filter-chip.active { font-weight: 700; }
        .avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: white; flex-shrink: 0; }
        .comment-bubble { padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.9rem; max-width: 95%; }
        .comment-staff { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.2); margin-left: auto; }
        .comment-client { background: var(--bg-secondary); border: 1px solid var(--border); }
        .timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent-primary); flex-shrink: 0; margin-top: 4px; }
        .inline-input { background: transparent; border: none; border-bottom: 2px solid var(--accent-primary); color: inherit; font-size: inherit; font-weight: inherit; outline: none; width: 100%; padding: 2px 0; }
        .select-field { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); border-radius: 8px; padding: 6px 10px; font-size: 0.82rem; outline: none; }
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <TicketIcon size={28} color="var(--accent-primary)" /> Central de Chamados
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Acompanhamento de incidentes, SLAs e suporte ao cliente.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <>
              <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Exportar CSV
              </button>
              <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> Categorias
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Novo Chamado
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <KPICard label="Total de Chamados" value={stats.total} icon={TicketIcon} color="#60a5fa"
            active={filterStatus === 'todos'} onClick={() => setFilterStatus('todos')} />
          <KPICard label="Novos" value={stats.novo} icon={Inbox} color="#818cf8"
            active={filterStatus === 'novo'} onClick={() => setFilterStatus('novo')} />
          <KPICard label="Em Atendimento" value={stats.em_atendimento} icon={Activity} color="#f59e0b"
            active={filterStatus === 'em_atendimento'} onClick={() => setFilterStatus('em_atendimento')} />
          <KPICard label="Resolvidos" value={stats.resolvido + stats.fechado} icon={CheckSquare} color="#22c55e"
            active={filterStatus === 'resolvido'} onClick={() => setFilterStatus('resolvido')}
            subtitle={stats.slaComplianceRate != null ? `${stats.slaComplianceRate}% no prazo` : null} />
          <KPICard label="SLA Violado" value={stats.slaViolated} icon={ZapOff} color="#ef4444"
            active={filterStatus === 'sla_violated'} onClick={() => { setFilterStatus('todos'); }}
            subtitle={stats.avgResolutionHours != null ? `MTTR: ${formatHours(stats.avgResolutionHours)}` : null} />
        </div>
      )}

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '100px', padding: '0 1rem', border: '1px solid var(--border)' }}>
          <Search size={16} color="var(--text-muted)" />
          <input type="text" placeholder="Pesquisar por assunto, ID ou solicitante..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.65rem 0', outline: 'none', color: 'var(--text-primary)', fontSize: '0.9rem' }} />
          {searchTerm && <X size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />}
        </div>

        {/* Filter Chips Row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={15} color="var(--text-muted)" />

          {/* Status */}
          {['todos', 'novo', 'em_atendimento', 'resolvido', 'fechado'].map(s => {
            const cfg = s === 'todos' ? { label: 'Todos', color: '#60a5fa' } : STATUS_CONFIG[s];
            return (
              <span key={s} className={`filter-chip ${filterStatus === s ? 'active' : ''}`}
                style={{ background: filterStatus === s ? `${cfg.color}20` : 'var(--bg-secondary)', color: filterStatus === s ? cfg.color : 'var(--text-secondary)', borderColor: filterStatus === s ? cfg.color : 'transparent' }}
                onClick={() => setFilterStatus(s)}>
                {cfg.label}
              </span>
            );
          })}

          <span style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }} />

          {/* Priority */}
          <select className="select-field" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="todas">Todas Prioridades</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* Category */}
          <select className="select-field" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="todas">Todas Categorias</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          {/* Operator */}
          {isAdmin && (
            <select className="select-field" value={filterOperator} onChange={e => setFilterOperator(e.target.value)}>
              <option value="todos">Todos os Técnicos</option>
              <option value="sem_atribuicao">Sem Atribuição</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name} {m.lastName}</option>)}
            </select>
          )}

          {/* Period */}
          <select className="select-field" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
            <option value="todos">Todo Período</option>
            <option value="1">Hoje</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <X size={14} /> Limpar Filtros
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Exibindo <strong style={{ color: 'var(--text-primary)' }}>{filteredTickets.length}</strong> de <strong style={{ color: 'var(--text-primary)' }}>{tickets.length}</strong> chamados
        </div>
      </div>

      {/* Quick Temporal Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[
          { id: 'todos', label: 'Todos os Chamados', count: quickFilterCounts.todos, color: 'var(--accent-primary)', bg: 'rgba(99, 102, 241, 0.1)' },
          { id: 'hoje', label: 'Hoje', count: quickFilterCounts.hoje, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
          { id: 'semana', label: 'Esta Semana', count: quickFilterCounts.semana, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
          { id: 'atrasados', label: 'SLA Atrasados', count: quickFilterCounts.atrasados, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', alert: true },
          { id: 'criticos', label: 'Prioridade Alta/Crítica', count: quickFilterCounts.criticos, color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', alert: true }
        ].map(opt => {
          const active = filterQuick === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setFilterQuick(opt.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '24px',
                background: active ? opt.bg : 'var(--bg-secondary)',
                border: `1.5px solid ${active ? opt.color : 'var(--border)'}`,
                color: active ? opt.color : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: active ? 700 : 500,
                transition: 'all 0.2s ease',
                boxShadow: active ? `0 0 12px ${opt.color}25` : 'none',
              }}
              className="quick-filter-pill"
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />
              <span>{opt.label}</span>
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
                background: opt.alert && opt.count > 0 ? '#ef4444' : 'var(--bg-primary)',
                color: opt.alert && opt.count > 0 ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600
              }}>
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── TICKET LIST ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {filteredTickets.map(ticket => {
          const pCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.media;
          const sCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.novo;
          const SIcon = sCfg.icon;
          const opMember = teamMembers.find(m => m.id === ticket.operatorId);
          return (
            <div key={ticket.id} className="glass-card ticket-row"
              style={{ display: 'grid', gridTemplateColumns: '4px 1fr auto', gap: '0', borderRadius: '14px', overflow: 'hidden', cursor: 'default' }}>
              {/* Priority stripe */}
              <div style={{ background: pCfg.color, width: '4px' }} />

              {/* Content */}
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{ticket.subject}</h3>
                    <span style={{ padding: '2px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: `${sCfg.color}20`, color: sCfg.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <SIcon size={12} /> {sCfg.label}
                    </span>
                    <span style={{ padding: '2px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, background: pCfg.bg, color: pCfg.color }}>
                      {pCfg.label}
                    </span>
                    <SLABadge ticket={ticket} />
                  </div>
                  <p style={{ margin: '0 0 0.6rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {ticket.description?.slice(0, 120)}{ticket.description?.length > 120 ? '…' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={12} /> {ticket.category}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatDate(ticket.createdAt || ticket.history?.[0]?.updatedAt)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> {ticket.createdByName || '—'}
                    </span>
                    {ticket.operatorName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar" style={{ background: '#6366f1', width: 22, height: 22, fontSize: '0.6rem' }}>
                          {initials(ticket.operatorName)}
                        </div>
                        {ticket.operatorName}
                      </span>
                    )}
                    {ticket.rating && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                        <Star size={12} fill="#f59e0b" /> {ticket.rating}/5
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.72rem' }}>#{ticket.id.slice(-8)}</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '130px' }}>
                  <button className="btn btn-secondary" onClick={() => setSelectedTicket(ticket)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                    <ArrowRight size={14} /> Abrir
                  </button>
                  {isStaff && ticket.status !== 'resolvido' && ticket.status !== 'fechado' && ticket.operatorId !== user?.id && (
                    <button className="btn btn-secondary" onClick={() => handleAssignOperator(ticket.id, user?.id)}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#818cf8', borderColor: '#818cf840', width: '100%', justifyContent: 'center' }}>
                      <User size={14} /> Assumir
                    </button>
                  )}
                  {ticket.status === 'novo' && isStaff && (
                    <button className="btn btn-secondary" onClick={() => handleStatusChange(ticket.id, 'em_atendimento', 'Atendimento iniciado.')}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', borderColor: '#f59e0b40', width: '100%', justifyContent: 'center' }}>
                      <PlayCircle size={14} /> Iniciar
                    </button>
                  )}
                  {ticket.status !== 'resolvido' && ticket.status !== 'fechado' && isStaff && (
                    <button className="btn btn-primary" onClick={() => handleStatusChange(ticket.id, 'resolvido', 'Chamado resolvido pelo operador.')}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                      <CheckCircle size={14} /> Resolver
                    </button>
                  )}
                  {ticket.status !== 'fechado' && isStaff && (
                    <button className="btn btn-secondary" onClick={() => handleStatusChange(ticket.id, 'fechado', 'Chamado finalizado pelo operador.')}
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef444440', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}>
                      <XCircle size={14} /> Finalizar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTickets.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <AlertCircle size={52} style={{ marginBottom: '1rem', opacity: 0.35 }} />
            <p style={{ fontSize: '1.05rem', margin: 0 }}>Nenhum chamado encontrado com os filtros atuais.</p>
            {hasActiveFilters && <button onClick={clearFilters} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.9rem' }}>Limpar filtros</button>}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CRIAR CHAMADO
      ══════════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '620px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setShowCreateModal(false)}>
              <X size={22} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={20} color="#818cf8" />
              </div>
              <h2 style={{ margin: 0 }}>Abrir Novo Chamado</h2>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Assunto / Título *</label>
                <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Descreva o problema em uma frase..." required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">Categoria *</label>
                  <select className="input-field" value={category} onChange={e => setCategory(e.target.value)} required>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Prioridade</label>
                  <select className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="baixa">🟢 Baixa (até 48h)</option>
                    <option value="media">🟡 Média (até 24h)</option>
                    <option value="alta">🟠 Alta (até 12h)</option>
                    <option value="critica">🔴 Crítica (até 4h)</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Descrição Detalhada *</label>
                <textarea className="input-field" style={{ height: '130px', resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o problema com o máximo de detalhes possível, incluindo passos para reproduzir, impacto e screenshots se necessário..." required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TicketIcon size={16} /> Abrir Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CATEGORIAS
      ══════════════════════════════════════════════════════════════════════ */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => setShowCategoryModal(false)}><X size={22} /></button>
            <h2 style={{ marginBottom: '1.5rem' }}>Gerenciar Categorias</h2>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input type="text" className="input-field" placeholder="Nome da nova categoria..." value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              <button type="submit" className="btn btn-primary"><Plus size={18} /></button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Tag size={14} color="var(--text-muted)" /> {cat.name}</span>
                  <button style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }} onClick={() => handleDeleteCategory(cat.id)}>Excluir</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: DETALHES DO CHAMADO (PREMIUM)
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedTicket && (() => {
        const pCfg = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.media;
        const sCfg = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.novo;
        const SIcon = sCfg.icon;
        const canRate = (selectedTicket.status === 'resolvido' || selectedTicket.status === 'fechado') && !selectedTicket.rating;
        const isResolved = selectedTicket.status === 'resolvido' || selectedTicket.status === 'fechado';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(6px)' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '900px', height: '92vh', display: 'flex', flexDirection: 'column', padding: 0, position: 'relative', overflow: 'hidden', borderRadius: '20px' }}>

              {/* Modal Header */}
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), transparent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '3px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, background: `${sCfg.color}20`, color: sCfg.color, border: `1px solid ${sCfg.color}40`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <SIcon size={12} /> {sCfg.label}
                    </span>
                    <span style={{ padding: '3px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600, background: pCfg.bg, color: pCfg.color, border: `1px solid ${pCfg.color}40` }}>
                      {pCfg.label}
                    </span>
                    <SLABadge ticket={selectedTicket} />
                    {selectedTicket.rating && <span style={{ color: '#f59e0b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} fill="#f59e0b" /> {selectedTicket.rating}/5</span>}
                  </div>
                  <button style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', padding: '6px' }} onClick={() => setSelectedTicket(null)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Editable Title */}
                {editingTitle ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input className="inline-input" style={{ fontSize: '1.3rem', fontWeight: 700 }} value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />
                    <button onClick={handleSaveEdit} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} disabled={savingEdit}>
                      <Save size={14} /> {savingEdit ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setEditingTitle(false)} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>Cancelar</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.3rem', lineHeight: 1.3 }}>{selectedTicket.subject}</h2>
                    {isStaff && (
                      <button onClick={() => setEditingTitle(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }} title="Editar título">
                        <Edit3 size={16} />
                      </button>
                    )}
                  </div>
                )}

                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{selectedTicket.description}</p>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 0.85fr', gap: 0, overflowY: 'hidden' }}>

                {/* LEFT: Timeline + Comments */}
                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', borderRight: '1px solid var(--border)' }}>

                  {/* Timeline */}
                  <div>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      Histórico de Atividades
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', borderLeft: '2px solid var(--border)', paddingLeft: '1.25rem', marginLeft: '0.25rem' }}>
                      {[...(selectedTicket.history || [])].reverse().map((h, i) => {
                        const hCfg = HISTORY_ICONS[h.type] || HISTORY_ICONS.status_change;
                        return (
                          <div key={i} style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-1.65rem', top: '0', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                              {hCfg.icon}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                              {formatDate(h.updatedAt)} · <span style={{ color: 'var(--accent-primary)' }}>{h.userName || 'Sistema'}</span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{h.comment}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comments */}
                  <div>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                      <MessageSquare size={14} style={{ display: 'inline', marginRight: '6px' }} />
                      Respostas ({selectedTicket.comments?.length || 0})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.25rem' }}>
                      {selectedTicket.comments?.map(c => {
                        const isStaffComment = c.isStaff;
                        return (
                          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isStaffComment ? 'flex-end' : 'flex-start' }}>
                            <div className={`comment-bubble ${isStaffComment ? 'comment-staff' : 'comment-client'}`}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                                <div className="avatar" style={{ background: isStaffComment ? '#6366f1' : '#475569', width: 22, height: 22, fontSize: '0.6rem' }}>
                                  {initials(c.userName)}
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isStaffComment ? '#818cf8' : 'var(--text-secondary)' }}>{c.userName}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDate(c.createdAt)}</span>
                              </div>
                              <div style={{ lineHeight: 1.6 }}>{c.content}</div>
                            </div>
                          </div>
                        );
                      })}
                      {(!selectedTicket.comments || selectedTicket.comments.length === 0) && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Nenhuma resposta ainda. Seja o primeiro a responder.</p>
                      )}
                    </div>
                    {!isResolved && (
                      <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input type="text" className="input-field" placeholder="Escreva uma resposta..." value={newComment} onChange={e => setNewComment(e.target.value)} required style={{ flex: 1 }} />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MessageSquare size={14} /> Enviar
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Rating Section */}
                  {(selectedTicket.status === 'resolvido' || selectedTicket.status === 'fechado') && (
                    <div style={{ padding: '1.25rem', background: selectedTicket.rating ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', borderRadius: '12px', border: `1px solid ${selectedTicket.rating ? 'rgba(245,158,11,0.3)' : 'var(--border)'}` }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Star size={15} color="#f59e0b" /> Avaliação do Atendimento
                      </h4>
                      {selectedTicket.rating ? (
                        <div>
                          <StarRating value={selectedTicket.rating} readonly />
                          {selectedTicket.ratingFeedback && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>"{selectedTicket.ratingFeedback}"</p>}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Como foi o seu atendimento?</p>
                          <StarRating value={ratingValue} onChange={setRatingValue} />
                          {ratingValue > 0 && (
                            <>
                              <input type="text" className="input-field" placeholder="Comentário opcional..." value={ratingFeedback} onChange={e => setRatingFeedback(e.target.value)} style={{ fontSize: '0.85rem' }} />
                              <button className="btn btn-primary" onClick={handleSubmitRating} disabled={submittingRating}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', padding: '8px 18px', fontSize: '0.85rem' }}>
                                <Star size={14} /> {submittingRating ? 'Enviando...' : 'Enviar Avaliação'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT: Metadata + Actions */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Actions */}
                  {isStaff && (
                    <div>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Ações Rápidas</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedTicket.status === 'novo' && (
                          <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#f59e0b', borderColor: '#f59e0b40' }}
                            onClick={() => handleStatusChange(selectedTicket.id, 'em_atendimento', 'Atendimento iniciado.')}>
                            <PlayCircle size={15} /> Iniciar Atendimento
                          </button>
                        )}
                        {selectedTicket.status === 'em_atendimento' && (
                          <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#a78bfa', borderColor: '#a78bfa40' }}
                            onClick={() => handleStatusChange(selectedTicket.id, 'aguardando', 'Aguardando retorno do cliente.')}>
                            <Clock size={15} /> Aguardando Cliente
                          </button>
                        )}
                        {!isResolved && (
                          <button className="btn btn-primary" style={{ width: '100%', background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                            onClick={() => handleStatusChange(selectedTicket.id, 'resolvido', 'Chamado marcado como resolvido.')}>
                            <CheckCircle size={15} /> Resolver Chamado
                          </button>
                        )}
                        {selectedTicket.status !== 'fechado' && (
                          <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', color: '#ef4444', borderColor: '#ef444440' }}
                            onClick={() => handleStatusChange(selectedTicket.id, 'fechado', 'Chamado finalizado pelo operador.')}>
                            <XCircle size={15} /> Finalizar Chamado
                          </button>
                        )}
                        {isResolved && (
                          <>
                            <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                              onClick={() => handleStatusChange(selectedTicket.id, 'em_atendimento', 'Chamado reaberto.')}>
                              <RotateCcw size={15} /> Reabrir Chamado
                            </button>
                            <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
                              onClick={() => navigate('/conhecimento', { state: { prefillFromTicket: selectedTicket } })}>
                              <BookOpen size={15} /> Gerar Artigo de Ajuda
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit Fields */}
                  {isStaff && (
                    <div>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Editar Chamado</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Prioridade</label>
                          <select className="select-field" style={{ width: '100%' }} value={editPriority} onChange={e => setEditPriority(e.target.value)}>
                            <option value="baixa">🟢 Baixa</option>
                            <option value="media">🟡 Média</option>
                            <option value="alta">🟠 Alta</option>
                            <option value="critica">🔴 Crítica</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Categoria</label>
                          <select className="select-field" style={{ width: '100%' }} value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        {(editPriority !== selectedTicket.priority || editCategory !== selectedTicket.category) && (
                          <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '0.82rem' }}>
                            <Save size={14} /> {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Operator Assignment */}
                  {isStaff && (
                    <div>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Atribuição</h4>
                      {selectedTicket.operatorName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)' }}>
                          <div className="avatar" style={{ background: '#6366f1' }}>{initials(selectedTicket.operatorName)}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedTicket.operatorName}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select className="select-field" style={{ flex: 1 }} value={selectedTicket.operatorId || ''} onChange={e => handleAssignOperator(selectedTicket.id, e.target.value)}>
                          <option value="">Sem atribuição</option>
                          {teamMembers
                            .filter(m => ['super_admin', 'admin', 'gestor', 'coordenador', 'operador', 'system_admin', 'team_admin', 'channel_admin'].includes(m.role))
                            .map(m => <option key={m.id} value={m.id}>{m.name} {m.lastName} ({m.role?.replace('_', ' ')})</option>)}
                        </select>
                        {selectedTicket.operatorId !== user?.id && (
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => handleAssignOperator(selectedTicket.id, user?.id)}>
                            Atribuir a mim
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SLA */}
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>SLA</h4>
                    <SLAProgressBar ticket={selectedTicket} />
                  </div>

                  {/* Metadata */}
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Informações</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Solicitante</span>
                      <span style={{ fontWeight: 600 }}>{selectedTicket.createdByName || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Abertura</span>
                      <span>{formatDate(selectedTicket.createdAt || selectedTicket.history?.[0]?.updatedAt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Categoria</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={12} /> {selectedTicket.category}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ID do Registro</span>
                      <code style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}>#{selectedTicket.id.slice(-10)}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  Briefcase,
  CheckSquare,
  Ticket,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  User,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import client from '../api/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function StatCard({ title, value, icon: Icon, colorClass, subtitle, trend }) {
  const isUp = trend?.startsWith('+') || trend?.startsWith('↗');
  const isDown = trend?.startsWith('-') || trend?.startsWith('↘');
  const trendColor = isUp ? 'var(--success-light)' : isDown ? 'var(--danger)' : 'var(--accent-primary)';
  
  // Custom Sparkline paths
  const sparklineData = isDown 
    ? 'M0,10 L10,12 L20,8 L30,16 L40,14 L50,22 L60,18 L70,24' 
    : isUp 
      ? 'M0,22 L10,18 L20,14 L30,16 L40,8 L50,10 L60,4 L70,2' 
      : 'M0,15 L10,12 L20,14 L30,10 L40,12 L50,8 L60,10 L70,7';

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
          <Icon size={18} style={{ color: colorClass === 'badge-danger' ? 'var(--danger)' : colorClass === 'badge-success' ? 'var(--success-light)' : 'var(--accent-primary)' }} />
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</h3>
        {trend && (
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: trendColor, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            {isUp ? <ArrowUpRight size={14} /> : isDown ? <ArrowDownRight size={14} /> : null} {trend}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</span>
        
        {/* Sparkline inline SVG graph */}
        <svg width="70" height="26" style={{ overflow: 'visible', stroke: trendColor, strokeWidth: 1.8, fill: 'none' }}>
          <path d={sparklineData} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [timeFilter, setTimeFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [projectFilter, setProjectFilter] = useState('todos');

  // Drill-down State
  const [selectedCard, setSelectedCard] = useState(null);

  const fetchSummary = async () => {
    try {
      const res = await client.get('/dashboard/summary');
      setSummary(res.data);
    } catch (error) {
      console.error('Erro ao carregar resumo executivo', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-primary)' }}>Carregando dados executivos...</div>;

  const projects = summary?.raw?.projects || [];
  const tasks = summary?.raw?.tasks || [];
  const tickets = summary?.raw?.tickets || [];
  const users = summary?.raw?.users || [];

  // Time Filter Helper
  const filterByTime = (itemDateStr) => {
    if (timeFilter === 'todos') return true;
    const itemDate = new Date(itemDateStr);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - Number(timeFilter));
    return itemDate >= limitDate;
  };

  // Filter lists
  const filteredTickets = tickets.filter(ticket => {
    const matchesTime = filterByTime(ticket.createdAt);
    const matchesPriority = priorityFilter === 'todos' || ticket.priority === priorityFilter;
    return matchesTime && matchesPriority;
  });

  const filteredTasks = tasks.filter(task => {
    const matchesTime = filterByTime(task.createdAt || task.startDate);
    const matchesPriority = priorityFilter === 'todos' || task.priority === priorityFilter;
    const matchesProject = projectFilter === 'todos' || task.projectId === projectFilter;
    return matchesTime && matchesPriority && matchesProject;
  });

  const filteredProjects = projects.filter(project => {
    const matchesTime = filterByTime(project.createdAt || new Date());
    const matchesProject = projectFilter === 'todos' || project.id === projectFilter;
    return matchesTime && matchesProject;
  });

  // Dynamic calculations
  const pendingTasksCount = filteredTasks.filter(t => !['concluida', 'concluído', 'fechada'].includes(String(t.status || '').toLowerCase())).length;
  const overdueTasksCount = filteredTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !['concluida', 'concluído', 'fechada'].includes(String(t.status || '').toLowerCase())).length;
  
  const openTicketsCount = filteredTickets.filter(t => !['resolvido', 'fechado', 'encerrado'].includes(String(t.status || '').toLowerCase())).length;
  const resolvedTicketsList = filteredTickets.filter(t => ['resolvido', 'fechado', 'encerrado'].includes(String(t.status || '').toLowerCase()));

  // SLA calculations
  const slaTickets = filteredTickets.filter(ticket => ticket.slaEscalationTime);
  const slaOnTimeTickets = slaTickets.filter(ticket => {
    const limit = new Date(ticket.slaEscalationTime);
    if (['resolvido', 'fechado', 'encerrado'].includes(String(ticket.status || '').toLowerCase())) {
      const resolvedEvent = ticket.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
      const resolvedAt = resolvedEvent ? new Date(resolvedEvent.updatedAt) : new Date(ticket.updatedAt || ticket.createdAt);
      return resolvedAt <= limit;
    }
    return new Date() <= limit;
  });
  const slaRate = slaTickets.length > 0 ? Math.round((slaOnTimeTickets.length / slaTickets.length) * 100) : 100;

  // MTTR Calculations
  let mttrText = '0m';
  if (resolvedTicketsList.length > 0) {
    let totalMs = 0;
    resolvedTicketsList.forEach(ticket => {
      const created = new Date(ticket.createdAt);
      const resolvedEvent = ticket.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
      const resolvedAt = resolvedEvent ? new Date(resolvedEvent.updatedAt) : new Date(ticket.updatedAt || ticket.createdAt);
      totalMs += Math.max(0, resolvedAt - created);
    });
    const avgMs = totalMs / resolvedTicketsList.length;
    const avgMins = Math.floor(avgMs / 60000);
    const hours = Math.floor(avgMins / 60);
    const mins = avgMins % 60;
    mttrText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  // Technicians loading computations
  const technicianMap = {};
  filteredTickets.forEach(ticket => {
    const opName = ticket.operatorName || 'Não atribuído';
    if (!technicianMap[opName]) {
      technicianMap[opName] = { name: opName, total: 0, open: 0, resolved: 0, slaViolated: 0 };
    }
    technicianMap[opName].total++;
    const isResolved = ['resolvido', 'fechado', 'encerrado'].includes(String(ticket.status || '').toLowerCase());
    if (isResolved) {
      technicianMap[opName].resolved++;
    } else {
      technicianMap[opName].open++;
    }

    const limit = new Date(ticket.slaEscalationTime);
    if (isResolved) {
      const resolvedEvent = ticket.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
      const resolvedAt = resolvedEvent ? new Date(resolvedEvent.updatedAt) : new Date(ticket.updatedAt || ticket.createdAt);
      if (resolvedAt > limit) technicianMap[opName].slaViolated++;
    } else {
      if (new Date() > limit) technicianMap[opName].slaViolated++;
    }
  });
  const technicianData = Object.values(technicianMap);

  // Chart configs
  const listCounts = filteredTasks.reduce((acc, t) => {
    const listName = t.list || 'Sem lista';
    acc[listName] = (acc[listName] || 0) + 1;
    return acc;
  }, {});
  const tasksChartData = {
    labels: Object.keys(listCounts),
    datasets: [{
      label: 'Tarefas por Etapa',
      data: Object.values(listCounts),
      backgroundColor: 'rgba(99, 102, 241, 0.65)',
      borderColor: '#6366f1',
      borderWidth: 1.5,
      borderRadius: 6
    }]
  };

  const statusCounts = filteredTickets.reduce((acc, t) => {
    const s = t.status || 'novo';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const ticketsChartData = {
    labels: Object.keys(statusCounts).map(s => s.replace('_', ' ')),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        'rgba(59, 130, 246, 0.75)',
        'rgba(245, 158, 11, 0.75)',
        'rgba(16, 185, 129, 0.75)',
        'rgba(239, 68, 68, 0.75)'
      ],
      borderWidth: 0
    }]
  };

  const techChartOptions = {
    responsive: true,
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: 'var(--text-secondary)' } }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'var(--text-muted)' } },
      y: { grid: { display: false }, ticks: { color: 'var(--text-muted)' } }
    }
  };

  const techChartData = {
    labels: technicianData.map(t => t.name),
    datasets: [
      {
        label: 'Chamados Abertos',
        data: technicianData.map(t => t.open),
        backgroundColor: 'rgba(245, 158, 11, 0.75)',
        borderWidth: 0
      },
      {
        label: 'Chamados Resolvidos',
        data: technicianData.map(t => t.resolved),
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderWidth: 0
      }
    ]
  };

  // IA Recommendations logic
  const aiActions = [];

  const criticalUnassigned = filteredTickets.filter(t => t.priority === 'critica' && !t.operatorId && !['resolvido', 'fechado'].includes(t.status));
  criticalUnassigned.forEach(t => {
    aiActions.push({
      id: `ai-t-${t.id}`,
      type: 'danger',
      title: 'Urgente Sem Técnico',
      description: `Chamado crítico #${t.id.slice(-6)} ("${t.subject}") está aguardando técnico.`,
      recommendation: `Atribuir a equipe de suporte em "${t.category}". Risco de violação do SLA de 85%.`
    });
  });

  const overdueTasksList = filteredTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && !['concluida', 'concluído', 'fechada'].includes(String(t.status || '').toLowerCase()));
  overdueTasksList.slice(0, 2).forEach(t => {
    aiActions.push({
      id: `ai-tk-${t.id}`,
      type: 'warning',
      title: 'Prazo Limite Excedido',
      description: `Tarefa "${t.title}" do projeto "${projects.find(p => p.id === t.projectId)?.name || 'Geral'}" estourou a data limite em ${new Date(t.deadline).toLocaleDateString()}.`,
      recommendation: 'Reorganizar prazos ou reatribuir atividade para evitar atraso da entrega.'
    });
  });

  if (aiActions.length === 0) {
    aiActions.push({
      id: 'ai-def-1',
      type: 'success',
      title: 'Tudo Sob Controle',
      description: 'Todas as atividades corporativas e SLAs ativos da Lojas Moda Verão estão dentro dos prazos limites regulamentares.',
      recommendation: 'Nenhuma ação corretiva de IA recomendada no momento.'
    });
  }

  // Detailed Tables Renderer
  const renderDetailedTable = () => {
    if (!selectedCard) return null;

    if (selectedCard === 'projects') {
      return (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>Código</th>
                <th style={{ padding: '0.75rem' }}>Projeto</th>
                <th style={{ padding: '0.75rem' }}>Progresso das Atividades</th>
                <th style={{ padding: '0.75rem' }}>Gerente</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map(p => {
                const projTasks = tasks.filter(t => t.projectId === p.id);
                const totalT = projTasks.length;
                const doneT = projTasks.filter(t => ['concluida', 'concluído', 'fechada'].includes(String(t.status || '').toLowerCase())).length;
                const pct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;
                const manager = users.find(u => u.id === p.managerId);
                
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{p.code}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <strong>{p.name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description}</div>
                    </td>
                    <td style={{ padding: '0.75rem', width: '250px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>{doneT}/{totalT} tarefas</span>
                        <span>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-primary)' }} />
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{manager ? `${manager.name} ${manager.lastName}` : 'Sem gerente'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-info">{p.status?.replace('_', ' ')}</span>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhum projeto ativo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCard === 'pendingTasks') {
      const pendingList = filteredTasks.filter(t => !['concluida', 'concluído', 'fechada'].includes(String(t.status || '').toLowerCase()));
      return (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>Tarefa</th>
                <th style={{ padding: '0.75rem' }}>Projeto</th>
                <th style={{ padding: '0.75rem' }}>Prazo</th>
                <th style={{ padding: '0.75rem' }}>Responsável</th>
                <th style={{ padding: '0.75rem' }}>Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map(t => {
                const proj = projects.find(p => p.id === t.projectId);
                const assignee = users.find(u => u.id === t.assigneeId);
                const isOverdue = t.deadline && new Date(t.deadline) < new Date();
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                      {t.title}
                      {isOverdue && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 'bold' }}>⚠️ ATRASADA</span>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{proj ? `${proj.code} - ${proj.name}` : 'Sem projeto'}</td>
                    <td style={{ padding: '0.75rem', color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                      {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Sem prazo'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{assignee ? `${assignee.name} ${assignee.lastName}` : 'Não atribuído'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${t.priority === 'alta' || t.priority === 'critica' ? 'badge-danger' : 'badge-info'}`}>{t.priority}</span>
                    </td>
                  </tr>
                );
              })}
              {pendingList.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhuma tarefa pendente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCard === 'openTickets') {
      const openTicketsList = filteredTickets.filter(t => !['resolvido', 'fechado', 'encerrado'].includes(String(t.status || '').toLowerCase()));
      return (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Assunto</th>
                <th style={{ padding: '0.75rem' }}>Categoria</th>
                <th style={{ padding: '0.75rem' }}>Prioridade</th>
                <th style={{ padding: '0.75rem' }}>SLA Limite</th>
                <th style={{ padding: '0.75rem' }}>Técnico</th>
              </tr>
            </thead>
            <tbody>
              {openTicketsList.map(t => {
                const isViolated = new Date(t.slaEscalationTime) < new Date();
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>#{t.id.slice(-6)}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.subject}</td>
                    <td style={{ padding: '0.75rem' }}>{t.category}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${t.priority === 'critica' ? 'badge-danger' : 'badge-warning'}`}>{t.priority}</span>
                    </td>
                    <td style={{ padding: '0.75rem', color: isViolated ? 'var(--danger)' : 'inherit', fontWeight: isViolated ? 'bold' : 'normal' }}>
                      {new Date(t.slaEscalationTime).toLocaleString()} {isViolated && '🚨'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{t.operatorName || 'Sem técnico'}</td>
                  </tr>
                );
              })}
              {openTicketsList.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhum chamado aberto.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCard === 'resolvedTickets') {
      return (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Assunto</th>
                <th style={{ padding: '0.75rem' }}>Categoria</th>
                <th style={{ padding: '0.75rem' }}>Resolvido em</th>
                <th style={{ padding: '0.75rem' }}>Técnico</th>
              </tr>
            </thead>
            <tbody>
              {resolvedTicketsList.map(t => {
                const resolvedEvent = t.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
                const resolvedAt = resolvedEvent ? new Date(resolvedEvent.updatedAt) : new Date(t.updatedAt || t.createdAt);
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>#{t.id.slice(-6)}</td>
                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.subject}</td>
                    <td style={{ padding: '0.75rem' }}>{t.category}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--success-light)' }}>
                      {resolvedAt.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{t.operatorName || 'Sem técnico'}</td>
                  </tr>
                );
              })}
              {resolvedTicketsList.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhum chamado finalizado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCard === 'sla') {
      const slaTicketsList = filteredTickets.filter(t => t.slaEscalationTime);
      return (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Chamado</th>
                <th style={{ padding: '0.75rem' }}>Prazo Limite</th>
                <th style={{ padding: '0.75rem' }}>Status SLA</th>
              </tr>
            </thead>
            <tbody>
              {slaTicketsList.map(t => {
                const isResolved = ['resolvido', 'fechado', 'encerrado'].includes(String(t.status || '').toLowerCase());
                const resolvedEvent = t.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
                const resolvedAt = resolvedEvent ? new Date(resolvedEvent.updatedAt) : new Date();
                const limit = new Date(t.slaEscalationTime);
                const violated = resolvedAt > limit;
                
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>#{t.id.slice(-6)}</td>
                    <td style={{ padding: '0.75rem' }}><strong>{t.subject}</strong></td>
                    <td style={{ padding: '0.75rem' }}>{limit.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${violated ? 'badge-danger' : 'badge-success'}`}>
                        {violated ? '🚨 SLA Violado' : '✅ SLA Cumprido'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {slaTicketsList.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Nenhum chamado sujeito a SLA.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (selectedCard === 'operator') {
      return (
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>Técnico / Operador</th>
                <th style={{ padding: '0.75rem' }}>Chamados Atribuídos</th>
                <th style={{ padding: '0.75rem' }}>Em Atendimento (Abertos)</th>
                <th style={{ padding: '0.75rem' }}>Resolvidos</th>
                <th style={{ padding: '0.75rem' }}>Violou SLA</th>
              </tr>
            </thead>
            <tbody>
              {technicianData.map((tech, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{tech.name}</td>
                  <td style={{ padding: '0.75rem' }}>{tech.total}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--warning)' }}>{tech.open}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--success-light)' }}>{tech.resolved}</td>
                  <td style={{ padding: '0.75rem', color: tech.slaViolated > 0 ? 'var(--danger)' : 'inherit' }}>{tech.slaViolated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Visão Executiva</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>KPIs de incidentes, SLAs e produtividade corporativa em tempo real.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchSummary} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={16} /> Atualizar
        </button>
      </div>

      {/* Global Filters Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label className="input-label" style={{ fontSize: '0.7rem' }}>Período Analítico</label>
          <select className="input-field" style={{ padding: '0.45rem 0.8rem', width: '170px', fontSize: '0.85rem' }} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
            <option value="todos">Todo o Histórico</option>
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label className="input-label" style={{ fontSize: '0.7rem' }}>Prioridade</label>
          <select className="input-field" style={{ padding: '0.45rem 0.8rem', width: '150px', fontSize: '0.85rem' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label className="input-label" style={{ fontSize: '0.7rem' }}>Filtro de Projeto</label>
          <select className="input-field" style={{ padding: '0.45rem 0.8rem', width: '220px', fontSize: '0.85rem' }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="todos">Todos os Projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div onClick={() => setSelectedCard(selectedCard === 'projects' ? null : 'projects')}>
          <StatCard title="Projetos Ativos" value={filteredProjects.length} icon={Briefcase} colorClass="badge-info" subtitle="Gerenciamento" trend="↗ +4%" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'pendingTasks' ? null : 'pendingTasks')}>
          <StatCard title="Tarefas Pendentes" value={pendingTasksCount} icon={CheckSquare} colorClass="badge-warning" subtitle={`${overdueTasksCount} em atraso`} trend="↘ -12%" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'openTickets' ? null : 'openTickets')}>
          <StatCard title="Chamados Abertos" value={openTicketsCount} icon={Ticket} colorClass="badge-danger" subtitle="Sem resolução" trend="↘ -8%" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'resolvedTickets' ? null : 'resolvedTickets')}>
          <StatCard title="Resolvidos" value={resolvedTicketsList.length} icon={CheckSquare} colorClass="badge-success" subtitle="Finalizados" trend="↗ +18%" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'sla' ? null : 'sla')}>
          <StatCard title="SLA no Prazo" value={`${slaRate}%`} icon={Activity} colorClass="badge-success" subtitle="Acordo de Serviço" trend="↗ +1.5%" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'operator' ? null : 'operator')}>
          <StatCard title="Tempo MTTR" value={mttrText} icon={Clock} colorClass="badge-info" subtitle="Resolução Média" trend="↘ -5m" />
        </div>
      </div>

      {/* Drill-down Detail Panel */}
      {selectedCard && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.75rem', border: '1px solid var(--border)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--accent-primary)' }}>
              Detalhamento Técnico: {
                selectedCard === 'projects' ? 'Projetos Ativos' :
                selectedCard === 'pendingTasks' ? 'Tarefas Pendentes' :
                selectedCard === 'openTickets' ? 'Chamados Abertos' :
                selectedCard === 'resolvedTickets' ? 'Chamados Finalizados' :
                selectedCard === 'sla' ? 'Conformidade de SLA' :
                'Carga de Operadores'
              }
            </h2>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedCard(null)}>Fechar</button>
          </div>
          {renderDetailedTable()}
        </div>
      )}

      {/* Charts Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Chart 1 */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="var(--accent-primary)" /> Atividades por Fase
          </h3>
          <div style={{ height: '280px' }}>
            <Bar
              data={tasksChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'var(--text-muted)' } },
                  x: { grid: { display: false }, ticks: { color: 'var(--text-muted)' } }
                }
              }}
            />
          </div>
        </div>

        {/* Chart 2 */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} color="var(--accent-primary)" /> Incidentes por Status
          </h3>
          <div style={{ height: '280px' }}>
            <Doughnut
              data={ticketsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    position: 'bottom',
                    labels: { color: 'var(--text-secondary)' }
                  } 
                }
              }}
            />
          </div>
        </div>

        {/* Chart 3 */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="var(--accent-primary)" /> Carga dos Técnicos
          </h3>
          <div style={{ height: '280px' }}>
            {technicianData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Nenhum chamado atribuído
              </div>
            ) : (
              <Bar
                data={techChartData}
                options={techChartOptions}
              />
            )}
          </div>
        </div>

      </div>

      {/* IA Recommendation Widget & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
        
        {/* ProMais AI Required Actions Widget */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" /> Ações Requeridas por IA
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {aiActions.map(action => (
              <div 
                key={action.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  background: 'var(--bg-secondary)', 
                  borderLeft: `4px solid ${action.type === 'danger' ? 'var(--danger)' : action.type === 'warning' ? '#f59e0b' : 'var(--success-light)'}` 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{action.title}</span>
                  <span className={`badge ${action.type === 'danger' ? 'badge-danger' : action.type === 'warning' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.6rem', padding: '1px 8px' }}>IA Sugestão</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{action.description}</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                  <strong>Recomendação ProMais AI:</strong> {action.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Logs */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Atividade Recente</h3>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '380px' }}>
            {(summary?.recentActivity || []).length > 0 ? summary.recentActivity.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={14} color="var(--accent-primary)" />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: '600', color: 'var(--text-primary)' }}>{log.userName}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>{log.details}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhuma atividade recente encontrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

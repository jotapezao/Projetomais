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
  User
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
ChartJS.defaults.color = 'hsl(215, 20%, 65%)';
ChartJS.defaults.font.family = 'Inter';

function StatCard({ title, value, icon: Icon, colorClass, subtitle }) {
  return (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', border: '1px solid var(--border)', transition: 'transform 0.2s', cursor: 'pointer' }}>
      <div>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>{value}</h3>
        {subtitle && <span className={`badge ${colorClass}`} style={{ fontSize: '0.7rem', textTransform: 'none' }}>{subtitle}</span>}
      </div>
      <div style={{ padding: '0.75rem', background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-full)' }}>
        <Icon size={20} className={colorClass === 'badge-danger' ? 'text-danger' : colorClass === 'badge-success' ? 'text-success' : 'text-primary'} />
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
  const [selectedCard, setSelectedCard] = useState(null); // 'projects', 'pendingTasks', 'openTickets', 'resolvedTickets', 'sla', 'operator'

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

  if (loading) return <div style={{ padding: '2rem' }}>Carregando dados executivos...</div>;

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

  // ChartJS Data
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
      backgroundColor: 'hsla(199, 89%, 48%, 0.6)',
      borderWidth: 0,
      borderRadius: 4
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
        'hsla(199, 89%, 48%, 0.75)',
        'hsla(38, 92%, 50%, 0.75)',
        'hsla(152, 69%, 31%, 0.75)',
        'hsla(346, 87%, 43%, 0.75)'
      ],
      borderWidth: 0
    }]
  };

  const techChartOptions = {
    responsive: true,
    indexAxis: 'y',
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    },
    scales: {
      x: { grid: { color: 'hsla(0,0%,100%,0.04)' } },
      y: { grid: { display: false } }
    }
  };

  const techChartData = {
    labels: technicianData.map(t => t.name),
    datasets: [
      {
        label: 'Chamados Abertos',
        data: technicianData.map(t => t.open),
        backgroundColor: 'hsla(38, 92%, 50%, 0.75)',
        borderWidth: 0
      },
      {
        label: 'Chamados Resolvidos',
        data: technicianData.map(t => t.resolved),
        backgroundColor: 'hsla(152, 69%, 31%, 0.75)',
        borderWidth: 0
      }
    ]
  };

  // Detailed Tables Renderer
  const renderDetailedTable = () => {
    if (!selectedCard) return null;

    if (selectedCard === 'projects') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
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
                <tr key={p.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{p.code}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{p.description}</div>
                  </td>
                  <td style={{ padding: '0.75rem', width: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                      <span>{doneT}/{totalT} tarefas</span>
                      <span>{pct}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'hsla(var(--border), 0.5)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'hsl(var(--success-light))' }} />
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
                <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))' }}>Nenhum projeto ativo.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'pendingTasks') {
      const pendingList = filteredTasks.filter(t => !['concluida', 'concluído', 'fechada'].includes(String(t.status || '').toLowerCase()));
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
              <th style={{ padding: '0.75rem' }}>Tarefa</th>
              <th style={{ padding: '0.75rem' }}>Projeto</th>
              <th style={{ padding: '0.75rem' }}>Prazo</th>
              <th style={{ padding: '0.75rem' }}>Responsável</th>
              <th style={{ padding: '0.75rem' }}>Prioridade</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.map(t => {
              const proj = projects.find(p => p.id === t.projectId);
              const assignee = users.find(u => u.id === t.assigneeId);
              const isOverdue = t.deadline && new Date(t.deadline) < new Date();
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                    {t.title}
                    {isOverdue && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'hsl(var(--danger))', fontWeight: 'bold' }}>⚠️ EM ATRASO</span>}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{proj ? `${proj.code} - ${proj.name}` : 'Sem projeto'}</td>
                  <td style={{ padding: '0.75rem', color: isOverdue ? 'hsl(var(--danger))' : 'inherit' }}>
                    {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'Sem prazo'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{assignee ? `${assignee.name} ${assignee.lastName}` : 'Não atribuído'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${t.priority === 'alta' || t.priority === 'critica' ? 'badge-danger' : 'badge-info'}`}>{t.priority}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}><span className="badge">{t.list}</span></td>
                </tr>
              );
            })}
            {pendingList.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))' }}>Nenhuma tarefa pendente.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'openTickets') {
      const openTicketsList = filteredTickets.filter(t => !['resolvido', 'fechado', 'encerrado'].includes(String(t.status || '').toLowerCase()));
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
              <th style={{ padding: '0.75rem' }}>ID</th>
              <th style={{ padding: '0.75rem' }}>Assunto</th>
              <th style={{ padding: '0.75rem' }}>Categoria</th>
              <th style={{ padding: '0.75rem' }}>Prioridade</th>
              <th style={{ padding: '0.75rem' }}>Aberto por</th>
              <th style={{ padding: '0.75rem' }}>SLA Limite</th>
              <th style={{ padding: '0.75rem' }}>Técnico</th>
            </tr>
          </thead>
          <tbody>
            {openTicketsList.map(t => {
              const creator = users.find(u => u.id === t.createdBy);
              const isViolated = new Date(t.slaEscalationTime) < new Date();
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{t.id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.subject}</td>
                  <td style={{ padding: '0.75rem' }}>{t.category}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${t.priority === 'critica' ? 'badge-danger' : 'badge-warning'}`}>{t.priority}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{creator ? `${creator.name} ${creator.lastName}` : t.createdByName}</td>
                  <td style={{ padding: '0.75rem', color: isViolated ? 'hsl(var(--danger))' : 'inherit', fontWeight: isViolated ? 'bold' : 'normal' }}>
                    {new Date(t.slaEscalationTime).toLocaleString()} {isViolated && '🚨'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{t.operatorName || 'Sem técnico'}</td>
                </tr>
              );
            })}
            {openTicketsList.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))' }}>Nenhum chamado aberto.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'resolvedTickets') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
              <th style={{ padding: '0.75rem' }}>ID</th>
              <th style={{ padding: '0.75rem' }}>Assunto</th>
              <th style={{ padding: '0.75rem' }}>Categoria</th>
              <th style={{ padding: '0.75rem' }}>Prioridade</th>
              <th style={{ padding: '0.75rem' }}>Aberto por</th>
              <th style={{ padding: '0.75rem' }}>SLA Limite</th>
              <th style={{ padding: '0.75rem' }}>Resolvido em</th>
              <th style={{ padding: '0.75rem' }}>Técnico</th>
            </tr>
          </thead>
          <tbody>
            {resolvedTicketsList.map(t => {
              const creator = users.find(u => u.id === t.createdBy);
              const resolvedEvent = t.history?.find(h => h.status === 'resolvido' || h.status === 'fechado');
              const resolvedAt = resolvedEvent ? new Date(resolvedEvent.updatedAt) : new Date(t.updatedAt || t.createdAt);
              const isViolated = resolvedAt > new Date(t.slaEscalationTime);
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{t.id}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '500' }}>{t.subject}</td>
                  <td style={{ padding: '0.75rem' }}>{t.category}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${t.priority === 'critica' ? 'badge-danger' : 'badge-warning'}`}>{t.priority}</span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{creator ? `${creator.name} ${creator.lastName}` : t.createdByName}</td>
                  <td style={{ padding: '0.75rem' }}>{new Date(t.slaEscalationTime).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem', color: isViolated ? 'hsl(var(--danger))' : 'hsl(var(--success-light))' }}>
                    {resolvedAt.toLocaleString()} {isViolated ? '(Violado 🚨)' : '(No Prazo ✓)'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{t.operatorName || 'Sem técnico'}</td>
                </tr>
              );
            })}
            {resolvedTicketsList.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))' }}>Nenhum chamado finalizado.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'sla') {
      const slaTicketsList = filteredTickets.filter(t => t.slaEscalationTime);
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
              <th style={{ padding: '0.75rem' }}>ID</th>
              <th style={{ padding: '0.75rem' }}>Chamado</th>
              <th style={{ padding: '0.75rem' }}>Prioridade</th>
              <th style={{ padding: '0.75rem' }}>Prazo Limite</th>
              <th style={{ padding: '0.75rem' }}>Status SLA</th>
              <th style={{ padding: '0.75rem' }}>Técnico</th>
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
                <tr key={t.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{t.id}</td>
                  <td style={{ padding: '0.75rem' }}><strong>{t.subject}</strong></td>
                  <td style={{ padding: '0.75rem' }}><span className={`badge ${t.priority === 'critica' ? 'badge-danger' : 'badge-warning'}`}>{t.priority}</span></td>
                  <td style={{ padding: '0.75rem' }}>{limit.toLocaleString()}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${violated ? 'badge-danger' : 'badge-success'}`}>
                      {violated ? '🚨 SLA Violado' : '✅ SLA Cumprido'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{t.operatorName || 'Sem técnico'}</td>
                </tr>
              );
            })}
            {slaTicketsList.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))' }}>Nenhum chamado sujeito a SLA.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }

    if (selectedCard === 'operator') {
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
              <th style={{ padding: '0.75rem' }}>Técnico / Operador</th>
              <th style={{ padding: '0.75rem' }}>Chamados Atribuídos</th>
              <th style={{ padding: '0.75rem' }}>Em Atendimento (Abertos)</th>
              <th style={{ padding: '0.75rem' }}>Resolvidos</th>
              <th style={{ padding: '0.75rem' }}>Violou SLA</th>
            </tr>
          </thead>
          <tbody>
            {technicianData.map((tech, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{tech.name}</td>
                <td style={{ padding: '0.75rem' }}>{tech.total}</td>
                <td style={{ padding: '0.75rem', color: 'hsl(var(--warning))' }}>{tech.open}</td>
                <td style={{ padding: '0.75rem', color: 'hsl(var(--success-light))' }}>{tech.resolved}</td>
                <td style={{ padding: '0.75rem', color: tech.slaViolated > 0 ? 'hsl(var(--danger))' : 'inherit' }}>{tech.slaViolated}</td>
              </tr>
            ))}
            {technicianData.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'hsl(var(--text-muted))' }}>Nenhum técnico com chamado atribuído.</td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Dashboard Executivo</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Visão geral em tempo real de KPIs, produtividade e carga de técnicos.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={fetchSummary}><Activity size={18} /> Sincronizar</button>
        </div>
      </div>

      {/* Global Filters Panel */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold', letterSpacing: '0.05em' }}>PERÍODO</label>
          <select className="input-field" style={{ padding: '0.4rem 0.8rem', width: '160px', fontSize: '0.85rem' }} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
            <option value="todos">Todo o Histórico</option>
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold', letterSpacing: '0.05em' }}>PRIORIDADE</label>
          <select className="input-field" style={{ padding: '0.4rem 0.8rem', width: '140px', fontSize: '0.85rem' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold', letterSpacing: '0.05em' }}>PROJETO ATIVO</label>
          <select className="input-field" style={{ padding: '0.4rem 0.8rem', width: '220px', fontSize: '0.85rem' }} value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="todos">Todos os Projetos</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div onClick={() => setSelectedCard(selectedCard === 'projects' ? null : 'projects')}>
          <StatCard title="Projetos Ativos" value={filteredProjects.length} icon={Briefcase} colorClass="badge-info" subtitle="Clique para detalhes" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'pendingTasks' ? null : 'pendingTasks')}>
          <StatCard title="Tarefas Pendentes" value={pendingTasksCount} icon={CheckSquare} colorClass="badge-warning" subtitle={`${overdueTasksCount} em atraso`} />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'openTickets' ? null : 'openTickets')}>
          <StatCard title="Chamados Abertos" value={openTicketsCount} icon={Ticket} colorClass="badge-danger" subtitle="Aguardando suporte" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'resolvedTickets' ? null : 'resolvedTickets')}>
          <StatCard title="Chamados Finalizados" value={resolvedTicketsList.length} icon={CheckSquare} colorClass="badge-success" subtitle="Status concluído" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'sla' ? null : 'sla')}>
          <StatCard title="Taxa de SLA" value={`${slaRate}%`} icon={Activity} colorClass="badge-success" subtitle="Dentro da meta" />
        </div>
        <div onClick={() => setSelectedCard(selectedCard === 'operator' ? null : 'operator')}>
          <StatCard title="Tempo Médio (MTTR)" value={mttrText} icon={Clock} colorClass="badge-info" subtitle="Técnico / Distribuição" />
        </div>
      </div>

      {/* Drill-down Detail Panel */}
      {selectedCard && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--border)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'hsl(var(--accent-primary))' }}>
              Detalhes Executivos: {
                selectedCard === 'projects' ? 'Projetos Ativos' :
                selectedCard === 'pendingTasks' ? 'Tarefas Pendentes' :
                selectedCard === 'openTickets' ? 'Chamados Abertos' :
                selectedCard === 'resolvedTickets' ? 'Chamados Finalizados' :
                selectedCard === 'sla' ? 'Auditoria de Conformidade de SLA' :
                'Carga e Desempenho de Técnicos'
              }
            </h2>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setSelectedCard(null)}>Fechar</button>
          </div>
          {renderDetailedTable()}
        </div>
      )}

      {/* Charts Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Chart 1 */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="hsl(var(--accent-primary))" /> Tarefas por Etapa
          </h3>
          <div style={{ height: '280px' }}>
            <Bar
              data={tasksChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'hsla(0,0%,100%,0.04)' } },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>

        {/* Chart 2 */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} color="hsl(var(--accent-primary))" /> Chamados por Status
          </h3>
          <div style={{ height: '280px' }}>
            <Doughnut
              data={ticketsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>

        {/* Chart 3 */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} color="hsl(var(--accent-primary))" /> Carga por Técnico
          </h3>
          <div style={{ height: '280px' }}>
            {technicianData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                Nenhum chamado atribuído no período
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

      {/* Activity logs & Module summaries */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Módulos Monitorados</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))', border: '1px solid var(--border)' }}>
              <strong>Projetos</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>{projects.length} registros ativos</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))', border: '1px solid var(--border)' }}>
              <strong>Tarefas</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>{tasks.length} itens acompanhados</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))', border: '1px solid var(--border)' }}>
              <strong>Chamados</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>{openTicketsCount} abertos / {resolvedTicketsList.length} resolvidos</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))', border: '1px solid var(--border)' }}>
              <strong>Conhecimento</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>{summary.totals?.knowledgeArticles ?? 0} artigos publicados</p>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Atividade Recente</h3>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
            {(summary?.recentActivity || []).length > 0 ? summary.recentActivity.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--bg-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={14} color="hsl(var(--accent-primary))" />
                </div>
                <div>
                  <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: '500' }}>{log.userName}</p>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', margin: '0.25rem 0' }}>{log.details}</p>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Nenhuma atividade recente encontrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

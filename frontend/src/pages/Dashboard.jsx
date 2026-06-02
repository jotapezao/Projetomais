import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckSquare, 
  AlertTriangle, 
  Ticket, 
  Clock, 
  TrendingUp, 
  Activity 
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd have a specific /api/dashboard endpoint.
    // For this prototype, we'll fetch everything and compute locally.
    const fetchData = async () => {
      try {
        const [projRes, taskRes, tktRes, logRes] = await Promise.all([
          client.get('/projects'),
          client.get('/tasks'),
          client.get('/tickets'),
          client.get('/admin/audit-logs').catch(() => ({ data: [] })) // Might fail for non-admins, fallback
        ]);

        const projects = projRes.data;
        const tasks = taskRes.data;
        const tickets = tktRes.data;

        const overdueTasks = tasks.filter(t => t.status !== 'concluida' && new Date(t.deadline) < new Date());
        const pendingTasks = tasks.filter(t => t.status !== 'concluida');
        const openTickets = tickets.filter(t => t.status !== 'resolvido' && t.status !== 'encerrado');
        const resolvedTickets = tickets.filter(t => t.status === 'resolvido' || t.status === 'encerrado');

        setStats({
          totalProjects: projects.length,
          pendingTasks: pendingTasks.length,
          overdueTasks: overdueTasks.length,
          openTickets: openTickets.length,
          resolvedTickets: resolvedTickets.length,
          slaHitRate: openTickets.length + resolvedTickets.length > 0 
            ? Math.round((tickets.filter(t => t.SLAStatus === 'on_time').length / tickets.length) * 100) 
            : 100
        });

        setLogs(logRes.data.slice(0, 5));
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando dados executivos...</div>;

  const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>{title}</p>
        <h3 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{value}</h3>
        {subtitle && <span className={`badge ${colorClass}`} style={{ fontSize: '0.7rem' }}>{subtitle}</span>}
      </div>
      <div style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-full)' }}>
        <Icon size={24} className={colorClass === 'badge-danger' ? 'text-danger' : colorClass === 'badge-success' ? 'text-success' : 'text-primary'} />
      </div>
    </div>
  );

  const taskData = {
    labels: ['Backlog', 'Planejada', 'Em andamento', 'Concluída'],
    datasets: [{
      label: 'Tarefas por Status',
      data: [3, 5, 8, 12], // Dummy data representing distribution
      backgroundColor: [
        'hsla(215, 20%, 65%, 0.6)',
        'hsla(199, 89%, 48%, 0.6)',
        'hsla(38, 92%, 50%, 0.6)',
        'hsla(152, 69%, 31%, 0.6)',
      ],
      borderWidth: 0
    }]
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Dashboard Executivo</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Visão geral do desempenho e atividades recentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary"><Clock size={18} /> Últimos 30 Dias</button>
          <button className="btn btn-primary"><TrendingUp size={18} /> Relatório Completo</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Projetos Ativos" value={stats.totalProjects} icon={Briefcase} colorClass="badge-info" subtitle="No prazo" />
        <StatCard title="Tarefas Pendentes" value={stats.pendingTasks} icon={CheckSquare} colorClass="badge-warning" subtitle={`${stats.overdueTasks} atrasadas`} />
        <StatCard title="Chamados Abertos" value={stats.openTickets} icon={Ticket} colorClass="badge-danger" subtitle="Atenção ao SLA" />
        <StatCard title="Taxa de SLA" value={`${stats.slaHitRate}%`} icon={Activity} colorClass="badge-success" subtitle="Dentro da meta" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Desempenho de Conclusão de Tarefas</h3>
          <div style={{ height: '300px' }}>
            <Bar 
              data={taskData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'hsla(0,0%,100%,0.05)' } },
                  x: { grid: { display: false } }
                }
              }} 
            />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Atividade Recente</h3>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--bg-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={14} color="hsl(var(--accent-primary))" />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', margin: 0, fontWeight: '500' }}>{log.userName}</p>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', margin: '0.25rem 0' }}>{log.details}</p>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))' }}>Nenhuma atividade registrada ou acesso restrito.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

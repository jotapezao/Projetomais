import { useEffect, useState } from 'react';
import {
  Briefcase,
  CheckSquare,
  Ticket,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart
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
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchSummary();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando dados executivos...</div>;

  const totals = summary?.totals || {};
  const tasksChart = {
    labels: summary?.charts?.tasksByList?.map((item) => item.label) || [],
    datasets: [
      {
        label: 'Tarefas por etapa',
        data: summary?.charts?.tasksByList?.map((item) => item.value) || [],
        backgroundColor: [
          'hsla(215, 20%, 65%, 0.6)',
          'hsla(199, 89%, 48%, 0.6)',
          'hsla(38, 92%, 50%, 0.6)',
          'hsla(152, 69%, 31%, 0.6)',
          'hsla(346, 87%, 43%, 0.6)'
        ],
        borderWidth: 0
      }
    ]
  };

  const ticketsChart = {
    labels: summary?.charts?.ticketsByStatus?.map((item) => item.label) || [],
    datasets: [
      {
        data: summary?.charts?.ticketsByStatus?.map((item) => item.value) || [],
        backgroundColor: [
          'hsla(199, 89%, 48%, 0.75)',
          'hsla(38, 92%, 50%, 0.75)',
          'hsla(152, 69%, 31%, 0.75)',
          'hsla(346, 87%, 43%, 0.75)',
          'hsla(252, 87%, 67%, 0.75)'
        ],
        borderWidth: 0
      }
    ]
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Dashboard Executivo</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Visão geral do desempenho e atividades recentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary"><Clock size={18} /> Últimos 30 Dias</button>
          <button className="btn btn-primary"><TrendingUp size={18} /> Relatório Completo</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Projetos Ativos" value={totals.projects ?? 0} icon={Briefcase} colorClass="badge-info" subtitle="No prazo" />
        <StatCard title="Tarefas Pendentes" value={totals.pendingTasks ?? 0} icon={CheckSquare} colorClass="badge-warning" subtitle={`${totals.overdueTasks ?? 0} atrasadas`} />
        <StatCard title="Chamados Abertos" value={totals.openTickets ?? 0} icon={Ticket} colorClass="badge-danger" subtitle="Atenção ao SLA" />
        <StatCard title="Taxa de SLA" value={`${summary?.slaHitRate ?? 100}%`} icon={Activity} colorClass="badge-success" subtitle="Dentro da meta" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} /> Tarefas por Etapa
          </h3>
          <div style={{ height: '300px' }}>
            <Bar
              data={tasksChart}
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

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} /> Chamados por Status
          </h3>
          <div style={{ height: '300px' }}>
            <Doughnut
              data={ticketsChart}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Módulos Monitorados</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))' }}>
              <strong>Projetos</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))' }}>{totals.projects ?? 0} registros ativos</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))' }}>
              <strong>Tarefas</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))' }}>{totals.tasks ?? 0} itens acompanhados</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))' }}>
              <strong>Chamados</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))' }}>{totals.openTickets ?? 0} abertos e {totals.resolvedTickets ?? 0} resolvidos</p>
            </div>
            <div className="glass-panel" style={{ padding: '1rem', background: 'hsl(var(--bg-secondary))' }}>
              <strong>Conhecimento</strong>
              <p style={{ margin: '0.25rem 0 0', color: 'hsl(var(--text-secondary))' }}>{totals.knowledgeArticles ?? 0} artigos publicados</p>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Atividade Recente</h3>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {(summary?.recentActivity || []).length > 0 ? summary.recentActivity.map((log) => (
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
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-secondary))' }}>Nenhuma atividade recente encontrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

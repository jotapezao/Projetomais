import { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import client from '../api/client';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [view, setView] = useState('kanban'); // 'kanban', 'list', 'gantt'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const [projRes, taskRes] = await Promise.all([
          client.get('/projects'),
          client.get('/tasks')
        ]);
        setProjects(projRes.data);
        setTasks(taskRes.data);
        if (projRes.data.length > 0) {
          setActiveProject(projRes.data[0]);
        }
      } catch (error) {
        console.error('Erro ao buscar projetos', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Projetos...</div>;

  const projectTasks = activeProject ? tasks.filter(t => t.projectId === activeProject.id) : [];

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, targetList) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, list: targetList } : t));

    try {
      await client.patch(`/tasks/${taskId}/status`, { status: targetList.toLowerCase().replace(' ', '_'), list: targetList });
    } catch (error) {
      console.error('Erro ao mover tarefa', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <h1 style={{ margin: 0 }}>Projetos</h1>
            <select 
              className="input-field" 
              style={{ width: '300px', fontSize: '1rem', padding: '0.5rem 1rem' }}
              value={activeProject?.id || ''}
              onChange={(e) => setActiveProject(projects.find(p => p.id === e.target.value))}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
            </select>
          </div>
          {activeProject && <p style={{ color: 'hsl(var(--text-secondary))' }}>{activeProject.description}</p>}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', background: 'hsl(var(--bg-secondary))', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button className={`btn ${view === 'kanban' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', background: view === 'kanban' ? '' : 'transparent', border: 'none' }} onClick={() => setView('kanban')} title="Kanban"><LayoutGrid size={18} /></button>
            <button className={`btn ${view === 'list' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', background: view === 'list' ? '' : 'transparent', border: 'none' }} onClick={() => setView('list')} title="Lista"><ListIcon size={18} /></button>
            <button className={`btn ${view === 'gantt' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', background: view === 'gantt' ? '' : 'transparent', border: 'none' }} onClick={() => setView('gantt')} title="Gantt (Cronograma)"><CalendarIcon size={18} /></button>
          </div>
          <button className="btn btn-primary"><Plus size={18} /> Nova Tarefa</button>
        </div>
      </div>

      {/* Workspace */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        
        {view === 'kanban' && activeProject && (
          <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem', width: '100%' }}>
            {activeProject.lists.map(listName => (
              <div 
                key={listName}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, listName)}
                className="glass-card" 
                style={{ minWidth: '320px', width: '320px', display: 'flex', flexDirection: 'column', background: 'hsl(var(--bg-secondary))' }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.95rem' }}>{listName}</h3>
                  <span style={{ fontSize: '0.75rem', background: 'hsl(var(--bg-card))', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                    {projectTasks.filter(t => t.list === listName).length}
                  </span>
                </div>
                
                <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {projectTasks.filter(t => t.list === listName).map(task => (
                    <div 
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                      className="glass-card"
                      style={{ padding: '1rem', cursor: 'grab', background: 'hsl(var(--bg-card))' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className={`badge ${task.priority === 'alta' || task.priority === 'critica' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                          {task.priority}
                        </span>
                        <MoreVertical size={16} color="hsl(var(--text-muted))" style={{ cursor: 'pointer' }} />
                      </div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{task.title}</h4>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckSquare size={14} /> {task.checklist?.filter(c => c.completed).length || 0}/{task.checklist?.length || 0}
                        </div>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'hsl(var(--accent-primary))', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', title: 'Responsável' }}>
                          Op
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'list' && (
          <div className="glass-card" style={{ width: '100%', padding: '1.5rem', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
                  <th style={{ padding: '1rem 0' }}>Título da Tarefa</th>
                  <th style={{ padding: '1rem 0' }}>Fase / Lista</th>
                  <th style={{ padding: '1rem 0' }}>Prioridade</th>
                  <th style={{ padding: '1rem 0' }}>Prazo</th>
                  <th style={{ padding: '1rem 0' }}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: '500' }}>{task.title}</td>
                    <td style={{ padding: '1rem 0' }}><span className="badge badge-info">{task.list}</span></td>
                    <td style={{ padding: '1rem 0', textTransform: 'capitalize' }}>{task.priority}</td>
                    <td style={{ padding: '1rem 0' }}>{new Date(task.deadline).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem 0' }}>Visualizar</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'gantt' && (
          <div className="glass-card" style={{ width: '100%', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <CalendarIcon size={48} color="hsl(var(--text-muted))" style={{ marginBottom: '1rem' }} />
              <h3>Visualização de Cronograma (Gantt)</h3>
              <p style={{ color: 'hsl(var(--text-secondary))' }}>Módulo de renderização de calendário em desenvolvimento para a próxima versão.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

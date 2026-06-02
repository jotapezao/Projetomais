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
          <div className="glass-card" style={{ width: '100%', padding: '2rem', overflowX: 'auto' }}>
            {projectTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
                <CalendarIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3>Sem Tarefas</h3>
                <p>Crie tarefas com datas de início e prazo para visualizar o cronograma.</p>
              </div>
            ) : (() => {
              // Calculate timeline boundaries
              const today = new Date();
              const dates = projectTasks.map(t => ({
                start: t.startDate ? new Date(t.startDate) : new Date(t.createdAt || today),
                end: t.deadline ? new Date(t.deadline) : new Date(new Date(t.createdAt || today).getTime() + 7 * 24 * 60 * 60 * 1000)
              }));
              
              const minDate = new Date(Math.min(...dates.map(d => d.start.getTime())) - 2 * 24 * 60 * 60 * 1000); // 2 days buffer
              const maxDate = new Date(Math.max(...dates.map(d => d.end.getTime())) + 5 * 24 * 60 * 60 * 1000); // 5 days buffer
              
              const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
              
              // Generate headers
              const dayHeaders = [];
              const currentDate = new Date(minDate);
              for (let i = 0; i < totalDays; i++) {
                dayHeaders.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
              }

              return (
                <div style={{ minWidth: '800px' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>Cronograma de Atividades</h3>
                  
                  {/* Timeline Container */}
                  <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', background: 'hsl(var(--bg-secondary))', overflow: 'hidden' }}>
                    
                    {/* Header Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-card))' }}>
                      <div style={{ padding: '1rem', fontWeight: 'bold', borderRight: '1px solid hsl(var(--border))' }}>Tarefa</div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDays}, minmax(40px, 1fr))`, overflowX: 'auto' }}>
                        {dayHeaders.map((date, idx) => {
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                padding: '0.5rem 0', 
                                textAlign: 'center', 
                                fontSize: '0.75rem', 
                                borderRight: '1px solid hsla(var(--border), 0.5)',
                                color: isWeekend ? 'hsl(var(--text-muted))' : 'hsl(var(--text-secondary))',
                                background: isWeekend ? 'hsla(var(--border), 0.1)' : 'transparent'
                              }}
                            >
                              <div>{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                              <div style={{ fontWeight: 'bold' }}>{date.getDate()}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Task Rows */}
                    {projectTasks.map(task => {
                      const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt || today);
                      const taskEnd = task.deadline ? new Date(task.deadline) : new Date(new Date(task.createdAt || today).getTime() + 7 * 24 * 60 * 60 * 1000);
                      
                      // Calculate offsets
                      const startOffset = Math.max(0, Math.floor((taskStart.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)));
                      const duration = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000)));
                      
                      // Calculate checklist progress
                      const checklistTotal = task.checklist?.length || 0;
                      const checklistDone = task.checklist?.filter(c => c.completed).length || 0;
                      const progress = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : (task.list === 'Concluída' ? 100 : 0);

                      return (
                        <div 
                          key={task.id} 
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '250px 1fr', 
                            borderBottom: '1px solid hsla(var(--border), 0.5)',
                            alignItems: 'center'
                          }}
                        >
                          {/* Task Name & Details */}
                          <div style={{ padding: '1rem', borderRight: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-card))' }}>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{task.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                              De: {taskStart.toLocaleDateString()} Até: {taskEnd.toLocaleDateString()}
                            </div>
                          </div>

                          {/* Bar view */}
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDays}, minmax(40px, 1fr))`, height: '100%', position: 'relative', alignItems: 'center' }}>
                            
                            {/* Grid vertical gridlines */}
                            {Array.from({ length: totalDays }).map((_, idx) => (
                              <div key={idx} style={{ height: '100%', borderRight: '1px solid hsla(var(--border), 0.25)', position: 'absolute', left: `${(idx / totalDays) * 100}%`, width: '1px', zIndex: 0 }} />
                            ))}

                            {/* Gantt Bar */}
                            <div 
                              style={{ 
                                gridColumnStart: startOffset + 1, 
                                gridColumnEnd: Math.min(totalDays + 1, startOffset + duration + 1),
                                background: 'linear-gradient(90deg, hsl(var(--accent-primary)), hsl(var(--accent-primary-hover)))',
                                height: '32px',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 0.75rem',
                                color: '#fff',
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                position: 'relative',
                                zIndex: 1,
                                boxShadow: 'var(--shadow-sm)'
                              }}
                              title={`${task.title} (${progress}% concluída)`}
                            >
                              {/* Progress bar inside the bar */}
                              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress}%`, background: 'hsla(var(--success-light), 0.45)', transition: 'width 0.3s ease', zIndex: -1 }} />
                              <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)', zIndex: 1 }}>{progress}%</span>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })())}
          </div>
        )}
      </div>

    </div>
  );
}

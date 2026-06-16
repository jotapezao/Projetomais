import { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Calendar as CalendarIcon, CheckSquare, X, Trash2 } from 'lucide-react';
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

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [view, setView] = useState('kanban'); // 'kanban', 'list', 'gantt'
  const [loading, setLoading] = useState(true);
  const [currentUser] = useState(() => readTokenPayload());

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Project Form
  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projDesc, setProjDesc] = useState('');

  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('media');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskChecklist, setTaskChecklist] = useState([]);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Edit Task State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState('media');
  const [editStartDate, setEditStartDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('');

  const fetchAllData = async () => {
    try {
      const [projRes, taskRes, userRes] = await Promise.all([
        client.get('/projects'),
        client.get('/tasks'),
        client.get('/projects/users')
      ]);
      setProjects(projRes.data);
      setTasks(taskRes.data);
      setTeamMembers(userRes.data);
      
      // Auto-select first project if none is active
      if (projRes.data.length > 0) {
        setActiveProject(prev => prev ? projRes.data.find(p => p.id === prev.id) || projRes.data[0] : projRes.data[0]);
      }
    } catch (error) {
      console.error('Erro ao buscar dados de projetos/tarefas', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchAllData();
    });
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projName || !projCode) return;

    try {
      const res = await client.post('/projects', {
        name: projName,
        code: projCode.toUpperCase(),
        description: projDesc,
        lists: ['Backlog', 'Planejada', 'Em andamento', 'Concluída'],
        companyId: currentUser?.companyId || 'comp-1'
      });
      setShowProjectModal(false);
      setProjName('');
      setProjCode('');
      setProjDesc('');
      
      // Refresh and set active
      await fetchAllData();
      setActiveProject(res.data);
    } catch (error) {
      console.error('Erro ao criar projeto', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !activeProject) return;

    try {
      await client.post('/tasks', {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        startDate: taskStartDate,
        deadline: taskDeadline,
        assigneeId: taskAssignee || currentUser?.id,
        projectId: activeProject.id,
        companyId: currentUser?.companyId || 'comp-1',
        list: 'Backlog',
        status: 'backlog',
        checklist: taskChecklist
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('media');
      setTaskStartDate('');
      setTaskDeadline('');
      setTaskAssignee('');
      setTaskChecklist([]);
      
      fetchAllData();
    } catch (error) {
      console.error('Erro ao criar tarefa', error);
    }
  };

  const handleUpdateTaskDetails = async (updatedTask) => {
    try {
      const res = await client.put(`/tasks/${updatedTask.id}`, updatedTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? res.data : t));
      if (selectedTask && selectedTask.id === updatedTask.id) {
        setSelectedTask(res.data);
      }
    } catch (error) {
      console.error('Erro ao atualizar detalhes da tarefa', error);
    }
  };

  const startEditing = () => {
    if (!selectedTask) return;
    setEditTitle(selectedTask.title || '');
    setEditDesc(selectedTask.description || '');
    setEditPriority(selectedTask.priority || 'media');
    setEditStartDate(selectedTask.startDate || '');
    setEditDeadline(selectedTask.deadline || '');
    setEditAssigneeId(selectedTask.assigneeId || '');
    setIsEditing(true);
  };

  const handleSaveTaskEdit = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    const updated = {
      ...selectedTask,
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      startDate: editStartDate,
      deadline: editDeadline,
      assigneeId: editAssigneeId || null
    };

    try {
      await handleUpdateTaskDetails(updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar edições da tarefa:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Deseja realmente excluir esta tarefa?')) return;
    try {
      await client.delete(`/tasks/${taskId}`);
      setSelectedTask(null);
      fetchAllData();
    } catch (error) {
      console.error('Erro ao excluir tarefa', error);
    }
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const newItem = { id: `c-${Date.now()}`, text: newCheckItem, completed: false };
    setTaskChecklist([...taskChecklist, newItem]);
    setNewCheckItem('');
  };

  const addCheckItemToSelected = () => {
    if (!newCheckItem.trim() || !selectedTask) return;
    const newItem = { id: `c-${Date.now()}`, text: newCheckItem, completed: false };
    const updated = { ...selectedTask, checklist: [...(selectedTask.checklist || []), newItem] };
    setNewCheckItem('');
    handleUpdateTaskDetails(updated);
  };

  const toggleCheckItemInSelected = (itemId) => {
    if (!selectedTask) return;
    const updatedChecklist = (selectedTask.checklist || []).map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const updated = { ...selectedTask, checklist: updatedChecklist };
    handleUpdateTaskDetails(updated);
  };

  const deleteCheckItemInSelected = (itemId) => {
    if (!selectedTask) return;
    const updatedChecklist = (selectedTask.checklist || []).filter(item => item.id !== itemId);
    const updated = { ...selectedTask, checklist: updatedChecklist };
    handleUpdateTaskDetails(updated);
  };

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

  const isManager = currentUser && ['super_admin', 'admin', 'gestor'].includes(currentUser.role);

  if (loading) return <div style={{ padding: '2rem' }}>Carregando Projetos...</div>;

  const projectTasks = activeProject ? tasks.filter(t => t.projectId === activeProject.id) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Projetos</h1>
            {projects.length > 0 ? (
              <select 
                className="input-field" 
                style={{ width: '250px', fontSize: '1rem', padding: '0.5rem 1rem' }}
                value={activeProject?.id || ''}
                onChange={(e) => setActiveProject(projects.find(p => p.id === e.target.value))}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
              </select>
            ) : (
              <span style={{ color: 'hsl(var(--text-muted))' }}>Nenhum projeto cadastrado</span>
            )}
          </div>
          {activeProject && <p style={{ color: 'hsl(var(--text-secondary))', margin: 0 }}>{activeProject.description}</p>}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'hsl(var(--bg-secondary))', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button className={`btn ${view === 'kanban' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', background: view === 'kanban' ? '' : 'transparent', border: 'none' }} onClick={() => setView('kanban')} title="Kanban"><LayoutGrid size={18} /></button>
            <button className={`btn ${view === 'list' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', background: view === 'list' ? '' : 'transparent', border: 'none' }} onClick={() => setView('list')} title="Lista"><ListIcon size={18} /></button>
            <button className={`btn ${view === 'gantt' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', background: view === 'gantt' ? '' : 'transparent', border: 'none' }} onClick={() => setView('gantt')} title="Gantt"><CalendarIcon size={18} /></button>
          </div>
          {isManager && (
            <button className="btn btn-secondary" onClick={() => setShowProjectModal(true)}><Plus size={18} /> Novo Projeto</button>
          )}
          {activeProject && (
            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}><Plus size={18} /> Nova Tarefa</button>
          )}
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
                  <h3 style={{ fontSize: '0.95rem', margin: 0 }}>{listName}</h3>
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
                      onClick={() => setSelectedTask(task)}
                      className="glass-card"
                      style={{ padding: '1rem', cursor: 'grab', background: 'hsl(var(--bg-card))' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span className={`badge ${task.priority === 'alta' || task.priority === 'critica' ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                          {task.priority}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                          {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Sem prazo'}
                        </div>
                      </div>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>{task.title}</h4>
                      
                      {/* Subtask Progress Bar */}
                      {task.checklist && task.checklist.length > 0 && (() => {
                        const total = task.checklist.length;
                        const done = task.checklist.filter(c => c.completed).length;
                        const progress = Math.round((done / total) * 100);
                        return (
                          <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginBottom: '0.25rem' }}>
                              <span>Subtarefas ({done}/{total})</span>
                              <span>{progress}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'hsla(var(--border), 0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${progress}%`, background: 'hsl(var(--success-light))', transition: 'width 0.3s ease' }} />
                            </div>
                          </div>
                        );
                      })()}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckSquare size={14} /> {task.checklist?.filter(c => c.completed).length || 0}/{task.checklist?.length || 0}
                        </div>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'hsl(var(--accent-primary))', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {teamMembers.find(m => m.id === task.assigneeId)?.name?.slice(0, 2).toUpperCase() || 'NA'}
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
                  <th style={{ padding: '1rem 0' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.map(task => (
                  <tr key={task.id} style={{ borderBottom: '1px solid hsla(var(--border), 0.5)', cursor: 'pointer' }} onClick={() => setSelectedTask(task)}>
                    <td style={{ padding: '1rem 0', fontWeight: '500' }}>{task.title}</td>
                    <td style={{ padding: '1rem 0' }}><span className="badge badge-info">{task.list}</span></td>
                    <td style={{ padding: '1rem 0', textTransform: 'capitalize' }}>{task.priority}</td>
                    <td style={{ padding: '1rem 0' }}>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Sem prazo'}</td>
                    <td style={{ padding: '1rem 0' }}>{teamMembers.find(m => m.id === task.assigneeId)?.name || 'Não atribuído'}</td>
                    <td style={{ padding: '1rem 0' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', border: 'none', color: 'hsl(var(--danger))' }} onClick={() => handleDeleteTask(task.id)}><Trash2 size={16}/></button>
                    </td>
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
              const today = new Date();
              const dates = projectTasks.map(t => ({
                start: t.startDate ? new Date(t.startDate) : new Date(t.createdAt || today),
                end: t.deadline ? new Date(t.deadline) : new Date(new Date(t.createdAt || today).getTime() + 7 * 24 * 60 * 60 * 1000)
              }));
              
              const minDate = new Date(Math.min(...dates.map(d => d.start.getTime())) - 2 * 24 * 60 * 60 * 1000);
              const maxDate = new Date(Math.max(...dates.map(d => d.end.getTime())) + 5 * 24 * 60 * 60 * 1000);
              
              const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000));
              
              const dayHeaders = [];
              const currentDate = new Date(minDate);
              for (let i = 0; i < totalDays; i++) {
                dayHeaders.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
              }

              return (
                <div style={{ minWidth: '800px' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>Cronograma de Atividades</h3>
                  
                  <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius-md)', background: 'hsl(var(--bg-secondary))', overflow: 'hidden' }}>
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

                    {projectTasks.map(task => {
                      const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.createdAt || today);
                      const taskEnd = task.deadline ? new Date(task.deadline) : new Date(new Date(task.createdAt || today).getTime() + 7 * 24 * 60 * 60 * 1000);
                      
                      const startOffset = Math.max(0, Math.floor((taskStart.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000)));
                      const duration = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000)));
                      
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
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedTask(task)}
                        >
                          <div style={{ padding: '1rem', borderRight: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-card))' }}>
                            <div style={{ fontWeight: '500', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{task.title}</div>
                            <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                              De: {taskStart.toLocaleDateString()} Até: {taskEnd.toLocaleDateString()}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDays}, minmax(40px, 1fr))`, height: '100%', position: 'relative', alignItems: 'center' }}>
                            {Array.from({ length: totalDays }).map((_, idx) => (
                              <div key={idx} style={{ height: '100%', borderRight: '1px solid hsla(var(--border), 0.25)', position: 'absolute', left: `${(idx / totalDays) * 100}%`, width: '1px', zIndex: 0 }} />
                            ))}

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
            })()}
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showProjectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowProjectModal(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Cadastrar Novo Projeto</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Nome do Projeto</label>
                <input type="text" className="input-field" value={projName} onChange={e => setProjName(e.target.value)} placeholder="Ex: Novo Site Comercial" required />
              </div>
              <div className="input-group">
                <label className="input-label">Código (Sigla)</label>
                <input type="text" className="input-field" value={projCode} onChange={e => setProjCode(e.target.value)} placeholder="Ex: NSC" required />
              </div>
              <div className="input-group">
                <label className="input-label">Descrição</label>
                <textarea className="input-field" value={projDesc} onChange={e => setProjDesc(e.target.value)} placeholder="Objetivo e escopo do projeto..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowTaskModal(false)}>
              <X size={24} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Criar Nova Tarefa</h2>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Título da Tarefa</label>
                <input type="text" className="input-field" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="O que precisa ser feito?" required />
              </div>
              <div className="input-group">
                <label className="input-label">Descrição</label>
                <textarea className="input-field" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Mais detalhes sobre a atividade..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Data de Início</label>
                  <input type="date" className="input-field" value={taskStartDate} onChange={e => setTaskStartDate(e.target.value)} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Prazo de Entrega</label>
                  <input type="date" className="input-field" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Prioridade</label>
                  <select className="input-field" value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Responsável</label>
                  <select className="input-field" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                    <option value="">Atribuir a...</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>{member.name} {member.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checklist Builder */}
              <div>
                <label className="input-label">Subtarefas / Checklist</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                  <input type="text" className="input-field" placeholder="Adicionar item..." value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} />
                  <button type="button" className="btn btn-secondary" onClick={addCheckItem}>Adicionar</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {taskChecklist.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                      <span>{item.text}</span>
                      <button type="button" style={{ border: 'none', background: 'transparent', color: 'hsl(var(--danger))', cursor: 'pointer' }} onClick={() => setTaskChecklist(taskChecklist.filter((_, i) => i !== idx))}>Remover</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Tarefa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAILS MODAL */}
      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => { setSelectedTask(null); setIsEditing(false); }}>
              <X size={24} />
            </button>
            
            {isEditing ? (
              <form onSubmit={handleSaveTaskEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h2 style={{ marginBottom: '1.5rem' }}>Editar Atividade</h2>
                
                <div className="input-group">
                  <label className="input-label">Título da Tarefa</label>
                  <input type="text" className="input-field" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
                </div>
                
                <div className="input-group">
                  <label className="input-label">Descrição</label>
                  <textarea className="input-field" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Data de Início</label>
                    <input type="date" className="input-field" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Prazo de Entrega</label>
                    <input type="date" className="input-field" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Prioridade</label>
                    <select className="input-field" value={editPriority} onChange={e => setEditPriority(e.target.value)}>
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                      <option value="critica">Crítica</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label className="input-label">Responsável</label>
                    <select className="input-field" value={editAssigneeId} onChange={e => setEditAssigneeId(e.target.value)}>
                      <option value="">Ninguém</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>{m.name} {m.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar Alterações</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className="badge badge-info">{selectedTask.list}</span>
                  <span className={`badge ${selectedTask.priority === 'alta' || selectedTask.priority === 'critica' ? 'badge-danger' : 'badge-info'}`}>{selectedTask.priority}</span>
                </div>

                <h2 style={{ marginBottom: '0.5rem' }}>{selectedTask.title}</h2>
                <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem' }}>{selectedTask.description || 'Sem descrição.'}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'hsla(var(--border), 0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.5rem' }}><strong>Data de Início:</strong> {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : 'Não informada'}</div>
                    <div><strong>Prazo final:</strong> {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString() : 'Sem prazo'}</div>
                  </div>
                  <div>
                    <div style={{ marginBottom: '0.5rem' }}><strong>Responsável:</strong> {teamMembers.find(m => m.id === selectedTask.assigneeId)?.name || 'Não atribuído'}</div>
                    <div><strong>Editar Responsável:</strong>
                      <select 
                        style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border))', color: '#fff', borderRadius: '4px', marginLeft: '0.5rem', padding: '2px 5px' }}
                        value={selectedTask.assigneeId || ''} 
                        onChange={e => handleUpdateTaskDetails({ ...selectedTask, assigneeId: e.target.value })}
                      >
                        <option value="">Ninguém</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={18} /> Checklist / Subtarefas</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    {(selectedTask.checklist || []).map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between', padding: '0.5rem', background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <input 
                            type="checkbox" 
                            checked={item.completed} 
                            onChange={() => toggleCheckItemInSelected(item.id)} 
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'hsl(var(--text-muted))' : '#fff' }}>{item.text}</span>
                        </div>
                        <button style={{ border: 'none', background: 'transparent', color: 'hsl(var(--danger))', cursor: 'pointer', fontSize: '0.75rem' }} onClick={() => deleteCheckItemInSelected(item.id)}>Excluir</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" className="input-field" placeholder="Novo item..." value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} />
                    <button className="btn btn-secondary" onClick={addCheckItemToSelected}>Adicionar</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', borderTop: '1px solid hsl(var(--border))', paddingTop: '1.5rem' }}>
                  <button className="btn btn-danger" onClick={() => handleDeleteTask(selectedTask.id)}><Trash2 size={16} /> Excluir Tarefa</button>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={startEditing}>Editar Atividade</button>
                    <button className="btn btn-secondary" onClick={() => setSelectedTask(null)}>Fechar</button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

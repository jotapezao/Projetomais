import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, BookOpen, Tag, ChevronRight, ArrowLeft, Trash2, Edit, HelpCircle, Shield, Layers, CreditCard, X } from 'lucide-react';
import client from '../api/client';
import { useLocation } from 'react-router-dom';

const CATEGORY_META = {
  'TI': { icon: Shield, gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))', color: '#60a5fa' },
  'Recursos Humanos': { icon: UsersIcon, gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(244, 63, 94, 0.15))', color: '#f43f5e' },
  'Financeiro': { icon: CreditCard, gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))', color: '#10b981' },
  'Dúvidas Frequentes': { icon: HelpCircle, gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.15))', color: '#fbbf24' },
  'Processos Internos': { icon: Layers, gradient: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(139, 92, 246, 0.15))', color: '#a78bfa' },
  'Todos': { icon: BookOpen, gradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))', color: 'var(--accent-primary)' }
};

function UsersIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const readUserRole = () => {
  const token = localStorage.getItem('token');
  if (!token) return '';
  try {
    return JSON.parse(atob(token.split('.')[1])).role || '';
  } catch {
    return '';
  }
};

export default function KnowledgeBase() {
  const location = useLocation();
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userRole] = useState(() => readUserRole());
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TI');
  const [content, setContent] = useState('');
  const [editId, setEditId] = useState(null);

  // Resolved tickets import state
  const [resolvedTickets, setResolvedTickets] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [loadingTickets, setLoadingTickets] = useState(false);

  const handleOpenImportModal = async () => {
    setShowImportModal(true);
    setLoadingTickets(true);
    try {
      const res = await client.get('/tickets');
      const resolved = res.data.filter(t => t.status === 'resolvido' || t.status === 'fechado');
      setResolvedTickets(resolved);
    } catch (err) {
      console.error("Erro ao buscar chamados resolvidos:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSelectTicket = (t) => {
    setTitle(`Solução: ${t.subject}`);
    
    let mappedCategory = 'Processos Internos';
    const ticketCat = (t.category || '').toLowerCase();
    if (ticketCat.includes('ti') || ticketCat.includes('infra') || ticketCat.includes('sistema') || ticketCat.includes('bug')) {
      mappedCategory = 'TI';
    } else if (ticketCat.includes('rh') || ticketCat.includes('recursos')) {
      mappedCategory = 'Recursos Humanos';
    } else if (ticketCat.includes('finan')) {
      mappedCategory = 'Financeiro';
    } else if (ticketCat.includes('dúvida') || ticketCat.includes('duvida')) {
      mappedCategory = 'Dúvidas Frequentes';
    }
    setCategory(mappedCategory);
    
    const resEvent = [...(t.history || [])].reverse().find(h => h.status === 'resolvido' || h.status === 'fechado');
    const resComment = resEvent ? resEvent.comment : 'Chamado resolvido pelo suporte.';
    const resBy = resEvent ? resEvent.userName : (t.operatorName || 'Suporte');
    const resDate = resEvent ? new Date(resEvent.updatedAt).toLocaleDateString() : new Date().toLocaleDateString();
    
    setContent(`### 📝 Descrição do Problema\n${t.description || 'Nenhuma descrição fornecida.'}\n\n### 💡 Solução Aplicada\n${resComment}\n\n---\n*Chamado de Origem: #${t.id} (${t.subject})*\n*Resolvido por: ${resBy} em ${resDate}*`);
    
    setShowImportModal(false);
    setImportSearchTerm('');
  };

  const categories = ['Todos', 'TI', 'Recursos Humanos', 'Financeiro', 'Dúvidas Frequentes', 'Processos Internos'];

  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach(c => {
      counts[c] = articles.filter(a => a.category === c).length;
    });
    counts['Todos'] = articles.length;
    return counts;
  }, [articles, categories]);

  const fetchArticles = async () => {
    try {
      const res = await client.get('/knowledge');
      setArticles(res.data);
    } catch (error) {
      console.error('Erro ao buscar artigos', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      void fetchArticles();
    });
  }, []);

  useEffect(() => {
    if (location.state?.prefillFromTicket) {
      const ticket = location.state.prefillFromTicket;
      
      // Prefill fields
      setTitle(`Solução: ${ticket.subject}`);
      
      // Map category
      let mappedCategory = 'Processos Internos';
      const ticketCat = (ticket.category || '').toLowerCase();
      if (ticketCat.includes('ti') || ticketCat.includes('infra') || ticketCat.includes('sistema') || ticketCat.includes('bug')) {
        mappedCategory = 'TI';
      } else if (ticketCat.includes('rh') || ticketCat.includes('recursos')) {
        mappedCategory = 'Recursos Humanos';
      } else if (ticketCat.includes('finan')) {
        mappedCategory = 'Financeiro';
      } else if (ticketCat.includes('dúvida') || ticketCat.includes('duvida')) {
        mappedCategory = 'Dúvidas Frequentes';
      }
      setCategory(mappedCategory);
      
      // Find resolution details in history
      const resEvent = [...(ticket.history || [])].reverse().find(h => h.status === 'resolvido' || h.status === 'fechado');
      const resComment = resEvent ? resEvent.comment : 'Chamado resolvido pelo suporte.';
      const resBy = resEvent ? resEvent.userName : (ticket.operatorName || 'Suporte');
      const resDate = resEvent ? new Date(resEvent.updatedAt).toLocaleDateString() : new Date().toLocaleDateString();
      
      setContent(`### 📝 Descrição do Problema\n${ticket.description || 'Nenhuma descrição fornecida.'}\n\n### 💡 Solução Aplicada\n${resComment}\n\n---\n*Chamado de Origem: #${ticket.id} (${ticket.subject})*\n*Resolvido por: ${resBy} em ${resDate}*`);
      
      setIsEditing(true);
      setSelectedArticle(null);
      
      // Clean state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const canManage = ['super_admin', 'admin', 'gestor'].includes(userRole);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;

    const data = { title, category, content };
    try {
      if (editId) {
        await client.put(`/knowledge/${editId}`, data);
      } else {
        await client.post('/knowledge', data);
      }
      setIsEditing(false);
      resetForm();
      fetchArticles();
    } catch (error) {
      console.error('Erro ao salvar artigo', error);
    }
  };

  const handleEdit = (article) => {
    setEditId(article.id);
    setTitle(article.title);
    setCategory(article.category);
    setContent(article.content);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este artigo?')) return;
    try {
      await client.delete(`/knowledge/${id}`);
      if (selectedArticle && selectedArticle.id === id) {
        setSelectedArticle(null);
      }
      fetchArticles();
    } catch (error) {
      console.error('Erro ao deletar artigo', error);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setCategory('TI');
    setContent('');
  };

  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          art.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || art.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div style={{ padding: '2rem' }}>Carregando base de conhecimento...</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '3rem' }}>
      {/* ── STYLES ─────────────────────────────────────────────────────── */}
      <style>{`
        .portal-hero {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 25, 50, 0.7) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 3rem 2rem;
          text-align: center;
          margin-bottom: 2.5rem;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        .portal-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .search-capsule {
          max-width: 600px;
          margin: 1.5rem auto 0 auto;
          position: relative;
          background: rgba(15, 25, 50, 0.65);
          backdrop-filter: blur(20px);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 100px;
          padding: 4px 12px;
          display: flex;
          align-items: center;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .search-capsule:focus-within {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.25);
        }
        .search-capsule input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          padding: 0.75rem 1rem;
          font-size: 1rem;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }
        .category-card {
          border-radius: 18px;
          padding: 1.5rem;
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          box-shadow: var(--shadow-sm);
        }
        .category-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
          border-color: hsla(var(--accent-primary-val), 0.45);
        }
        .category-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.25rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .article-card {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: var(--shadow-sm);
        }
        .article-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: hsla(var(--accent-primary-val), 0.45);
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Base de Conhecimento</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manuais, tutoriais e documentações corporativas da empresa.</p>
        </div>
        {canManage && !isEditing && (
          <button 
            className="btn btn-primary" 
            onClick={() => { resetForm(); setIsEditing(true); setSelectedArticle(null); }}
          >
            <Plus size={18} /> Novo Artigo
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => { setIsEditing(false); resetForm(); }} type="button">
                <ArrowLeft size={18} /> Voltar
              </button>
              <h2>{editId ? 'Editar Artigo' : 'Criar Novo Artigo'}</h2>
            </div>
            {!editId && (
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}
                onClick={handleOpenImportModal}
              >
                <Search size={16} /> Importar de Chamado Resolvido
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Título do Artigo</label>
              <input 
                type="text" 
                className="input-field" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="Ex: Como configurar a VPN da empresa" 
                required 
              />
            </div>
            
            <div className="input-group">
              <label className="input-label">Categoria</label>
              <select 
                className="input-field" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
              >
                {categories.filter(c => c !== 'Todos').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Conteúdo do Artigo</label>
              <textarea 
                className="input-field" 
                style={{ height: '300px', resize: 'vertical' }}
                value={content} 
                onChange={e => setContent(e.target.value)} 
                placeholder="Escreva os detalhes, passos e orientações do artigo..." 
                required 
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsEditing(false); resetForm(); }}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Salvar Artigo
              </button>
            </div>
          </form>
        </div>
      ) : selectedArticle ? (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedArticle(null)}>
              <ArrowLeft size={18} /> Voltar para a lista
            </button>
            {canManage && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => handleEdit(selectedArticle)}>
                  <Edit size={16} /> Editar
                </button>
                <button className="btn btn-danger" onClick={() => handleDelete(selectedArticle.id)}>
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge badge-info" style={{ textTransform: 'uppercase' }}>{selectedArticle.category}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Criado por {selectedArticle.createdByName || 'Sistema'} em {new Date(selectedArticle.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '1.5rem' }}>{selectedArticle.title}</h1>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>
            {selectedArticle.content}
          </div>
        </div>
      ) : (
        <div>
          {/* Hero Search Banner */}
          <div className="portal-hero">
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: 0 }}>Como podemos ajudar você hoje?</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>Encontre respostas rápidas sobre TI, processos, finanças e regras corporativas.</p>
            <div className="search-capsule">
              <Search size={20} color="var(--text-muted)" style={{ marginLeft: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="Pesquisar artigos de ajuda, tutoriais ou manuais..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && <X size={18} color="var(--text-muted)" style={{ cursor: 'pointer', marginRight: '0.5rem' }} onClick={() => setSearchTerm('')} />}
            </div>
          </div>

          {/* Categories Grid */}
          <div className="category-grid">
            {categories.map(cat => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.Todos;
              const IconComp = meta.icon;
              const count = categoryCounts[cat] || 0;
              const active = selectedCategory === cat;
              return (
                <div
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="category-card"
                  style={{
                    background: active ? 'hsla(var(--accent-primary-val), 0.15)' : 'var(--bg-card)',
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border)',
                    boxShadow: active ? 'var(--shadow-neon)' : 'none'
                  }}
                >
                  <div className="category-card-icon" style={{ background: meta.gradient }}>
                    <IconComp size={20} color={meta.color} />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: active ? 'var(--accent-primary)' : 'var(--text-primary)', margin: 0 }}>{cat === 'Todos' ? 'Todos os Manuais' : cat}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{count} {count === 1 ? 'artigo' : 'artigos'}</span>
                </div>
              );
            })}
          </div>

          {/* Articles list header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {selectedCategory === 'Todos' ? 'Artigos em Destaque' : `Artigos em ${selectedCategory}`}
            </h3>
            {selectedCategory !== 'Todos' && (
              <button 
                onClick={() => setSelectedCategory('Todos')}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Ver todos
              </button>
            )}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', borderRadius: '18px' }}>
              <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Nenhum artigo encontrado nesta categoria com os filtros atuais.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {filteredArticles.map(art => (
                <div 
                  key={art.id} 
                  className="article-card" 
                  onClick={() => setSelectedArticle(art)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Tag size={10} /> {art.category}
                      </span>
                      {canManage && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.25rem', border: 'none', background: 'transparent' }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(art.id); }}
                        >
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>{art.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.6 }}>
                      {art.content}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Por {art.createdByName || 'Sistema'}</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Ler mais →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', padding: '6px' }} onClick={() => { setShowImportModal(false); setImportSearchTerm(''); }} type="button">
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={20} color="var(--accent-primary)" />
              </div>
              <h2 style={{ margin: 0 }}>Importar Chamado Resolvido</h2>
            </div>

            {/* Search bar inside modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '100px', padding: '0 1rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Pesquisar por assunto ou ID do chamado..." 
                value={importSearchTerm} 
                onChange={e => setImportSearchTerm(e.target.value)} 
                style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.65rem 0', outline: 'none', color: 'var(--text-primary)', fontSize: '0.9rem' }} 
              />
              {importSearchTerm && <X size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setImportSearchTerm('')} />}
            </div>

            {/* Tickets list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px' }}>
              {loadingTickets ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  Carregando chamados...
                </div>
              ) : resolvedTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  Nenhum chamado resolvido encontrado.
                </div>
              ) : (() => {
                const filtered = resolvedTickets.filter(t => 
                  t.subject.toLowerCase().includes(importSearchTerm.toLowerCase()) || 
                  t.id.toLowerCase().includes(importSearchTerm.toLowerCase())
                );
                
                if (filtered.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Nenhum resultado para a busca.
                    </div>
                  );
                }
                
                return filtered.map(t => {
                  const resEvent = [...(t.history || [])].reverse().find(h => h.status === 'resolvido' || h.status === 'fechado');
                  const resComment = resEvent ? resEvent.comment : 'Sem comentário de resolução.';
                  return (
                    <div 
                      key={t.id} 
                      style={{ 
                        padding: '1.25rem', 
                        borderRadius: '12px', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'border-color 0.2s',
                        cursor: 'default'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{t.id.slice(-8)}</span>
                          <h4 style={{ margin: '2px 0 0 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.subject}</h4>
                        </div>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{t.category}</span>
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px', fontSize: '0.78rem' }}>Solução Aplicada:</strong>
                        {resComment}
                      </div>

                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={() => handleSelectTicket(t)}
                        style={{ alignSelf: 'flex-end', padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                      >
                        Selecionar e Preencher
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportSearchTerm(''); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

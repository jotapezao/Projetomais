import { useState, useEffect } from 'react';
import { Search, Plus, BookOpen, Tag, ChevronRight, ArrowLeft, Trash2, Edit } from 'lucide-react';
import client from '../api/client';

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

  const categories = ['Todos', 'TI', 'Recursos Humanos', 'Financeiro', 'Dúvidas Frequentes', 'Processos Internos'];

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Base de Conhecimento</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Manuais, tutorias e documentações corporativas da empresa.</p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => { setIsEditing(false); resetForm(); }}>
              <ArrowLeft size={18} /> Voltar
            </button>
            <h2>{editId ? 'Editar Artigo' : 'Criar Novo Artigo'}</h2>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '1.5rem' }}>
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
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
              Criado por {selectedArticle.createdByName || 'Sistema'} em {new Date(selectedArticle.createdAt).toLocaleDateString()}
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '1.5rem' }}>{selectedArticle.title}</h1>
          <div style={{ color: 'hsl(var(--text-secondary))', lineHeight: 1.8, fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>
            {selectedArticle.content}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>
          
          {/* Sidebar categories */}
          <div className="glass-card" style={{ padding: '1rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1rem', padding: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid hsl(var(--border))' }}>Categorias</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: selectedCategory === cat ? 'hsla(var(--accent-primary), 0.15)' : 'transparent',
                    color: selectedCategory === cat ? '#fff' : 'hsl(var(--text-secondary))',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{cat}</span>
                  <ChevronRight size={14} style={{ opacity: selectedCategory === cat ? 1 : 0.3 }} />
                </button>
              ))}
            </div>
          </div>

          {/* Articles list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} size={20} />
              <input 
                type="text" 
                className="input-field" 
                style={{ paddingLeft: '3rem' }} 
                placeholder="Pesquisar artigos de ajuda, tutoriais ou manuais..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredArticles.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Nenhum artigo encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {filteredArticles.map(art => (
                  <div 
                    key={art.id} 
                    className="glass-card" 
                    style={{ padding: '1.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    onClick={() => setSelectedArticle(art)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}><Tag size={10} style={{ marginRight: '0.25rem' }} /> {art.category}</span>
                        {canManage && (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.25rem', border: 'none', background: 'transparent' }}
                            onClick={(e) => { e.stopPropagation(); handleDelete(art.id); }}
                          >
                            <Trash2 size={14} color="hsl(var(--danger))" />
                          </button>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>{art.title}</h3>
                      <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.5 }}>
                        {art.content}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid hsla(var(--border), 0.5)', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                      <span>Por {art.createdByName || 'Sistema'}</span>
                      <span>Ler mais →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}

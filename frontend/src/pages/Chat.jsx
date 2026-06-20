import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Hash, User, Smile, Plus, Search, X } from 'lucide-react';
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

const readTokenUserId = () => {
  const token = localStorage.getItem('token');
  if (!token) return '';
  try {
    return JSON.parse(atob(token.split('.')[1])).id || '';
  } catch {
    return '';
  }
};

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId] = useState(() => readTokenUserId());
  
  // Search & Room Creation State
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('general');
  const [currentUser] = useState(() => readTokenPayload());

  const messagesEndRef = useRef(null);

  // Hidden File Attachment simulated states
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeRoom) return;

    setUploadFileName(file.name);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            try {
              const sizeKB = Math.round(file.size / 1024);
              const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
              const fileMessage = `📎 [Arquivo Anexado: ${file.name} (${sizeStr})]`;
              
              const res = await client.post('/chat/messages', {
                roomId: activeRoom.id,
                text: fileMessage
              });
              setMessages(prevMsgs => [...prevMsgs, res.data]);
            } catch (error) {
              console.error("Erro ao enviar anexo", error);
            } finally {
              setUploadProgress(null);
              setUploadFileName('');
            }
          }, 300);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  // Fetch rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await client.get('/chat/rooms');
        setRooms(res.data);
        if (res.data.length > 0) {
          setActiveRoom(res.data[0]);
        }
      } catch (error) {
        console.error('Erro ao buscar salas de chat', error);
      }
    };
    fetchRooms();
  }, []);

  // Fetch messages when active room changes, and set up polling
  useEffect(() => {
    if (!activeRoom) return;

    const fetchMessages = async () => {
      try {
        const res = await client.get(`/chat/messages/${activeRoom.id}`);
        setMessages(res.data);
      } catch (error) {
        console.error('Erro ao buscar mensagens do chat', error);
      }
    };

    fetchMessages();

    // Poll every 3 seconds for new messages
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;

    const textToSend = newMessage;
    setNewMessage('');

    try {
      const res = await client.post('/chat/messages', {
        roomId: activeRoom.id,
        text: textToSend
      });
      
      // Append the new message immediately for lag-free typing
      setMessages(prev => [...prev, res.data]);
    } catch (error) {
      console.error('Erro ao enviar mensagem', error);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const res = await client.post('/chat/rooms', {
        name: newRoomName,
        type: newRoomType
      });
      setRooms(prev => [...prev, res.data]);
      setActiveRoom(res.data);
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomType('general');
    } catch (error) {
      console.error('Erro ao criar canal de chat', error);
    }
  };

  const isAllowedToCreate = currentUser && ['system_admin', 'team_admin', 'channel_admin', 'super_admin', 'admin', 'gestor'].includes(currentUser.role);
  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      
      {/* Channels List */}
      <div className="glass-card" style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Canais</h2>
          {isAllowedToCreate && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '0.25rem', border: 'none', background: 'transparent', color: 'hsl(var(--text-secondary))' }}
              onClick={() => setShowCreateModal(true)}
              title="Criar novo canal"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Filter Input */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="input-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', background: 'hsl(var(--bg-secondary))', padding: '0 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border))' }}>
            <Search size={14} color="hsl(var(--text-muted))" style={{ marginRight: '0.25rem' }} />
            <input 
              type="text" 
              placeholder="Buscar canal ou contato..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '0.4rem', outline: 'none', color: '#fff', fontSize: '0.85rem' }} 
            />
          </div>
        </div>
        
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', margin: '0.5rem 0' }}>Grupos & Projetos</p>
          {filteredRooms.filter(r => r.type !== 'private').map(room => (
            <div 
              key={room.id} 
              onClick={() => setActiveRoom(room)}
              style={{ 
                padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: activeRoom?.id === room.id ? 'hsla(var(--accent-primary), 0.15)' : 'transparent',
                color: activeRoom?.id === room.id ? '#fff' : 'hsl(var(--text-secondary))'
              }}
            >
              <Hash size={16} />
              <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: activeRoom?.id === room.id ? '500' : '400' }}>{room.name}</span>
            </div>
          ))}

          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', margin: '1.5rem 0 0.5rem 0' }}>Diretas (Usuários)</p>
          {filteredRooms.filter(r => r.type === 'private').map(room => (
            <div 
              key={room.id} 
              onClick={() => setActiveRoom(room)}
              style={{ 
                padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: activeRoom?.id === room.id ? 'hsla(var(--accent-primary), 0.15)' : 'transparent',
                color: activeRoom?.id === room.id ? '#fff' : 'hsl(var(--text-secondary))'
              }}
            >
              <User size={16} />
              <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: activeRoom?.id === room.id ? '500' : '400' }}>{room.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Chat Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {activeRoom?.type === 'private' ? <User size={24} color="hsl(var(--accent-primary))" /> : <Hash size={24} color="hsl(var(--accent-primary))" />}
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{activeRoom?.name}</h2>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
              {activeRoom?.type === 'company' ? 'Empresa inteira' : activeRoom?.type === 'private' ? 'Status: Online' : 'Membros do projeto'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', marginTop: '2rem' }}>
              Nenhuma mensagem por aqui. Envie a primeira mensagem!
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '500', color: isMine ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-secondary))' }}>
                      {isMine ? 'Você' : msg.senderName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{msg.time}</span>
                  </div>
                  <div style={{ 
                    padding: '0.75rem 1rem', 
                    background: isMine ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-secondary))',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    borderTopRightRadius: isMine ? '0' : 'var(--radius-md)',
                    borderTopLeftRadius: !isMine ? '0' : 'var(--radius-md)',
                    maxWidth: '70%',
                    lineHeight: 1.5,
                    fontSize: '0.95rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {uploadProgress !== null && (
          <div style={{ padding: '0.5rem 1.5rem', background: 'hsla(var(--accent-primary), 0.1)', borderTop: '1px solid hsla(var(--accent-primary), 0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--accent-primary-hover))' }}>Enviando {uploadFileName}...</span>
            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'hsl(var(--accent-primary))', transition: 'width 0.1s ease' }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{uploadProgress}%</span>
          </div>
        )}
        <div style={{ padding: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            <div style={{ flex: 1, background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'flex', alignItems: 'flex-end', border: '1px solid hsl(var(--border))' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ padding: '0.5rem', color: 'hsl(var(--text-muted))' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={20} />
              </button>
              <textarea 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                placeholder={activeRoom ? `Mensagem em ${activeRoom.name}...` : 'Carregando chat...'}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '0.5rem', outline: 'none', resize: 'none', height: '40px', fontFamily: 'inherit' }}
                disabled={!activeRoom}
              />
              <button type="button" className="btn" style={{ padding: '0.5rem', color: 'hsl(var(--text-muted))' }}><Smile size={20} /></button>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 1.2rem' }} disabled={!activeRoom}><Send size={18} /></button>
          </form>
        </div>

      </div>

      {/* CREATE CHANNEL MODAL */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', position: 'relative' }}>
            <button style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setShowCreateModal(false)}>
              <X size={20} />
            </button>
            <h2 style={{ marginBottom: '1.5rem' }}>Criar Novo Canal</h2>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label className="input-label">Nome do Canal</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newRoomName} 
                  onChange={e => setNewRoomName(e.target.value)} 
                  placeholder="ex: dep-compras" 
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Tipo de Canal</label>
                <select className="input-field" value={newRoomType} onChange={e => setNewRoomType(e.target.value)}>
                  <option value="general">Geral</option>
                  <option value="process">Processo</option>
                  <option value="department">Departamento</option>
                  <option value="store">Loja / Unidade</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Hash, User, Smile } from 'lucide-react';
import client from '../api/client';

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
  const messagesEndRef = useRef(null);

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

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      
      {/* Channels List */}
      <div className="glass-card" style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Canais & Mensagens</h2>
        </div>
        
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', margin: '0.5rem 0' }}>Grupos & Projetos</p>
          {rooms.filter(r => r.type !== 'private').map(room => (
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
          {rooms.filter(r => r.type === 'private').map(room => (
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
        <div style={{ padding: '1.5rem', borderTop: '1px solid hsl(var(--border))' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, background: 'hsl(var(--bg-secondary))', borderRadius: 'var(--radius-md)', padding: '0.5rem', display: 'flex', alignItems: 'flex-end', border: '1px solid hsl(var(--border))' }}>
              <button type="button" className="btn" style={{ padding: '0.5rem', color: 'hsl(var(--text-muted))' }}><Paperclip size={20} /></button>
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
    </div>
  );
}

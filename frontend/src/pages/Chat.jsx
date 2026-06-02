import { useState, useEffect } from 'react';
import { Send, Paperclip, Hash, User, Smile } from 'lucide-react';
import client from '../api/client';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  // Local state just for simulation UI
  useEffect(() => {
    // In a real app we would load from /api/chat. 
    // For this prototype, we'll mock the channels.
    const mockRooms = [
      { id: 'r1', name: 'Geral Mais Tecnologia', type: 'company', unread: 0 },
      { id: 'r2', name: 'Equipe: Desenvolvimento', type: 'team', unread: 2 },
      { id: 'r3', name: 'Projeto: Novo Portal', type: 'project', unread: 0 },
      { id: 'u1', name: 'João Paulo', type: 'private', unread: 0 },
    ];
    setRooms(mockRooms);
    setActiveRoom(mockRooms[0]);
    
    setMessages([
      { id: 'm1', sender: 'Sistema', text: 'Bem vindo ao chat corporativo.', time: '10:00' },
      { id: 'm2', sender: 'João Paulo', text: 'Bom dia pessoal! A atualização da AWS ocorre hoje.', time: '10:05' },
    ]);
  }, []);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const newMsg = {
      id: `m${Date.now()}`,
      sender: 'Você', // Since we don't have global user state here easily without context
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
    
    // Simulate reply
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `m${Date.now()+1}`,
        sender: 'Simulador',
        text: 'Mensagem recebida e processada! (Chat em tempo real seria via Socket.io)',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: '1.5rem' }}>
      
      {/* Channels List */}
      <div className="glass-card" style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Canais & Mensagens</h2>
        </div>
        
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          
          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', margin: '0.5rem 0' }}>Grupos</p>
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
              {room.unread > 0 && <span style={{ background: 'hsl(var(--accent-primary))', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{room.unread}</span>}
            </div>
          ))}

          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', margin: '1.5rem 0 0.5rem 0' }}>Diretas</p>
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
              {activeRoom?.type === 'company' ? 'Empresa inteira' : activeRoom?.type === 'private' ? 'Status: Online' : 'Membros da equipe'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: msg.isMine ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-secondary))' }}>
                  {msg.sender}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>{msg.time}</span>
              </div>
              <div style={{ 
                padding: '0.75rem 1rem', 
                background: msg.isMine ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-secondary))',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                borderTopRightRadius: msg.isMine ? '0' : 'var(--radius-md)',
                borderTopLeftRadius: !msg.isMine ? '0' : 'var(--radius-md)',
                maxWidth: '70%',
                lineHeight: 1.5,
                fontSize: '0.95rem'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
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
                placeholder={`Mensagem em ${activeRoom?.name}...`}
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '0.5rem', outline: 'none', resize: 'none', height: '40px', fontFamily: 'inherit' }}
              />
              <button type="button" className="btn" style={{ padding: '0.5rem', color: 'hsl(var(--text-muted))' }}><Smile size={20} /></button>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem 1.2rem' }}><Send size={18} /></button>
          </form>
        </div>

      </div>
    </div>
  );
}

import { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import client from '../api/client';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao conectar no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'Super Admin', email: 'admin@maistecnologia.com' },
    { name: 'Gestor', email: 'gestor@maistecnologia.com' },
    { name: 'Operador', email: 'operador@maistecnologia.com' },
    { name: 'Cliente', email: 'cliente@alphacorp.com' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, hsl(222, 47%, 8%) 0%, hsl(252, 87%, 15%) 100%)',
      padding: '2rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '1000px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        
        {/* Left Side - Branding */}
        <div style={{
          padding: '4rem 3rem',
          background: 'linear-gradient(145deg, hsla(var(--accent-primary), 0.2), transparent)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <ShieldCheck size={48} color="hsl(var(--accent-primary))" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, hsl(var(--text-secondary)))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Gestão Integrada 360º
            </h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Sistema corporativo profissional para gestão de tarefas, projetos interativos, controle rigoroso de chamados e comunicação corporativa inteligente.
            </p>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
              Acesso Rápido para Demonstração:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => setEmail(acc.email)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-full)' }}
                >
                  {acc.name}
                </button>
              ))}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
              * A senha padrão para demonstração é "123456"
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{
          padding: '4rem 3rem',
          background: 'hsl(var(--bg-card))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '2rem', textAlign: 'center' }}>Acesso ao Sistema</h2>
          
          {error && (
            <div style={{ background: 'hsla(var(--danger), 0.1)', color: 'hsl(var(--danger))', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid hsla(var(--danger), 0.2)', textAlign: 'center', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="input-group">
              <label className="input-label">E-mail Corporativo</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: '2.75rem' }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '1rem', fontSize: '1rem' }} disabled={loading}>
              {loading ? 'Autenticando...' : 'Entrar'} <ArrowRight size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

import { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, User } from 'lucide-react';
import client from '../api/client';

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  
  // Registration Form fields
  const [regName, setRegName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await client.post('/auth/register', {
        name: regName,
        lastName: regLastName,
        email: regEmail,
        password: regPassword
      });
      setSuccess('Cadastro corporativo realizado com sucesso! Faça login abaixo.');
      setIsRegistering(false);
      // Autofill email
      setEmail(regEmail);
      setPassword(regPassword);
      // Reset registration form
      setRegName('');
      setRegLastName('');
      setRegEmail('');
      setRegPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'System Admin (João Paulo)', email: 'joaopaulo@modaverao.com.br' },
    { name: 'Team Admin (Gerente)', email: 'gerente@modaverao.com.br' },
    { name: 'Channel Admin', email: 'responsavel@modaverao.com.br' },
    { name: 'Membro (Lucas)', email: 'membro@modaverao.com.br' },
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
              Lojas Moda Verão
            </h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.1rem', lineHeight: 1.6 }}>
              Plataforma profissional de processos, incidentes corporativos, canais padronizados de comunicação e cronogramas integrados.
            </p>
          </div>
          
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
              Acesso Rápido para Demonstração:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('123456');
                    setIsRegistering(false);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', justifyContent: 'flex-start', borderRadius: 'var(--radius-md)' }}
                >
                  <span style={{ fontWeight: '600' }}>{acc.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginLeft: 'auto' }}>{acc.email}</span>
                </button>
              ))}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
              * A senha de demonstração para todos os usuários é "123456"
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div style={{
          padding: '4rem 3rem',
          background: 'hsl(var(--bg-card))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          borderLeft: '1px solid hsl(var(--border))'
        }}>
          
          {isRegistering ? (
            // REGISTRATION FORM
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', textAlign: 'center' }}>Cadastro Corporativo</h2>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textAlign: 'center', marginBottom: '1.5rem' }}>
                Permitido apenas para e-mails institucionais <strong>@modaverao.com.br</strong>
              </p>

              {error && (
                <div style={{ background: 'hsla(var(--danger), 0.1)', color: 'hsl(var(--danger))', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid hsla(var(--danger), 0.2)', textAlign: 'center', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="input-label">Nome</label>
                    <input type="text" className="input-field" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Ex: João" required />
                  </div>
                  <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="input-label">Sobrenome</label>
                    <input type="text" className="input-field" value={regLastName} onChange={e => setRegLastName(e.target.value)} placeholder="Ex: Silva" required />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">E-mail @modaverao.com.br</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input type="email" className="input-field" style={{ paddingLeft: '2.5rem' }} value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="loja01+teste@modaverao.com.br" required />
                  </div>
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label className="input-label">Senha</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
                    <input type="password" className="input-field" style={{ paddingLeft: '2.5rem' }} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Criar Conta Corporativa'}
                </button>

                <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }} onClick={() => { setIsRegistering(false); setError(''); }}>
                  Já tenho conta (Voltar)
                </button>
              </form>
            </div>
          ) : (
            // LOGIN FORM
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '2rem', textAlign: 'center' }}>Acesso ao Sistema</h2>
              
              {success && (
                <div style={{ background: 'hsla(var(--success), 0.1)', color: 'hsl(var(--success-light))', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid hsla(var(--success), 0.2)', textAlign: 'center', fontSize: '0.9rem' }}>
                  {success}
                </div>
              )}

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
                      placeholder="seu@modaverao.com.br"
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

                <button type="button" className="btn btn-secondary" style={{ width: '100%', padding: '0.875rem' }} onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); }}>
                  Criar Conta Corporativa
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

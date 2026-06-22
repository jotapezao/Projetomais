import { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
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
    <div className="login-container">
      {/* ── STYLES ─────────────────────────────────────────────────────── */}
      <style>{`
        .login-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #06142D;
          background-image: radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%),
                            radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 40%);
          padding: 2rem;
          box-sizing: border-box;
        }
        .login-card {
          max-width: 1000px;
          width: 100%;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          border-radius: 24px;
          background: rgba(15, 25, 50, 0.55);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .login-card {
            grid-template-columns: 1fr;
          }
          .login-branding {
            display: none !important;
          }
        }
        .login-branding {
          padding: 4rem 3rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-form-container {
          padding: 4rem 3rem;
          background: rgba(15, 25, 50, 0.3);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .login-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .login-input {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1.5px solid rgba(255, 255, 255, 0.06) !important;
          color: #fff !important;
          border-radius: 12px !important;
          padding: 0.8rem 1rem !important;
          font-size: 0.92rem !important;
          transition: all 0.2s ease !important;
          width: 100%;
          outline: none;
          box-sizing: border-box;
        }
        .login-input:focus {
          border-color: rgba(99, 102, 241, 0.5) !important;
          background: rgba(255, 255, 255, 0.05) !important;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.2) !important;
        }
        .demo-btn {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          color: var(--text-secondary) !important;
          transition: all 0.2s ease !important;
          cursor: pointer;
        }
        .demo-btn:hover {
          background: rgba(99, 102, 241, 0.12) !important;
          border-color: rgba(99, 102, 241, 0.3) !important;
          color: #fff !important;
        }
      `}</style>

      <div className="login-card">
        
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div style={{ marginBottom: '2rem' }}>
            <ShieldCheck size={48} color="var(--accent-primary)" style={{ marginBottom: '1.25rem' }} />
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', color: 'transparent', letterSpacing: '-0.02em' }}>
              Lojas Moda Verão
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
              Plataforma profissional de processos, incidentes corporativos, canais padronizados de comunicação e cronogramas integrados.
            </p>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
              Acesso Rápido para Demonstração:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {demoAccounts.map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword('123456');
                    setIsRegistering(false);
                  }}
                  className="btn btn-secondary demo-btn"
                  style={{ fontSize: '0.8rem', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', borderRadius: '10px', alignItems: 'center' }}
                >
                  <span style={{ fontWeight: '600' }}>{acc.name}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>{acc.email}</span>
                </button>
              ))}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '1rem 0 0 0' }}>
              * A senha de demonstração para todos os usuários é "123456"
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-form-container">
          
          {isRegistering ? (
            // REGISTRATION FORM
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center', color: '#fff' }}>Cadastro Corporativo</h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.75rem', margin: '0 0 1.75rem 0' }}>
                Permitido apenas para e-mails institucionais <strong>@modaverao.com.br</strong>
              </p>

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div className="login-input-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Nome</label>
                    <input type="text" className="login-input" value={regName} onChange={e => setRegName(e.target.value)} placeholder="João" required />
                  </div>
                  <div className="login-input-group" style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sobrenome</label>
                    <input type="text" className="login-input" value={regLastName} onChange={e => setRegLastName(e.target.value)} placeholder="Silva" required />
                  </div>
                </div>

                <div className="login-input-group">
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>E-mail corporativo</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="email" className="login-input" style={{ paddingLeft: '2.5rem !important' }} value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="colaborador@modaverao.com.br" required />
                  </div>
                </div>

                <div className="login-input-group">
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input type="password" className="login-input" style={{ paddingLeft: '2.5rem !important' }} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', borderRadius: '12px' }} disabled={loading}>
                  {loading ? 'Cadastrando...' : 'Criar Conta Corporativa'}
                </button>

                <button type="button" className="btn btn-secondary demo-btn" style={{ width: '100%', padding: '0.8rem', borderRadius: '12px' }} onClick={() => { setIsRegistering(false); setError(''); }}>
                  Já tenho conta (Voltar)
                </button>
              </form>
            </div>
          ) : (
            // LOGIN FORM
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1.75rem', textAlign: 'center', color: '#fff' }}>Acesso ao Sistema</h2>
              
              {success && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center', fontSize: '0.85rem' }}>
                  {success}
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="login-input-group">
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>E-mail Corporativo</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      className="login-input"
                      style={{ paddingLeft: '2.5rem !important' }}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@modaverao.com.br"
                      required
                    />
                  </div>
                </div>

                <div className="login-input-group">
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Senha</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      className="login-input"
                      style={{ paddingLeft: '2.5rem !important' }}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.75rem', fontSize: '0.95rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={loading}>
                  {loading ? 'Autenticando...' : 'Entrar'} <ArrowRight size={16} />
                </button>

                <button type="button" className="btn btn-secondary demo-btn" style={{ width: '100%', padding: '0.875rem', borderRadius: '12px' }} onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); }}>
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

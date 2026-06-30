"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      
      // Redirect after login
      if (typeof window !== 'undefined') {
        const redirect = localStorage.getItem("post_login_redirect");
        if (redirect) {
          localStorage.removeItem("post_login_redirect");
          router.push(redirect);
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao autenticar com o Google.');
    }
  };

  return (
    <main style={{ paddingTop: '120px', minHeight: '80vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-cyan-glow)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Entrar na NSNexus</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '5px' }}>Acesse sua área de estudos corporativa</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: 'var(--font-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ marginTop: '10px', justifyContent: 'center' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
          <span style={{ padding: '0 10px', fontSize: 'var(--font-xs)' }}>OU</span>
          <hr style={{ flex: 1, border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="btn btn-secondary btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
            <path fill="currentColor" d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.133 1 1.2 5.926 1.2 12s4.933 11 11.04 11c6.38 0 10.614-4.484 10.614-10.8 0-.727-.08-1.282-.177-1.915H12.24Z"/>
          </svg>
          Entrar com o Google
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
          Não tem uma conta? <Link href="/registro" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Cadastre-se</Link>
        </div>

      </div>
    </main>
  );
}

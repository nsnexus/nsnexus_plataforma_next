"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../utils/firebase/client';
import { collection, query, where, getDocs } from 'firebase/firestore/lite';

export default function LoginPage() {
  const { user, signIn, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password recovery states
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirect = localStorage.getItem("post_login_redirect");
      if (redirect) {
        localStorage.removeItem("post_login_redirect");
        window.location.href = redirect;
      } else if (user.enrolledCourses && user.enrolledCourses.length > 0) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/cursos';
      }
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await signIn(email, password);
      
      // Redirect after login using window.location for reliable navigation
      const redirect = localStorage.getItem("post_login_redirect");
      if (redirect) {
        localStorage.removeItem("post_login_redirect");
        window.location.href = redirect;
      } else {
        // Fetch approved purchases to see if user has bought any courses
        const purchasesRef = collection(db, 'purchases');
        const pq = query(purchasesRef, where('user_id', '==', loggedUser.uid), where('status', '==', 'approved'));
        const purchasesSnapshot = await getDocs(pq);
        if (!purchasesSnapshot.empty) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/cursos';
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await resetPassword(resetEmail);
      setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada para redefinir sua senha.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao enviar e-mail de recuperação. Verifique o endereço digitado.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const loggedUser = await signInWithGoogle();
      
      // Redirect after Google login
      const redirect = localStorage.getItem("post_login_redirect");
      if (redirect) {
        localStorage.removeItem("post_login_redirect");
        window.location.href = redirect;
      } else {
        // Fetch approved purchases
        const purchasesRef = collection(db, 'purchases');
        const pq = query(purchasesRef, where('user_id', '==', loggedUser.uid), where('status', '==', 'approved'));
        const purchasesSnapshot = await getDocs(pq);
        if (!purchasesSnapshot.empty) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/cursos';
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao autenticar com o Google.');
    }
  };

  return (
    <main style={{ paddingTop: '120px', minHeight: '80vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-cyan-glow)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>
            {isResetMode ? 'Recuperar Senha' : 'Entrar na NSNexus'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '5px' }}>
            {isResetMode ? 'Digite seu e-mail para receber o link de redefinição' : 'Acesse sua área de estudos corporativa'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: 'var(--font-sm)' }}>
            {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: 'rgba(0, 245, 212, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: 'var(--font-sm)' }}>
            {successMessage}
          </div>
        )}

        {!isResetMode ? (
          <>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Senha</label>
                  <button 
                    type="button"
                    onClick={() => { setIsResetMode(true); setError(''); setSuccessMessage(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: 'var(--font-xs)', cursor: 'pointer', padding: 0 }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%', padding: '10px 40px 10px 10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', width: '100%' }}
            >
              <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
                <path fill="currentColor" d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.133 1 1.2 5.926 1.2 12s4.933 11 11.04 11c6.38 0 10.614-4.484 10.614-10.8 0-.727-.08-1.282-.177-1.915H12.24Z"/>
              </svg>
              Entrar com o Google
            </button>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
              Não tem uma conta? <Link href="/registro" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>Cadastre-se</Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>E-mail Cadastrado</label>
              <input 
                type="email" 
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary btn-full"
              style={{ marginTop: '10px', justifyContent: 'center' }}
            >
              {loading ? 'Enviando...' : 'Enviar E-mail de Recuperação'}
            </button>

            <button 
              type="button" 
              onClick={() => { setIsResetMode(false); setError(''); setSuccessMessage(''); }}
              className="btn btn-secondary btn-full"
              style={{ justifyContent: 'center' }}
            >
              Voltar para o Login
            </button>
          </form>
        )}

      </div>
    </main>
  );
}

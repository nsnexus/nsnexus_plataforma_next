"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setCheckingSession(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Link de recuperação inválido ou expirado. Solicite um novo link na página de login.');
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess('Senha atualizada com sucesso! Redirecionando para o painel...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao atualizar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ paddingTop: '120px', minHeight: '80vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      <div style={{ background: 'rgba(15, 23, 42, 0.45)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-cyan-glow)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'bold' }}>Definir Nova Senha</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: '5px' }}>Digite sua nova credencial de acesso</p>
        </div>

        {checkingSession ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)' }}>
            Verificando sessão de recuperação...
          </div>
        ) : (
          <>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: 'var(--font-sm)', lineHeight: 1.4 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ background: 'rgba(0, 245, 212, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: 'var(--font-sm)' }}>
                {success}
              </div>
            )}

            {!error && (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Nova Senha</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a nova senha novamente"
                    style={{ padding: '10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary btn-full"
                  style={{ marginTop: '10px', justifyContent: 'center' }}
                >
                  {loading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </form>
            )}
          </>
        )}

      </div>
    </main>
  );
}

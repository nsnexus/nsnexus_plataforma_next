"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      console.warn("Acesso negado: o usuário não possui a role 'admin'");
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '50px', height: '50px', borderRadius: '50%', borderLeftColor: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}></div>
        <p>Verificando credenciais...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return children;
};

export default AdminRoute;

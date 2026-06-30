"use client";
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem("post_login_redirect", pathname);
      }
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', width: '50px', height: '50px', borderRadius: '50%', borderLeftColor: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}></div>
        <p>Carregando conta...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
};

export default ProtectedRoute;

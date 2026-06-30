"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted the cookie policy
    const isAccepted = localStorage.getItem('nsnexus-cookie-consent');
    if (!isAccepted) {
      // Show the banner with a slight delay for a smoother entrance
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('nsnexus-cookie-consent', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="cookie-consent-banner"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        right: '24px',
        maxWidth: '560px',
        margin: '0 auto',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 245, 212, 0.25)',
        borderRadius: '16px',
        padding: '20px',
        zIndex: 1000,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 245, 212, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        animation: 'slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        color: 'white',
      }}
    >
      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .cookie-btn-accept {
          background: linear-gradient(135deg, var(--accent-blue, #0052ff) 0%, var(--accent-cyan, #00f5d4) 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 245, 212, 0.2);
        }
        .cookie-btn-accept:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 245, 212, 0.4);
          filter: brightness(1.1);
        }
        .cookie-btn-accept:active {
          transform: translateY(0);
        }
        .cookie-link {
          color: var(--accent-cyan, #00f5d4);
          text-decoration: underline;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .cookie-link:hover {
          color: white;
        }
        @media (min-width: 640px) {
          .cookie-consent-banner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            left: 24px;
            right: auto;
          }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div
          style={{
            fontSize: '24px',
            background: 'rgba(0, 245, 212, 0.1)',
            border: '1px solid rgba(0, 245, 212, 0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          🍪
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', letterSpacing: '0.02em' }}>
            Controle de Privacidade
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: '1.5' }}>
            Nós utilizamos cookies para otimizar sua experiência na plataforma. Ao continuar navegando, você concorda com nossas{' '}
            <Link href="/termos" className="cookie-link">
              Políticas de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end', flexShrink: 0 }}>
        <button onClick={handleAccept} className="cookie-btn-accept">
          Aceitar
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;

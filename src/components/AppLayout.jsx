"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';
import VirtualAssistant from './VirtualAssistant';
import CookieConsent from './CookieConsent';

export const AppLayout = ({ children }) => {
  const pathname = usePathname();
  const showHeaderFooter = !pathname.startsWith('/admin') && !pathname.startsWith('/player');

  return (
    <>
      {showHeaderFooter && <Navbar />}
      <div style={{ flexGrow: 1 }}>
        {children}
      </div>
      {showHeaderFooter && <Footer />}
      <VirtualAssistant />
      <CookieConsent />
    </>
  );
};

export default AppLayout;

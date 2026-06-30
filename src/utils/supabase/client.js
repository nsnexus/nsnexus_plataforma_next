import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const isBrowser = typeof window !== 'undefined';
  
  // Use dynamic window origin in browser, or fallback to env URL / placeholder on server to prevent SSR crashes
  const url = isBrowser 
    ? `${window.location.origin}/supabase-api` 
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xdejjgeigrbsbkqakari.supabase.co');

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

  return createBrowserClient(url, key);
};

import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  const isBrowser = typeof window !== 'undefined';
  const url = isBrowser ? `${window.location.origin}/supabase-api` : process.env.NEXT_PUBLIC_SUPABASE_URL;

  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

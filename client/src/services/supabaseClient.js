import { createClient } from '@supabase/supabase-js';

// CRITICAL SECURITY ASSERTION:
// Under NO circumstances should SUPABASE_SERVICE_ROLE_KEY ever be accessible to the frontend client!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'CRITICAL SECURITY VIOLATION: Supabase Service Role Key detected in frontend bundle! ' +
    'Service-role credentials must strictly reside on the backend server.'
  );
}

// Client initialized strictly with public Anon key
export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('mock-opspilot'))
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export default supabase;

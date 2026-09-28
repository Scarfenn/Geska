import { createClient } from 'npm:@supabase/supabase-js@2.109.0';
import { createDeleteAccountHandler } from './handler.js';

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
Deno.serve(createDeleteAccountHandler({
  verifyUser: jwt => createClient(
    Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), options,
  ).auth.getUser(jwt),
  // This credential is supplied by the Edge runtime, never bundled into Expo.
  createAdmin: () => createClient(
    Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), options,
  ),
}));

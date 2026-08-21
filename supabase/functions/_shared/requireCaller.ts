// Caller verification for edge functions.
//
// WHY THIS EXISTS: Supabase's platform `verify_jwt` gate is NOT an auth
// boundary. It accepts the project's public anon key as a valid JWT, and that
// key ships in the browser bundle -- so any function without its own check is
// callable by any visitor to the site. Two functions were found doing
// privileged work on that basis (an owner-password reset and a role-settable
// user invite), both amounting to full account takeover.
//
// Every function that reads private data or mutates state must call one of
// these before doing anything else.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type HubRole = 'owner' | 'admin' | 'hr' | 'contractor' | 'employee';

export interface Caller {
  id: string;
  email: string | null;
  role: HubRole;
}

/** Thrown when the caller can't be verified. Carries the HTTP status to return. */
export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Resolves the human behind the request from their Authorization bearer token.
 *
 * Passing the anon key here yields no user, which is exactly the point: the
 * anon key identifies the project, never a person.
 */
export async function getCaller(req: Request, admin: SupabaseClient): Promise<Caller> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) throw new AuthError(401, 'Not authenticated');

  const { data: { user } = { user: null } } = await admin.auth.getUser(jwt);
  if (!user) throw new AuthError(401, 'Not authenticated');

  const { data: hubUser } = await admin
    .from('hub_users')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!hubUser) throw new AuthError(403, 'Not a hub user');

  return { id: user.id, email: hubUser.email ?? user.email ?? null, role: hubUser.role as HubRole };
}

/** Caller must be owner/admin/hr. Use for anything touching other people's data. */
export async function requireAdmin(req: Request, admin: SupabaseClient): Promise<Caller> {
  const caller = await getCaller(req, admin);
  if (!['owner', 'admin', 'hr'].includes(caller.role)) {
    throw new AuthError(403, 'Not authorized');
  }
  return caller;
}

/** Turns an AuthError into a Response; rethrows anything else. */
export function authErrorResponse(e: unknown, cors: Record<string, string>): Response | null {
  if (e instanceof AuthError) {
    return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: cors });
  }
  return null;
}

/** Service-role client for functions that need to act after verifying the caller. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

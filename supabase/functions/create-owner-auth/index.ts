import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Reset password for Francis (auth id confirmed: 7a2ac130-53c6-4402-a43c-98cc320639dd)
  const { data, error } = await supabase.auth.admin.updateUserById(
    '7a2ac130-53c6-4402-a43c-98cc320639dd',
    { password: 'HunaOwner2026!' }
  );

  return new Response(JSON.stringify({
    ok: !error,
    error: error?.message,
    email: data?.user?.email,
    temp_password: 'HunaOwner2026!',
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
});

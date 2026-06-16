-- Allow contractors to read their own daily hours rows (for payouts page)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'hub_daily_hours'
      and policyname = 'Contractors can read own hours'
  ) then
    execute $p$
      create policy "Contractors can read own hours"
      on hub_daily_hours
      for select
      to authenticated
      using (user_id = auth.uid())
    $p$;
  end if;
end $$;

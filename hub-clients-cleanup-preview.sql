-- READ-ONLY preview for hub-clients-cleanup.sql. Changes nothing.
select 'delete project' as change, p.id::text as id, p.project_name as name,
       format('tasks %s, team %s, payments %s, costs %s, reminders %s, monthly %s',
         (select count(*) from hub_project_tasks t where t.project_id = p.id),
         (select count(*) from hub_project_contractors x where x.project_id = p.id),
         (select count(*) from hub_project_payments x where x.project_id = p.id),
         (select count(*) from hub_project_costs x where x.project_id = p.id),
         (select count(*) from hub_payment_reminders x where x.project_id = p.id),
         p.monthly_rate) as detail
  from hub_projects p where p.id in (28, 29, 30, 31)
union all
select 'rename client', c.id::text, c.client_name, '→ ' || v.new_name
  from hub_clients c
  join (values (9,'Hulma Fiberglass'),(10,'SmartGrid Western'),(11,'DH Ultimate'),(12,'Maison Aeria Pilates'),
               (14,'Peak Coffee Roasters'),(17,'FS Architects'),(19,'Obra Majoralia'),(20,'Asana Pilates')) v(id, new_name)
    on v.id = c.id
union all
select 'merge + remove client', c.id::text, c.client_name,
       format('into #%s %s; assignments %s, chats %s', v.into_id, (select client_name from hub_clients where id = v.into_id),
         (select count(*) from hub_client_assignments a where a.client_id = c.id),
         (select count(*) from hub_chat_conversations cv where cv.client_id = c.id))
  from hub_clients c
  join (values (15, 1), (21, 3), (8, 7)) v(id, into_id) on v.id = c.id
union all
select 'credential using a person name', cr.id::text, cr.client_name, cr.platform
  from hub_credentials cr
 where lower(trim(cr.client_name)) in ('ava masaya','chris nguyen','christine dela calzada','clare ventura','dan hong',
                                       'fretz suralta','jonathan cruz','thamara ong','derek choi','victor romero','angelica lim')
order by 1, 2;

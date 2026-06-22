-- Performance indexes for frequently queried FK columns
create index if not exists hub_project_contractors_project_id_idx
  on hub_project_contractors(project_id);

create index if not exists hub_project_contractors_contractor_id_idx
  on hub_project_contractors(contractor_id);

create index if not exists hub_project_task_comments_task_id_idx
  on hub_project_task_comments(task_id);

create index if not exists hub_project_task_activity_task_id_idx
  on hub_project_task_activity(task_id);

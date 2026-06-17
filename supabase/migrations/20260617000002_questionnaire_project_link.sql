alter table hub_questionnaires
  add column if not exists project_id bigint references hub_projects(id) on delete set null;

create index if not exists hub_questionnaires_project_id_idx on hub_questionnaires(project_id);

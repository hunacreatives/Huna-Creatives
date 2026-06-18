-- Allow contractors to read submitted questionnaires for projects they're assigned to
create policy "Contractors read questionnaires for their projects"
  on hub_questionnaires for select
  using (
    project_id is not null
    and exists (
      select 1 from hub_project_contractors
      where hub_project_contractors.project_id = hub_questionnaires.project_id
        and hub_project_contractors.contractor_id = auth.uid()
    )
  );

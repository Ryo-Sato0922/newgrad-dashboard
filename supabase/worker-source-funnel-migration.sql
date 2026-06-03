alter table worker_funnels add column if not exists overview_recommendations integer not null default 0;
alter table worker_funnels add column if not exists source_funnels jsonb not null default '{}'::jsonb;

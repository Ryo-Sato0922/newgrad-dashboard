create extension if not exists "uuid-ossp";

create type company_status as enum ('リード', '初回商談', '提案中', 'PoC', '契約交渉', '受注', '失注');
create type client_phase as enum ('P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', '失注');
create type experiment_status as enum ('未実施', '検証中', '成功', '失敗');

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  industry text not null,
  area text not null default '関東',
  owner text not null,
  email text not null,
  status company_status not null default 'リード',
  client_phase client_phase not null default 'P0',
  forecast_rating text not null default '-' check (forecast_rating in ('★★★', '★★', '★', '-')),
  na_scheduled_date date,
  deal_memo text not null default '',
  expected_mrr integer not null default 0,
  contract_months integer not null default 0,
  success_fee integer not null default 0,
  expected_hires integer not null default 0,
  initial_meeting_date date,
  application_received_date date,
  proposal_date date,
  contract_target_date date,
  contract_start_date date,
  lost_reason text,
  memo text not null default '',
  sales_hours numeric not null default 0,
  cs_hours numeric not null default 0,
  acquisition_cost integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table worker_funnels (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  month date not null,
  braze_deliveries integer not null default 0,
  calls integer not null default 0,
  survey_interviews integer not null default 0,
  overview_recommendations integer not null default 0,
  source_funnels jsonb not null default '{}'::jsonb,
  views integer not null default 0,
  applications integer not null default 0,
  shifts integer not null default 0,
  repeat_shifts integer not null default 0,
  interview_requests integer not null default 0,
  screenings integer not null default 0,
  offers integer not null default 0,
  joins integer not null default 0,
  previous_month_applications integer not null default 0,
  unique (company_id, month)
);

create table student_surveys (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  worker_segment text not null,
  desire_before integer not null check (desire_before between 0 and 100),
  desire_after integer not null check (desire_after between 0 and 100),
  company_understanding integer not null check (company_understanding between 0 and 100),
  employee_understanding integer not null check (employee_understanding between 0 and 100),
  repeat_intent integer not null check (repeat_intent between 0 and 100),
  screening_intent integer not null check (screening_intent between 0 and 100),
  comment text not null default '',
  repeat_shift_count integer not null default 0,
  offer boolean not null default false,
  join_plan boolean not null default false,
  answered_at timestamptz not null default now()
);

create table kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,
  companies integer not null default 0,
  proposals integer not null default 0,
  mrr integer not null default 0,
  success_fees integer not null default 0,
  referrals integer not null default 0,
  experience_shifts integer not null default 0,
  interviews integer not null default 0,
  offers integer not null default 0,
  joins integer not null default 0,
  gross_profit integer not null default 0
);

create table unit_economics (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,
  operating_cost integer not null default 0,
  gross_margin_rate numeric not null default 0,
  cohort text not null,
  cohort_companies integer not null default 0,
  retained_companies integer not null default 0
);

create table business_plans (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,
  target_companies integer not null default 0,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table experiments (
  id uuid primary key default uuid_generate_v4(),
  hypothesis text not null,
  detail text not null,
  period daterange,
  status experiment_status not null default '未実施',
  result text not null default '',
  learning text not null default '',
  next_action text not null default '',
  created_at timestamptz not null default now()
);

create index companies_status_idx on companies(status);
create index companies_client_phase_idx on companies(client_phase);
create index companies_industry_idx on companies(industry);
create index worker_funnels_company_month_idx on worker_funnels(company_id, month);
create index student_surveys_company_idx on student_surveys(company_id);
create index business_plans_month_idx on business_plans(month);

-- Existing projects can run this migration safely after the first schema was already created.
do $$ begin
  create type client_phase as enum ('P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', '失注');
exception
  when duplicate_object then null;
end $$;

alter type client_phase add value if not exists '失注';

alter table companies add column if not exists client_phase client_phase not null default 'P0';
alter table companies add column if not exists forecast_rating text;
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'companies'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%forecast_rating%'
  loop
    execute format('alter table companies drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;
update companies
set forecast_rating = '-'
where forecast_rating is null
  or forecast_rating not in ('★★★', '★★', '★', '-');
alter table companies alter column forecast_rating set default '-';
alter table companies alter column forecast_rating set not null;
alter table companies add constraint companies_forecast_rating_check check (forecast_rating in ('★★★', '★★', '★', '-'));
alter table companies add column if not exists na_scheduled_date date;
alter table companies add column if not exists deal_memo text not null default '';
create index if not exists companies_client_phase_idx on companies(client_phase);

alter table worker_funnels add column if not exists overview_recommendations integer not null default 0;
alter table worker_funnels add column if not exists source_funnels jsonb not null default '{}'::jsonb;

create table if not exists business_plans (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,
  target_companies integer not null default 0,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_plans_month_idx on business_plans(month);

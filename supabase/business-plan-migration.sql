create extension if not exists "uuid-ossp";

create table if not exists business_plans (
  id uuid primary key default uuid_generate_v4(),
  month date not null unique,
  target_companies integer not null default 0,
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_plans_month_idx on business_plans(month);

do $$ begin
  create type client_phase as enum ('P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', '失注');
exception
  when duplicate_object then null;
end $$;

alter type client_phase add value if not exists '失注';

alter table companies add column if not exists client_phase client_phase not null default 'P0';
alter table companies add column if not exists na_scheduled_date date;
alter table companies add column if not exists deal_memo text not null default '';

update companies
set client_phase = case
  when status = '受注' then 'P7'::client_phase
  when status = '契約交渉' then 'P6'::client_phase
  when status = 'PoC' then 'P3'::client_phase
  when status = '提案中' then 'P2'::client_phase
  when status = '初回商談' then 'P1'::client_phase
  else 'P0'::client_phase
end
where client_phase = 'P0';

create index if not exists companies_client_phase_idx on companies(client_phase);

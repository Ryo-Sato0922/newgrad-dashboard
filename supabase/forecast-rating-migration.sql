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

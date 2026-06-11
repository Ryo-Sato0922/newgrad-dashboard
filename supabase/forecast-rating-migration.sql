alter table companies add column if not exists forecast_rating text not null default '-' check (forecast_rating in ('★★★', '★★', '★', '-'));
alter table companies alter column forecast_rating set default '-';

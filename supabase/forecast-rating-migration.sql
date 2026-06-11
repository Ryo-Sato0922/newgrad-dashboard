alter table companies add column if not exists forecast_rating text not null default '★' check (forecast_rating in ('★★★', '★★', '★'));

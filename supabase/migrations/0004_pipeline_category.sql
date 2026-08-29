alter table hot_clients
  add column if not exists category text not null default 'hot'
    check (category in ('kesin', 'hot'));

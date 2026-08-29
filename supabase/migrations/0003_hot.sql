create table if not exists hot_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  potential_days numeric not null default 0,
  daily_price numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists hot_allocations (
  hot_client_id uuid not null references hot_clients(id) on delete cascade,
  trainer_id uuid not null references trainers(id) on delete cascade,
  month text not null,
  days numeric not null default 0,
  primary key (hot_client_id, trainer_id, month)
);

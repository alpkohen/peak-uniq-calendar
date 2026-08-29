create table if not exists client_pricing (
  client_id uuid primary key references clients(id) on delete cascade,
  sale_price_per_day numeric not null default 0,
  trainer_fee_mode text not null default 'percent'
    check (trainer_fee_mode in ('percent', 'fixed')),
  trainer_fee_value numeric not null default 0,
  updated_at timestamptz default now()
);

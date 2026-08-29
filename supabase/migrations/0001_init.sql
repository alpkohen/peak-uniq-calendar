create table trainers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  is_internal boolean default true,          -- false = freelance
  delivery_calendar_id text,                 -- Peak Teslimat
  block_calendar_id text,                    -- Peak Blok
  monthly_capacity_days numeric default 13,  -- gerçekçi teslim kapasitesi
  active boolean default true,
  created_at timestamptz default now()
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null                  -- 'Satış', 'Çağrı Merkezi', 'CX', 'Tahsilat', 'Liderlik'
);

create table trainer_skills (
  trainer_id uuid references trainers(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  level int default 2,                       -- 1 destek, 2 verebilir, 3 uzman
  primary key (trainer_id, skill_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[],                            -- başlık eşleştirmesi için
  status text not null default 'active',     -- active | hot | dormant
  notes text
);

-- Takvimden gelen kesin doluluk
create table bookings (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references trainers(id) on delete cascade,
  google_event_id text,
  google_calendar_id text,
  date date not null,
  slot text not null,                        -- 'am' | 'pm'
  kind text not null,                        -- 'delivery' | 'block'
  client_id uuid references clients(id),
  raw_title text,
  source text default 'gcal',                -- 'gcal' | 'manual'
  synced_at timestamptz default now(),
  unique (trainer_id, date, slot)
);

-- Sıcak fırsat talebi
create table demands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  title text not null,
  skill_id uuid references skills(id),
  days_required numeric not null,
  mode text not null default 'floating',     -- 'fixed' | 'floating'
  start_date date,                           -- fixed ise
  end_date date,                             -- fixed ise
  target_month date,                         -- floating ise, ayın 1'i
  probability int default 50,                -- 0-100
  preferred_trainer_id uuid references trainers(id),
  status text default 'open',                -- open | won | lost
  created_at timestamptz default now()
);

create table sync_log (
  trainer_id uuid references trainers(id) on delete cascade,
  calendar_id text,
  sync_token text,
  last_synced_at timestamptz,
  last_event_count int,
  last_error text,
  primary key (trainer_id, calendar_id)
);

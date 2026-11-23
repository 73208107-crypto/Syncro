-- ============================================================================
-- SYNCRO — Esquema PostgreSQL + Row Level Security (Supabase)
-- Tablas: missions, focus_sessions, mood_logs, calendar_slots, biome_progress, b2b_leads
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Misiones diarias
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  xp integer not null default 20,
  drops integer not null default 5,
  target integer not null default 1,
  progress integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Sesiones de enfoque completadas
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_minutes integer not null check (duration_minutes > 0),
  mode text not null default 'classic',
  mission_id text,
  completed_at timestamptz not null default now()
);

-- 3. Registros emocionales (sin texto en claro del diario cifrado)
create table if not exists public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  energy integer not null check (energy between 1 and 10),
  mood text not null,
  logged_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- 4. Bloques de calendario semanal
create table if not exists public.calendar_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_index integer not null check (day_index between 0 and 6),
  hour_slot integer not null check (hour_slot between 0 and 23),
  mission_id text,
  title text not null,
  done boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 5. Progreso del Bioma Vivo
create table if not exists public.biome_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  drops integer not null default 0,
  earth_points integer not null default 0,
  streak integer not null default 0,
  total_minutes integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 6. Leads institucionales B2B (inserción pública controlada)
create table if not exists public.b2b_leads (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  contact_name text not null,
  email text not null,
  role text,
  team_size text,
  message text,
  created_at timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY (RLS) ============
alter table public.missions enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.mood_logs enable row level security;
alter table public.calendar_slots enable row level security;
alter table public.biome_progress enable row level security;
alter table public.b2b_leads enable row level security;

create policy "users_own_missions" on public.missions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_focus_sessions" on public.focus_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_mood_logs" on public.mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_calendar_slots" on public.calendar_slots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users_own_biome_progress" on public.biome_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public_insert_b2b_leads" on public.b2b_leads
  for insert with check (true);

-- Run this once in your Supabase Dashboard -> SQL Editor

create table if not exists public.sq_sync (
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  row_id text not null,
  updated_at bigint not null,
  deleted_at bigint,
  payload jsonb not null,
  primary key (user_id, table_name, row_id)
);

create index if not exists idx_sq_sync_user_updated
  on public.sq_sync (user_id, updated_at);

create table if not exists public.sq_guilds (
  code text primary key,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at bigint not null
);

create table if not exists public.sq_guild_messages (
  id text primary key,
  guild_code text not null references public.sq_guilds(code) on delete cascade,
  author text not null,
  content text not null,
  created_at bigint not null
);

create table if not exists public.sq_bug_reports (
  id text primary key,
  user_email text,
  title text not null,
  created_at bigint not null
);

alter table public.sq_sync enable row level security;
alter table public.sq_guilds enable row level security;
alter table public.sq_guild_messages enable row level security;
alter table public.sq_bug_reports enable row level security;

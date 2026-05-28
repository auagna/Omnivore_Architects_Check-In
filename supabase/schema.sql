create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  title text not null,
  description text,
  location text,
  event_date timestamp with time zone,
  capacity integer not null default 60,
  is_active boolean not null default false,
  constraint events_title_not_blank check (length(trim(title)) > 0),
  constraint events_capacity_positive check (capacity > 0)
);

create unique index if not exists events_single_active_idx
  on public.events (is_active)
  where is_active = true;

insert into public.events (title, description, capacity, is_active)
select '잡식건축가 연사 강연', '연사 강연 출석 체크인', 60, true
where not exists (select 1 from public.events);

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone not null default now()
);

insert into public.admin_settings (key, value)
values ('admin_pin', '1030')
on conflict (key) do nothing;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  phone_last4 text not null,
  group_type text not null,
  memo text,
  constraint attendance_records_name_not_blank check (length(trim(name)) > 0),
  constraint attendance_records_phone_last4_digits check (phone_last4 ~ '^[0-9]{4}$'),
  constraint attendance_records_group_type_check check (group_type in ('member', 'guest'))
);

alter table public.attendance_records
  add column if not exists event_id uuid references public.events(id) on delete cascade;

update public.attendance_records
set event_id = (select id from public.events where is_active = true order by created_at desc limit 1)
where event_id is null;

alter table public.attendance_records
  drop constraint if exists attendance_records_name_phone_unique;

create unique index if not exists attendance_records_event_name_phone_unique
  on public.attendance_records (event_id, name, phone_last4);

create index if not exists attendance_records_created_at_idx
  on public.attendance_records (created_at desc);

create index if not exists attendance_records_event_id_idx
  on public.attendance_records (event_id);

create index if not exists attendance_records_group_type_idx
  on public.attendance_records (group_type);

alter table public.events enable row level security;
alter table public.admin_settings enable row level security;
alter table public.attendance_records enable row level security;

-- 이 앱은 Next.js 서버 API route에서 service role key로만 DB에 접근합니다.
-- 클라이언트에 Supabase anon key를 배포하지 않으므로 공개 RLS policy를 만들지 않습니다.

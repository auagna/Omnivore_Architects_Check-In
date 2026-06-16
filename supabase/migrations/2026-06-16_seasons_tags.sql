-- 시즌 멤버 리스트 / 태그 / 이벤트-시즌-태그 연결 마이그레이션
-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.

-- 시즌별 멤버 명단 (시즌1, 시즌2 ...). members: ["홍길동", "김철수", ...]
create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name text not null,
  members jsonb not null default '[]'::jsonb,
  constraint seasons_name_not_blank check (length(trim(name)) > 0)
);

-- 이벤트 태그 (연사강연, 번개, 독서모임 ...)
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  name text not null,
  constraint tags_name_not_blank check (length(trim(name)) > 0)
);

create unique index if not exists tags_name_unique on public.tags (lower(name));

-- 이벤트에 시즌/태그 연결
alter table public.events
  add column if not exists season_id uuid references public.seasons(id) on delete set null,
  add column if not exists tag_id uuid references public.tags(id) on delete set null;

-- 기본 태그 시드 (태그가 하나도 없을 때만)
insert into public.tags (name)
select x.name
from (values ('연사강연'), ('번개'), ('독서모임')) as x(name)
where not exists (select 1 from public.tags);

alter table public.seasons enable row level security;
alter table public.tags enable row level security;

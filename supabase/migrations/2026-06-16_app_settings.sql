-- 관리자 편집 가능한 앱 설정(매뉴얼 등) 저장용 테이블
-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.

create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamp with time zone not null default now()
);

alter table public.app_settings enable row level security;

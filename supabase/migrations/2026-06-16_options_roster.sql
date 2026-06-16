-- 선택항목 / 참가자 명단 / 선택항목 응답 추가 마이그레이션
-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.

alter table public.events
  add column if not exists custom_options jsonb not null default '[]'::jsonb,
  add column if not exists roster jsonb not null default '[]'::jsonb;

alter table public.attendance_records
  add column if not exists option_responses jsonb not null default '{}'::jsonb;

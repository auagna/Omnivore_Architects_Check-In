-- 이벤트별 중복 방지 인덱스 정정 마이그레이션
--
-- 증상: 활성 이벤트에 기록이 0건인데도 새 체크인 시 "이미 출석체크된 정보입니다"가 떴다.
-- 원인: 중복 방지 unique 제약/인덱스가 event_id를 무시하고 (name, phone_last4)에만
--       걸려 있어, 이전 이벤트에 있던 사람이 다른 이벤트에 체크인하면 충돌했다.
-- 해결: event_id를 포함하지 않는 전역 unique를 모두 제거하고,
--       (event_id, name, phone_last4) 단위의 unique 인덱스만 남긴다.
--
-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요. 데이터는 변경하지 않으며,
-- 여러 번 실행해도 안전합니다.

-- 1) event_id를 포함하지 않는 '전역' unique 제약 제거
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.attendance_records'::regclass
      and c.contype = 'u'
      and not exists (
        select 1
        from unnest(c.conkey) as k(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
        where a.attname = 'event_id'
      )
  loop
    execute format('alter table public.attendance_records drop constraint %I', r.conname);
  end loop;
end $$;

-- 2) 제약이 아닌 '전역' unique 인덱스 제거
do $$
declare r record;
begin
  for r in
    select i.relname as idxname
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    where x.indrelid = 'public.attendance_records'::regclass
      and x.indisunique
      and not exists (select 1 from pg_constraint c where c.conindid = x.indexrelid)
      and not exists (
        select 1
        from unnest(x.indkey) as k(attnum)
        join pg_attribute a on a.attrelid = x.indrelid and a.attnum = k.attnum
        where a.attname = 'event_id'
      )
  loop
    execute format('drop index public.%I', r.idxname);
  end loop;
end $$;

-- 3) 이벤트별 unique 인덱스 보장
create unique index if not exists attendance_records_event_name_phone_unique
  on public.attendance_records (event_id, name, phone_last4);

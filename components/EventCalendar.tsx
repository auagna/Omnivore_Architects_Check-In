"use client";

import { useMemo, useState } from "react";
import { EventRecord } from "@/types/attendance";

type EventCalendarProps = {
  events: EventRecord[];
  selectedEventId?: string;
  onSelectEvent: (id: string) => void;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function localDateKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export default function EventCalendar({ events, selectedEventId, onSelectEvent }: EventCalendarProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // 날짜가 있는 이벤트를 로컬 날짜별로 묶습니다.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const event of events) {
      if (!event.event_date) {
        continue;
      }
      const key = localDateKey(event.event_date);
      if (!key) {
        continue;
      }
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }
    return map;
  }, [events]);

  const undated = useMemo(() => events.filter((event) => !event.event_date), [events]);

  const { year, month } = cursor;
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDateKey(today.toISOString());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">일정 달력</h3>
        <div className="flex items-center gap-1">
          <button type="button" className="table-button" onClick={() => shiftMonth(-1)} aria-label="이전 달">‹</button>
          <span className="min-w-28 text-center text-sm font-semibold text-slate-900">
            {year}년 {month + 1}월
          </span>
          <button type="button" className="table-button" onClick={() => shiftMonth(1)} aria-label="다음 달">›</button>
          <button type="button" className="table-button ml-1" onClick={goToday}>오늘</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday}
            className={`pb-1 text-center text-xs font-semibold ${
              index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-slate-400"
            }`}
          >
            {weekday}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-20 rounded-md bg-transparent" />;
          }

          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`min-h-20 rounded-md border p-1.5 ${
                isToday ? "border-slate-900 bg-white" : "border-line bg-white/60"
              }`}
            >
              <div className={`mb-1 text-xs font-semibold ${isToday ? "text-slate-900" : "text-slate-400"}`}>{day}</div>
              <div className="space-y-1">
                {dayEvents.map((event) => {
                  const active = event.id === selectedEventId;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      title={`${formatTime(event.event_date!)} ${event.title}`}
                      className={`block w-full truncate rounded px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : event.is_active
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {formatTime(event.event_date!)} {event.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {undated.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-semibold text-slate-400">날짜 미정</p>
          <div className="flex flex-wrap gap-1.5">
            {undated.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className={`rounded-md border px-2.5 py-1 text-sm transition ${
                  event.id === selectedEventId
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-line bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {event.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

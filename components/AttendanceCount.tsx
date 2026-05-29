"use client";

import { useEffect, useState } from "react";
import { AttendanceListResponse } from "@/types/attendance";

type AttendanceCountProps = {
  eventId?: string;
};

export default function AttendanceCount({ eventId }: AttendanceCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const [capacity, setCapacity] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCount() {
      try {
        const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
        const response = await fetch(`/api/attendance${query}`, { cache: "no-store" });
        const data = (await response.json()) as AttendanceListResponse;

        if (!ignore && response.ok) {
          setCount(data.stats.total);
          setCapacity(data.stats.capacity);
        }
      } catch {
        if (!ignore) {
          setCount(null);
        }
      }
    }

    loadCount();
    const timer = window.setInterval(loadCount, 10000);
    window.addEventListener("attendance:changed", loadCount);

    return () => {
      ignore = true;
      window.clearInterval(timer);
      window.removeEventListener("attendance:changed", loadCount);
    };
  }, [eventId]);

  return (
    <div className="mb-5 rounded-md border border-line bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-500">현재 출석체크 인원</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {count === null ? "확인 중" : `${count}${capacity ? ` / ${capacity}` : ""}명`}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import AttendanceForm from "@/components/AttendanceForm";
import AttendanceLookup from "@/components/AttendanceLookup";
import { PublicEvent } from "@/types/attendance";

type CheckInPanelProps = {
  event: PublicEvent | null;
  eventId?: string;
};

type Mode = "checkin" | "edit";

export default function CheckInPanel({ event, eventId }: CheckInPanelProps) {
  const [mode, setMode] = useState<Mode>("checkin");

  return (
    <div className="rounded-lg border border-line bg-panel/95 p-5 shadow-glow md:p-7">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode("checkin")}
          className={`focus-ring rounded px-4 py-2.5 text-sm font-semibold transition md:text-base ${
            mode === "checkin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          체크인
        </button>
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`focus-ring rounded px-4 py-2.5 text-sm font-semibold transition md:text-base ${
            mode === "edit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          조회 · 수정
        </button>
      </div>

      {mode === "checkin" ? (
        <AttendanceForm event={event} eventId={eventId} />
      ) : (
        <AttendanceLookup event={event} eventId={eventId} />
      )}
    </div>
  );
}

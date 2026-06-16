"use client";

import { FormEvent, useState } from "react";
import {
  ApiErrorResponse,
  AttendanceRecord,
  GroupType,
  OptionResponses,
  PublicEvent
} from "@/types/attendance";

type AttendanceLookupProps = {
  event: PublicEvent | null;
  eventId?: string;
};

export default function AttendanceLookup({ event, eventId }: AttendanceLookupProps) {
  const options = event?.customOptions ?? [];

  const [name, setName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  const [groupType, setGroupType] = useState<GroupType>("member");
  const [memo, setMemo] = useState("");
  const [optionResponses, setOptionResponses] = useState<OptionResponses>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleLookup(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError("");
    setSaved(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/attendance/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, name, phoneLast4 })
      });
      const data = (await response.json()) as { record?: AttendanceRecord; error?: string };

      if (!response.ok || !data.record) {
        setRecord(null);
        setError(data.error ?? "조회에 실패했습니다.");
        return;
      }

      setRecord(data.record);
      setGroupType(data.record.group_type);
      setMemo(data.record.memo ?? "");
      setOptionResponses(data.record.option_responses ?? {});
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!record) {
      return;
    }

    setError("");
    setSaved(false);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/attendance/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupType, memo, optionResponses })
      });
      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setError(data.error ?? "수정에 실패했습니다.");
        return;
      }

      setSaved(true);
      window.dispatchEvent(new Event("attendance:changed"));
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetLookup() {
    setRecord(null);
    setSaved(false);
    setError("");
  }

  if (record) {
    return (
      <div className="space-y-4 md:space-y-5">
        <div>
          <p className="text-sm font-semibold text-slate-500 md:text-base">조회 · 수정</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">{record.name}님의 체크인</h2>
          <p className="mt-1 text-sm text-slate-500">연락처 뒷번호 {record.phone_last4}</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 md:text-base">구분</legend>
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            {(["member", "guest"] as GroupType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setGroupType(type)}
                className={`focus-ring rounded-md border px-4 py-4 text-base font-semibold transition md:text-lg ${
                  groupType === type
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-line bg-ink text-slate-700 hover:bg-slate-100"
                }`}
              >
                {type === "member" ? "멤버" : "게스트"}
              </button>
            ))}
          </div>
        </fieldset>

        {options.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="mb-1 text-sm font-medium text-slate-700 md:text-base">추가 선택</legend>
            {options.map((option) => {
              const checked = optionResponses[option.id] ?? false;
              return (
                <div key={option.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-ink px-4 py-3">
                  <span className="text-sm font-medium text-slate-700 md:text-base">{option.label}</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOptionResponses((current) => ({ ...current, [option.id]: true }))}
                      className={`focus-ring rounded px-3 py-1.5 text-sm font-semibold transition ${
                        checked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      참여
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptionResponses((current) => ({ ...current, [option.id]: false }))}
                      className={`focus-ring rounded px-3 py-1.5 text-sm font-semibold transition ${
                        !checked ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      미참여
                    </button>
                  </div>
                </div>
              );
            })}
          </fieldset>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 md:text-base">메모 (선택사항)</span>
          <textarea
            className="focus-ring min-h-24 w-full resize-none rounded-md border border-line bg-ink px-4 py-4 text-base text-slate-900 placeholder:text-slate-400 md:min-h-28"
            value={memo}
            onChange={(changeEvent) => setMemo(changeEvent.target.value)}
            placeholder="추가 메모를 입력하세요..."
          />
        </label>

        {saved && <p className="notice-success">수정 내용이 저장되었습니다.</p>}
        {error && <p className="notice-error">{error}</p>}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={resetLookup}
            className="focus-ring rounded-md border border-line bg-ink px-5 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            다시 조회
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="focus-ring rounded-md bg-slate-900 px-5 py-4 text-base font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "저장 중" : "수정 저장"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4 md:space-y-5" onSubmit={handleLookup}>
      <div>
        <p className="text-sm font-semibold text-slate-500 md:text-base">조회 · 수정</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">체크인 내용 수정</h2>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 md:text-base">
        일정이 바뀌었나요? 체크인할 때 입력한 <b className="font-semibold text-slate-700">이름</b>과{" "}
        <b className="font-semibold text-slate-700">연락처 뒷번호 4자리</b>를 입력하면 구분·추가 선택·메모를 수정할 수 있습니다.
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 md:text-base">이름</span>
        <input
          className="focus-ring w-full rounded-md border border-line bg-ink px-4 py-4 text-lg text-slate-900 placeholder:text-slate-400"
          value={name}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
          placeholder="체크인할 때 입력한 이름"
          autoComplete="name"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700 md:text-base">연락처 뒷번호 4자리</span>
        <input
          className="focus-ring w-full rounded-md border border-line bg-ink px-4 py-4 text-lg text-slate-900 placeholder:text-slate-400"
          value={phoneLast4}
          onChange={(changeEvent) => setPhoneLast4(changeEvent.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          inputMode="numeric"
          pattern="\d{4}"
          autoComplete="off"
          required
        />
      </label>

      {error && <p className="notice-error">{error}</p>}

      <button
        className="focus-ring w-full rounded-md bg-slate-900 px-5 py-4 text-lg font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:py-5 md:text-xl"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "조회 중" : "내 체크인 조회"}
      </button>
    </form>
  );
}

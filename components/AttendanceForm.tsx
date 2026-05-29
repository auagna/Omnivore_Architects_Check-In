"use client";

import { FormEvent, useState } from "react";
import { ApiErrorResponse, AttendanceFormInput, GroupType } from "@/types/attendance";

const initialForm: AttendanceFormInput = {
  name: "",
  phoneLast4: "",
  groupType: "member",
  memo: ""
};

type AttendanceFormProps = {
  eventId?: string;
};

export default function AttendanceForm({ eventId }: AttendanceFormProps) {
  const [form, setForm] = useState<AttendanceFormInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, eventId })
      });
      const data = (await response.json()) as ApiErrorResponse;

      if (!response.ok) {
        setError(data.error ?? "체크인에 실패했습니다.");
        return;
      }

      setSuccess("체크인 완료");
      setForm(initialForm);
      window.dispatchEvent(new Event("attendance:changed"));
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function setField<K extends keyof AttendanceFormInput>(key: K, value: AttendanceFormInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold text-slate-500">체크인</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">정보를 입력해주세요</h2>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">이름</span>
        <input
          className="focus-ring w-full rounded-md border border-line bg-ink px-4 py-4 text-lg text-slate-900 placeholder:text-slate-400"
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          placeholder="전체 이름을 입력하세요"
          autoComplete="name"
          required
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">연락처 뒷번호 4자리</span>
        <input
          className="focus-ring w-full rounded-md border border-line bg-ink px-4 py-4 text-lg text-slate-900 placeholder:text-slate-400"
          value={form.phoneLast4}
          onChange={(event) => setField("phoneLast4", event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
          inputMode="numeric"
          pattern="\d{4}"
          autoComplete="off"
          required
        />
        <p className="mt-2 text-sm text-slate-500">연락처 뒷번호 4자리를 입력해주세요</p>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">구분</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["member", "guest"] as GroupType[]).map((type) => (
            <button
              className={`focus-ring rounded-md border px-4 py-4 text-base font-semibold transition ${
                form.groupType === type
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-line bg-ink text-slate-700 hover:bg-slate-100"
              }`}
              key={type}
              type="button"
              onClick={() => setField("groupType", type)}
            >
              {type === "member" ? "멤버" : "게스트"}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">메모 (선택사항)</span>
        <textarea
          className="focus-ring min-h-24 w-full resize-none rounded-md border border-line bg-ink px-4 py-4 text-base text-slate-900 placeholder:text-slate-400"
          value={form.memo}
          onChange={(event) => setField("memo", event.target.value)}
          placeholder="추가 메모를 입력하세요..."
        />
      </label>

      {success && <p className="notice-success">{success}</p>}
      {error && <p className="notice-error">{error}</p>}

      <button
        className="focus-ring w-full rounded-md bg-slate-900 px-5 py-4 text-lg font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "처리 중" : "체크인 완료"}
      </button>
    </form>
  );
}

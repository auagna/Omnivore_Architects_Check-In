"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AttendanceTable from "@/components/AttendanceTable";
import StatCard from "@/components/StatCard";
import { AttendanceListResponse, AttendanceRecord, EventFormInput, EventRecord, GroupType } from "@/types/attendance";

type AdminDashboardProps = {
  pin: string;
  onLogout: () => void;
};

type FilterValue = "all" | GroupType;

const emptyEventForm: EventFormInput = {
  title: "잡식건축가 연사 강연",
  description: "연사 강연 출석 체크인",
  location: "",
  eventDate: "",
  capacity: 60,
  isActive: true
};

export default function AdminDashboard({ pin, onLogout }: AdminDashboardProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormInput>(emptyEventForm);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceListResponse["stats"] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: "", nextPin: "" });

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? events.find((event) => event.is_active) ?? events[0], [events, selectedEventId]);
  const qrLink = selectedEvent && typeof window !== "undefined" ? `${window.location.origin}/?eventId=${selectedEvent.id}` : "";

  const loadEvents = useCallback(async () => {
    const response = await fetch("/api/events", { cache: "no-store" });
    const data = (await response.json()) as { events?: EventRecord[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "이벤트 목록을 불러오지 못했습니다.");
    const nextEvents = data.events ?? [];
    setEvents(nextEvents);
    if (!selectedEventId && nextEvents.length > 0) setSelectedEventId((nextEvents.find((event) => event.is_active) ?? nextEvents[0]).id);
  }, [selectedEventId]);

  const loadRecords = useCallback(async (eventId?: string) => {
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    const response = await fetch(`/api/attendance${query}`, { cache: "no-store" });
    const data = (await response.json()) as AttendanceListResponse & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "출석 목록을 불러오지 못했습니다.");
    setRecords(data.records);
    setStats(data.stats);
  }, []);

  useEffect(() => {
    loadEvents().catch((loadError) => setError(loadError.message));
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEvent?.id) return;
    loadRecords(selectedEvent.id).catch((loadError) => setError(loadError.message));
    const timer = window.setInterval(() => loadRecords(selectedEvent.id).catch((loadError) => setError(loadError.message)), 5000);
    return () => window.clearInterval(timer);
  }, [loadRecords, selectedEvent?.id]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesFilter = filter === "all" || record.group_type === filter;
      const matchesSearch = !normalizedSearch || record.name.toLowerCase().includes(normalizedSearch) || record.phone_last4.includes(normalizedSearch) || (record.memo ?? "").toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [filter, records, search]);

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runBusy(async () => {
      const response = await fetch(editingEventId ? `/api/events/${editingEventId}` : "/api/events", {
        method: editingEventId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, event: eventForm })
      });
      const data = (await response.json()) as { event?: EventRecord; error?: string };
      if (!response.ok) throw new Error(data.error ?? "이벤트 저장에 실패했습니다.");
      setMessage(editingEventId ? "이벤트를 수정했습니다." : "이벤트를 추가했습니다.");
      setEditingEventId(null);
      setEventForm(emptyEventForm);
      if (data.event?.id) setSelectedEventId(data.event.id);
      await loadEvents();
    });
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("이 이벤트를 삭제할까요? 연결된 출석 기록도 함께 삭제될 수 있습니다.")) return;
    await runBusy(async () => {
      const response = await fetch(`/api/events/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "이벤트 삭제에 실패했습니다.");
      setMessage("이벤트를 삭제했습니다.");
      setSelectedEventId("");
      await loadEvents();
    });
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("이 출석 기록을 삭제할까요?")) return;
    await runBusy(async () => {
      const response = await fetch(`/api/attendance/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "삭제에 실패했습니다.");
      setMessage("출석 기록을 삭제했습니다.");
      await loadRecords(selectedEvent?.id);
    });
  }

  async function resetAll() {
    if (!window.confirm("전체 출석 기록을 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    await runBusy(async () => {
      const response = await fetch("/api/attendance", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "전체 초기화에 실패했습니다.");
      setMessage("전체 출석 기록을 초기화했습니다.");
      await loadRecords(selectedEvent?.id);
    });
  }

  async function changePin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runBusy(async () => {
      const response = await fetch("/api/admin/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pinForm) });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "PIN 변경에 실패했습니다.");
      setPinForm({ currentPin: "", nextPin: "" });
      setMessage("관리자 PIN을 변경했습니다.");
    });
  }

  async function runBusy(action: () => Promise<void>) {
    setIsBusy(true);
    setMessage("");
    setError("");
    try {
      await action();
    } catch (busyError) {
      setError(busyError instanceof Error ? busyError.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  function editEvent(event: EventRecord) {
    setEditingEventId(event.id);
    setEventForm({ title: event.title, description: event.description ?? "", location: event.location ?? "", eventDate: event.event_date ? event.event_date.slice(0, 16) : "", capacity: event.capacity, isActive: event.is_active });
  }

  function downloadExcel() {
    const headers = ["시간", "이름", "휴대폰", "타입", "메모"];
    const rows = filteredRecords.map((record) => [formatDateTime(record.created_at), record.name, record.phone_last4, record.group_type === "member" ? "멤버" : "게스트", record.memo ?? ""]);
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(selectedEvent?.title ?? "출석 명단")}</h1><table border="1"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `잡식건축가-출석명단-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-panel p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-sm text-zinc-400">관리자</p><h2 className="mt-2 text-2xl font-bold text-white">이벤트 및 출석 관리</h2><p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">이벤트 추가, 편집, 삭제와 QR 배포, 참가자 출석 명단 확인, 엑셀 내보내기, PIN 변경을 한곳에서 관리합니다.</p></div><button className="admin-button" type="button" onClick={onLogout}>잠금</button></div></div>
      {message && <p className="notice-success">{message}</p>}{error && <p className="notice-error">{error}</p>}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-line bg-panel p-5"><h3 className="text-lg font-bold text-white">이벤트 관리</h3><form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={saveEvent}><input className="admin-input md:col-span-2" value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} placeholder="이벤트 이름" /><input className="admin-input" type="datetime-local" value={eventForm.eventDate} onChange={(event) => setEventForm({ ...eventForm, eventDate: event.target.value })} /><input className="admin-input" type="number" min="1" value={eventForm.capacity} onChange={(event) => setEventForm({ ...eventForm, capacity: Number(event.target.value) })} /><input className="admin-input" value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} placeholder="장소" /><input className="admin-input" value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} placeholder="설명" /><label className="flex items-center gap-3 rounded-md border border-line bg-ink px-4 py-3 text-sm font-semibold text-zinc-200"><input type="checkbox" checked={eventForm.isActive} onChange={(event) => setEventForm({ ...eventForm, isActive: event.target.checked })} />활성 이벤트</label><button className="admin-button" type="submit" disabled={isBusy}>{editingEventId ? "이벤트 수정" : "이벤트 추가"}</button></form><div className="mt-5 overflow-x-auto"><table className="min-w-full divide-y divide-line text-left text-sm"><tbody className="divide-y divide-line">{events.map((event) => <tr className="text-zinc-200" key={event.id}><td className="px-4 py-4 font-semibold text-white">{event.title}</td><td className="px-4 py-4">{event.capacity}명</td><td className="px-4 py-4">{event.is_active ? "활성" : "대기"}</td><td className="px-4 py-4 text-right"><button className="table-button" onClick={() => { setSelectedEventId(event.id); editEvent(event); }}>편집</button><button className="table-button-danger ml-2" onClick={() => deleteEvent(event.id)}>삭제</button></td></tr>)}</tbody></table></div></div>
        <div className="rounded-lg border border-line bg-panel p-5"><h3 className="text-lg font-bold text-white">QR 배포</h3><div className="mt-4 rounded-md border border-line bg-white p-4">{qrLink && <img alt="체크인 QR 코드" className="mx-auto h-56 w-56" src={`https://api.qrserver.com/v1/create-qr-code/?size=224x224&data=${encodeURIComponent(qrLink)}`} />}</div><p className="mt-3 break-all text-sm text-zinc-300">{qrLink}</p><button className="admin-button mt-4 w-full" onClick={() => { navigator.clipboard.writeText(qrLink); setMessage("QR 배포 링크를 복사했습니다."); }}>QR 배포 링크 복사</button><form className="mt-6 space-y-3 border-t border-line pt-5" onSubmit={changePin}><h3 className="text-lg font-bold text-white">PIN 변경</h3><input className="admin-input" value={pinForm.currentPin} onChange={(event) => setPinForm({ ...pinForm, currentPin: event.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="현재 PIN" /><input className="admin-input" value={pinForm.nextPin} onChange={(event) => setPinForm({ ...pinForm, nextPin: event.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="새 PIN" /><button className="admin-button w-full" type="submit" disabled={isBusy}>PIN 변경</button></form></div>
      </section>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="총 출석 수" value={stats?.total ?? records.length} tone="bright" /><StatCard label="멤버 수" value={stats?.member ?? 0} /><StatCard label="게스트 수" value={stats?.guest ?? 0} /><StatCard label="잔여 좌석" value={stats?.remaining ?? 0} /></div>
      <section className="rounded-lg border border-line bg-panel p-4"><div className="grid gap-3 lg:grid-cols-[14rem_1fr_auto_auto_auto] lg:items-center"><select className="admin-input" value={selectedEvent?.id ?? ""} onChange={(event) => setSelectedEventId(event.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select><input className="admin-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 휴대폰, 메모 검색" /><div className="grid grid-cols-3 gap-2">{[["all", "전체"], ["member", "멤버"], ["guest", "게스트"]].map(([value, label]) => <button className={`filter-button ${filter === value ? "filter-button-active" : ""}`} key={value} type="button" onClick={() => setFilter(value as FilterValue)}>{label}</button>)}</div><button className="admin-button" onClick={downloadExcel}>엑셀 내보내기</button><button className="danger-button" disabled={isBusy} onClick={resetAll}>전체 초기화</button></div></section>
      <AttendanceTable records={filteredRecords} onDelete={deleteRecord} isBusy={isBusy} />
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

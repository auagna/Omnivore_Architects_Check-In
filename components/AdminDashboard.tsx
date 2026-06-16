"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AttendanceStats from "@/components/AttendanceStats";
import AttendanceTable from "@/components/AttendanceTable";
import EventCalendar from "@/components/EventCalendar";
import SeasonsManager from "@/components/SeasonsManager";
import StatCard from "@/components/StatCard";
import TagsManager from "@/components/TagsManager";
import {
  AttendanceListResponse,
  AttendanceRecord,
  EventFormInput,
  EventOption,
  EventRecord,
  GroupType,
  Season,
  Tag
} from "@/types/attendance";

type FilterValue = "all" | GroupType;

const emptyEventForm: EventFormInput = {
  title: "잡식건축가 연사 강연",
  description: "잡식건축가 체크인",
  location: "",
  eventDate: "",
  capacity: 60,
  isActive: false,
  customOptions: [],
  roster: [],
  seasonId: null,
  tagId: null
};

const MANUAL_KEY = "event_manual";
const DEFAULT_EVENT_MANUAL = [
  "1. 멤버 명단 등록 · 하단 ‘시즌 멤버 관리’에서 시즌별 멤버 명단을 관리합니다.",
  "2. 태그 확인 · ‘태그 관리’에서 이벤트 종류(연사강연·번개·독서모임)를 확인하거나 추가합니다.",
  "3. 이벤트 생성 · ‘이벤트 관리’에서 태그를 선택하고, ‘명단 선택’으로 참가자를 추가합니다.",
  "4. 활성화 & QR 배포 · ‘활성 이벤트로 사용’을 켜야 체크인이 열립니다. QR 배포 링크를 공유하세요.",
  "5. 결과 확인 · 행사 후 출석 명단·명단 대조·엑셀 내보내기와 태그별 참석률 통계를 확인합니다."
].join("\n");

// 명단 대조용 이름 정규화 (공백·대소문자 무시)
function normalizeName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function makeOptionId() {
  return `opt_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormInput>(emptyEventForm);
  const [rosterNames, setRosterNames] = useState<string[]>([]);
  const [showRosterPicker, setShowRosterPicker] = useState(false);
  const [customRosterName, setCustomRosterName] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [manualText, setManualText] = useState(DEFAULT_EVENT_MANUAL);
  const [manualDraft, setManualDraft] = useState("");
  const [editingManual, setEditingManual] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceListResponse["stats"] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? events.find((event) => event.is_active) ?? events[0],
    [events, selectedEventId]
  );

  const qrLink = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return selectedEvent ? `${window.location.origin}/?eventId=${selectedEvent.id}` : window.location.origin;
  }, [selectedEvent]);

  const loadEvents = useCallback(async () => {
    const response = await fetch("/api/events", { cache: "no-store" });
    const data = (await response.json()) as { events?: EventRecord[]; error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "이벤트 목록을 불러오지 못했습니다.");
    }

    const nextEvents = data.events ?? [];
    setEvents(nextEvents);

    if (!selectedEventId && nextEvents.length > 0) {
      setSelectedEventId((nextEvents.find((event) => event.is_active) ?? nextEvents[0]).id);
    }
  }, [selectedEventId]);

  const loadRecords = useCallback(async (eventId?: string) => {
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    const response = await fetch(`/api/attendance${query}`, { cache: "no-store" });
    const data = (await response.json()) as AttendanceListResponse & { error?: string };

    if (!response.ok) {
      throw new Error(data.error ?? "출석 목록을 불러오지 못했습니다.");
    }

    setRecords(data.records);
    setStats(data.stats);
  }, []);

  const loadSeasons = useCallback(async () => {
    const response = await fetch("/api/seasons", { cache: "no-store" });
    const data = (await response.json()) as { seasons?: Season[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "시즌 목록을 불러오지 못했습니다.");
    }
    setSeasons(data.seasons ?? []);
  }, []);

  const loadTags = useCallback(async () => {
    const response = await fetch("/api/tags", { cache: "no-store" });
    const data = (await response.json()) as { tags?: Tag[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "태그 목록을 불러오지 못했습니다.");
    }
    setTags(data.tags ?? []);
  }, []);

  const loadManual = useCallback(async () => {
    const response = await fetch(`/api/settings/${MANUAL_KEY}`, { cache: "no-store" });
    const data = (await response.json()) as { value?: string | null; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "매뉴얼을 불러오지 못했습니다.");
    }
    // 저장된 값이 없으면 기본 매뉴얼을 사용합니다.
    setManualText(data.value && data.value.trim() ? data.value : DEFAULT_EVENT_MANUAL);
  }, []);

  async function saveManual() {
    setManualBusy(true);
    clearNotice();
    try {
      const response = await fetch(`/api/settings/${MANUAL_KEY}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: manualDraft })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "매뉴얼 저장에 실패했습니다.");
        return;
      }
      setManualText(manualDraft.trim() ? manualDraft : DEFAULT_EVENT_MANUAL);
      setEditingManual(false);
      setMessage("매뉴얼을 저장했습니다.");
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setManualBusy(false);
    }
  }

  useEffect(() => {
    loadEvents().catch((eventError) => setError(eventError.message));
    loadSeasons().catch((seasonError) => setError(seasonError.message));
    loadTags().catch((tagError) => setError(tagError.message));
    loadManual().catch((manualError) => setError(manualError.message));
  }, [loadEvents, loadSeasons, loadTags, loadManual]);

  useEffect(() => {
    if (!selectedEvent?.id) {
      setRecords([]);
      setStats(null);
      return;
    }

    loadRecords(selectedEvent.id).catch((recordError) => setError(recordError.message));
    const timer = window.setInterval(() => {
      loadRecords(selectedEvent.id).catch((recordError) => setError(recordError.message));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loadRecords, selectedEvent?.id]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records
      .filter((record) => {
        const matchesFilter = filter === "all" || record.group_type === filter;
        const matchesSearch =
          !normalizedSearch ||
          record.name.toLowerCase().includes(normalizedSearch) ||
          record.phone_last4.includes(normalizedSearch) ||
          (record.memo ?? "").toLowerCase().includes(normalizedSearch);

        return matchesFilter && matchesSearch;
      })
      // 이름 가나다순 정렬(같은 이름은 체크인 시간순). 중복 이름은 표에서 번호로 구분합니다.
      .sort((a, b) => a.name.localeCompare(b.name, "ko") || a.created_at.localeCompare(b.created_at));
  }, [filter, records, search]);

  // 참가자 명단(roster)을 체크인 기록과 대조해 출석/불참/명단 외를 계산합니다.
  const rosterMatch = useMemo(() => {
    const roster = selectedEvent?.roster ?? [];
    const byName = new Map<string, AttendanceRecord>();
    for (const record of records) {
      byName.set(normalizeName(record.name), record);
    }

    const present: { name: string; record: AttendanceRecord }[] = [];
    const absent: string[] = [];
    for (const name of roster) {
      const record = byName.get(normalizeName(name));
      if (record) {
        present.push({ name, record });
      } else {
        absent.push(name);
      }
    }

    const rosterSet = new Set(roster.map(normalizeName));
    const unexpected = records.filter((record) => !rosterSet.has(normalizeName(record.name)));

    return { roster, present, absent, unexpected };
  }, [selectedEvent, records]);

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    clearNotice();

    try {
      const endpoint = editingEventId ? `/api/events/${editingEventId}` : "/api/events";
      const payload = {
        ...eventForm,
        eventDate: localInputToIso(eventForm.eventDate),
        customOptions: eventForm.customOptions.filter((option) => option.label.trim().length > 0),
        roster: rosterNames
      };
      const response = await fetch(endpoint, {
        method: editingEventId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: payload })
      });
      const data = (await response.json()) as { event?: EventRecord; error?: string };

      if (!response.ok) {
        setError(data.error ?? "이벤트 저장에 실패했습니다.");
        return;
      }

      setMessage(editingEventId ? "이벤트를 수정했습니다." : "이벤트를 추가했습니다.");
      setEditingEventId(null);
      setEventForm(emptyEventForm);
      setRosterNames([]);
      setShowRosterPicker(false);
      await loadEvents();
      setSelectedEventId(data.event?.id ?? selectedEventId);
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsBusy(false);
    }
  }

  // 이벤트 리스트에서 활성/비활성을 전환합니다(활성은 1개만 유지됨).
  async function setEventActive(event: EventRecord, active: boolean) {
    setIsBusy(true);
    clearNotice();
    try {
      const payload = {
        title: event.title,
        description: event.description ?? "",
        location: event.location ?? "",
        eventDate: event.event_date ?? "",
        capacity: event.capacity,
        isActive: active,
        customOptions: event.custom_options,
        roster: event.roster,
        seasonId: event.season_id,
        tagId: event.tag_id
      };
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: payload })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "활성 상태 변경에 실패했습니다.");
        return;
      }
      setMessage(active ? "활성 이벤트로 지정했습니다." : "이벤트를 비활성화했습니다.");
      setSelectedEventId(event.id);
      await loadEvents();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsBusy(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!window.confirm("이 이벤트를 삭제할까요? 연결된 출석 기록도 함께 삭제될 수 있습니다.")) {
      return;
    }

    setIsBusy(true);
    clearNotice();

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "이벤트 삭제에 실패했습니다.");
        return;
      }

      setMessage("이벤트를 삭제했습니다.");
      setSelectedEventId("");
      await loadEvents();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsBusy(false);
    }
  }

  function editEvent(event: EventRecord) {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      eventDate: event.event_date ? isoToLocalInput(event.event_date) : "",
      capacity: event.capacity,
      isActive: event.is_active,
      customOptions: event.custom_options.map((option) => ({ ...option })),
      roster: event.roster,
      seasonId: event.season_id,
      tagId: event.tag_id
    });
    setRosterNames(event.roster);
    setShowRosterPicker(false);
  }

  // 참가자 명단을 버튼 선택으로 관리합니다.
  function toggleRosterName(rawName: string) {
    const name = rawName.trim();
    if (!name) {
      return;
    }
    setRosterNames((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  // 시즌 멤버 전체를 한 번에 명단에 추가합니다(번개처럼 여러 시즌 합치기 가능).
  function addSeasonToRoster(seasonId: string) {
    const season = seasons.find((item) => item.id === seasonId);
    if (!season) {
      return;
    }
    setRosterNames((current) => {
      const seen = new Set(current);
      const next = [...current];
      for (const member of season.members) {
        const name = member.trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          next.push(name);
        }
      }
      return next;
    });
  }

  // 시즌 멤버 전체를 명단에서 제거합니다.
  function removeSeasonFromRoster(seasonId: string) {
    const season = seasons.find((item) => item.id === seasonId);
    if (!season) {
      return;
    }
    const toRemove = new Set(season.members.map((member) => member.trim()));
    setRosterNames((current) => current.filter((name) => !toRemove.has(name)));
  }

  // 잡식건축가(전체 시즌 멤버 종합)를 한 번에 추가/제거합니다.
  function allSeasonMembers() {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const season of seasons) {
      for (const member of season.members) {
        const name = member.trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          result.push(name);
        }
      }
    }
    return result;
  }

  function addAllMembersToRoster() {
    setRosterNames((current) => {
      const seen = new Set(current);
      const next = [...current];
      for (const name of allSeasonMembers()) {
        if (!seen.has(name)) {
          seen.add(name);
          next.push(name);
        }
      }
      return next;
    });
  }

  function removeAllMembersFromRoster() {
    const all = new Set(allSeasonMembers());
    setRosterNames((current) => current.filter((name) => !all.has(name)));
  }

  function addCustomRosterName() {
    const name = customRosterName.trim();
    if (!name) {
      return;
    }
    setRosterNames((current) => (current.includes(name) ? current : [...current, name]));
    setCustomRosterName("");
  }

  function addCustomOption() {
    setEventForm((current) => ({
      ...current,
      customOptions: [...current.customOptions, { id: makeOptionId(), label: "" }]
    }));
  }

  function updateCustomOption(id: string, label: string) {
    setEventForm((current) => ({
      ...current,
      customOptions: current.customOptions.map((option) => (option.id === id ? { ...option, label } : option))
    }));
  }

  function removeCustomOption(id: string) {
    setEventForm((current) => ({
      ...current,
      customOptions: current.customOptions.filter((option) => option.id !== id)
    }));
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("이 출석 기록을 삭제할까요?")) {
      return;
    }

    setIsBusy(true);
    clearNotice();

    try {
      const response = await fetch(`/api/attendance/${id}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setMessage("출석 기록을 삭제했습니다.");
      await loadRecords(selectedEvent?.id);
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsBusy(false);
    }
  }

  async function resetAll() {
    if (!window.confirm("전체 출석 기록을 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    setIsBusy(true);
    clearNotice();

    try {
      const response = await fetch("/api/attendance", {
        method: "DELETE"
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "전체 초기화에 실패했습니다.");
        return;
      }

      setMessage("전체 출석 기록을 초기화했습니다.");
      await loadRecords(selectedEvent?.id);
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsBusy(false);
    }
  }

  async function copyQrLink() {
    await navigator.clipboard.writeText(qrLink);
    setMessage("QR 배포 링크를 복사했습니다.");
  }

  function downloadExcel() {
    const options = selectedEvent?.custom_options ?? [];
    const rosterSet = new Set((selectedEvent?.roster ?? []).map(normalizeName));
    const headers = ["시간", "이름", "휴대폰", "타입", ...options.map((option) => option.label), "명단대조", "메모"];

    const rows = filteredRecords.map((record) => {
      const row: Record<string, string> = {
        시간: formatDateTime(record.created_at),
        이름: record.name,
        휴대폰: record.phone_last4,
        타입: record.group_type === "member" ? "멤버" : "게스트",
        명단대조: rosterSet.size === 0 ? "" : rosterSet.has(normalizeName(record.name)) ? "명단" : "명단외",
        메모: record.memo ?? ""
      };
      for (const option of options) {
        row[option.label] = record.option_responses?.[option.id] ? "참여" : "미참여";
      }
      return row;
    });

    const html = buildExcelHtml(headers, rows, selectedEvent?.title ?? "출석 명단");
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `잡식건축가-출석명단-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearNotice() {
    setMessage("");
    setError("");
  }

  return (
    <div className="space-y-5">
      {/* 1. 이벤트 및 출석 관리 + QR */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="text-sm text-slate-500">관리자</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">이벤트 및 출석 관리</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            이벤트 추가, 편집, 삭제와 QR 배포, 참가자 출석 명단 확인, 엑셀 내보내기를 한곳에서 관리합니다.
          </p>

          <div className="mt-4 rounded-md border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">이벤트 생성 및 관리 단계</p>
              {!editingManual && (
                <button
                  type="button"
                  className="table-button"
                  onClick={() => { setManualDraft(manualText); setEditingManual(true); }}
                >
                  편집
                </button>
              )}
            </div>

            {editingManual ? (
              <div className="mt-2 space-y-2">
                <textarea
                  className="admin-input min-h-40 resize-y"
                  value={manualDraft}
                  onChange={(event) => setManualDraft(event.target.value)}
                  placeholder="한 줄에 한 단계씩 입력하세요."
                />
                <div className="flex gap-2">
                  <button type="button" className="admin-button" disabled={manualBusy} onClick={saveManual}>
                    {manualBusy ? "저장 중" : "저장"}
                  </button>
                  <button type="button" className="admin-button-muted" onClick={() => setEditingManual(false)}>취소</button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
                {manualText.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-line bg-panel p-5">
          <h3 className="text-lg font-bold text-slate-900">QR 배포</h3>
          <div className="mt-4 rounded-md border border-line bg-white p-4">
            {qrLink && (
              <img
                alt="체크인 QR 코드"
                className="mx-auto h-56 w-56"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=224x224&data=${encodeURIComponent(qrLink)}`}
              />
            )}
          </div>
          <p className="mt-3 break-all text-sm text-slate-600">{qrLink || "이벤트를 먼저 추가해주세요."}</p>
          <button className="admin-button mt-4 w-full" type="button" disabled={!qrLink} onClick={copyQrLink}>
            QR 배포 링크 복사
          </button>
        </div>
      </section>

      {message && <p className="notice-success">{message}</p>}
      {error && <p className="notice-error">{error}</p>}

      {/* 2. 달력 */}
      <EventCalendar events={events} selectedEventId={selectedEvent?.id} onSelectEvent={setSelectedEventId} />

      {/* 3. 이벤트 관리 + 멤버(시즌) 리스트 */}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h3 className="text-lg font-bold text-slate-900">이벤트 관리</h3>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={saveEvent}>
            <label className="block min-w-0 md:col-span-2">
              <span className="admin-label">이벤트 이름</span>
              <input className="admin-input" value={eventForm.title} onChange={(event) => setEventFormValue("title", event.target.value)} />
            </label>
            <label className="block min-w-0">
              <span className="admin-label">일시</span>
              <input className="admin-input" type="datetime-local" value={eventForm.eventDate} onChange={(event) => setEventFormValue("eventDate", event.target.value)} />
            </label>
            <label className="block min-w-0">
              <span className="admin-label">정원</span>
              <input className="admin-input" type="number" min="1" value={eventForm.capacity} onChange={(event) => setEventFormValue("capacity", Number(event.target.value))} />
            </label>
            <label className="block min-w-0">
              <span className="admin-label">장소</span>
              <input className="admin-input" value={eventForm.location} onChange={(event) => setEventFormValue("location", event.target.value)} />
            </label>
            <label className="block min-w-0 md:col-span-2">
              <span className="admin-label">태그</span>
              <select className="admin-input" value={eventForm.tagId ?? ""} onChange={(event) => setEventFormValue("tagId", event.target.value || null)}>
                <option value="">태그 미지정</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0 md:col-span-2">
              <span className="admin-label">설명</span>
              <input className="admin-input" value={eventForm.description} onChange={(event) => setEventFormValue("description", event.target.value)} />
            </label>

            <div className="min-w-0 md:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="block text-sm font-medium text-slate-600">선택항목 (식사 참여, 도슨트 참여 등)</span>
                <button type="button" className="table-button" onClick={addCustomOption}>+ 항목 추가</button>
              </div>
              {eventForm.customOptions.length === 0 ? (
                <p className="text-sm text-slate-400">참가자가 체크인할 때 참여/미참여를 선택하는 항목입니다. 필요할 때만 추가하세요.</p>
              ) : (
                <div className="space-y-2">
                  {eventForm.customOptions.map((option) => (
                    <div className="flex items-center gap-2" key={option.id}>
                      <input
                        className="admin-input"
                        value={option.label}
                        placeholder="예: 식사 참여 여부"
                        onChange={(event) => updateCustomOption(option.id, event.target.value)}
                      />
                      <button type="button" className="table-button-danger shrink-0" onClick={() => removeCustomOption(option.id)}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0 md:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="block text-sm font-medium text-slate-600">참가자 명단 ({rosterNames.length}명)</span>
                <div className="flex items-center gap-2">
                  {rosterNames.length > 0 && (
                    <button type="button" className="table-button" onClick={() => setRosterNames([])}>전체 해제</button>
                  )}
                  <button type="button" className="table-button" onClick={() => setShowRosterPicker((value) => !value)}>
                    {showRosterPicker ? "닫기" : "명단 선택"}
                  </button>
                </div>
              </div>

              {rosterNames.length === 0 ? (
                <p className="text-sm text-slate-400">‘명단 선택’을 눌러 참가자를 추가하세요.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {rosterNames.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2.5 py-1 text-sm text-slate-700">
                      {name}
                      <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => toggleRosterName(name)}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {showRosterPicker && (
                <div className="mt-3 space-y-3 rounded-md border border-line bg-white p-3">
                  {seasons.length > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                      <span className="text-xs font-semibold text-slate-700">잡식건축가 (전체 {allSeasonMembers().length}명)</span>
                      <div className="flex items-center gap-2">
                        <button type="button" className="text-xs text-slate-500 hover:text-slate-900" onClick={addAllMembersToRoster}>전체 추가</button>
                        <span className="text-xs text-slate-300">|</span>
                        <button type="button" className="text-xs text-slate-500 hover:text-red-600" onClick={removeAllMembersFromRoster}>전체 해제</button>
                      </div>
                    </div>
                  )}
                  {seasons.length === 0 ? (
                    <p className="text-sm text-slate-400">등록된 시즌 멤버가 없습니다. 아래에서 직접 추가하거나 ‘시즌 멤버 관리’에서 멤버를 등록하세요.</p>
                  ) : (
                    seasons.map((season) => (
                      <div key={season.id}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">{season.name}</span>
                          <div className="flex items-center gap-2">
                            <button type="button" className="text-xs text-slate-400 hover:text-slate-700" onClick={() => addSeasonToRoster(season.id)}>전체 추가</button>
                            <span className="text-xs text-slate-300">|</span>
                            <button type="button" className="text-xs text-slate-400 hover:text-red-600" onClick={() => removeSeasonFromRoster(season.id)}>전체 해제</button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {season.members.map((member) => {
                            const active = rosterNames.includes(member.trim());
                            return (
                              <button
                                key={member}
                                type="button"
                                onClick={() => toggleRosterName(member)}
                                className={`rounded-full border px-3 py-1 text-sm transition ${
                                  active
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-line bg-white text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {active ? "✓ " : ""}{member}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex gap-2 border-t border-line pt-3">
                    <input
                      className="admin-input"
                      value={customRosterName}
                      placeholder="명단에 없는 이름 직접 추가"
                      onChange={(event) => setCustomRosterName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addCustomRosterName();
                        }
                      }}
                    />
                    <button type="button" className="admin-button shrink-0" onClick={addCustomRosterName}>추가</button>
                  </div>
                </div>
              )}

              <span className="mt-2 block text-xs text-slate-400">선택한 명단과 체크인한 이름을 대조해 불참 여부를 확인합니다. 번개처럼 여러 시즌이 섞이면 시즌별 ‘전체 추가’로 합칠 수 있습니다.</span>
            </div>

            <p className="text-xs text-slate-400 md:col-span-2">
              활성화는 아래 이벤트 목록에서 ‘활성화’ 버튼으로 지정합니다. 활성 이벤트만 체크인이 열립니다.
            </p>
            <div className="flex gap-2 md:col-span-2">
              <button className="admin-button" type="submit" disabled={isBusy}>
                {editingEventId ? "이벤트 수정" : "이벤트 추가"}
              </button>
              {editingEventId && (
                <button className="admin-button-muted" type="button" onClick={() => { setEditingEventId(null); setEventForm(emptyEventForm); setRosterNames([]); setShowRosterPicker(false); }}>
                  취소
                </button>
              )}
            </div>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">이벤트</th>
                  <th className="px-4 py-3">태그</th>
                  <th className="px-4 py-3">일시</th>
                  <th className="px-4 py-3">정원</th>
                  <th className="px-4 py-3">활성</th>
                  <th className="px-4 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((event) => (
                  <tr className="text-slate-700" key={event.id}>
                    <td className="px-4 py-4 font-semibold text-slate-900">{event.title}</td>
                    <td className="px-4 py-4">{tags.find((tag) => tag.id === event.tag_id)?.name ?? "-"}</td>
                    <td className="px-4 py-4">{event.event_date ? formatDateTime(event.event_date) : "-"}</td>
                    <td className="px-4 py-4">{event.capacity}명</td>
                    <td className="px-4 py-4">
                      {event.is_active ? (
                        <button
                          type="button"
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          disabled={isBusy}
                          title="클릭하면 비활성화됩니다"
                          onClick={() => setEventActive(event, false)}
                        >
                          활성 중
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="table-button"
                          disabled={isBusy}
                          onClick={() => setEventActive(event, true)}
                        >
                          활성화
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <button className="table-button" type="button" onClick={() => { setSelectedEventId(event.id); editEvent(event); }}>편집</button>
                      <button className="table-button-danger ml-2" type="button" disabled={isBusy} onClick={() => deleteEvent(event.id)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <SeasonsManager seasons={seasons} onChanged={() => loadSeasons().catch((seasonError) => setError(seasonError.message))} />
          <TagsManager tags={tags} onChanged={() => loadTags().catch((tagError) => setError(tagError.message))} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="총 출석 수" value={stats?.total ?? records.length} tone="bright" />
        <StatCard label="멤버 수" value={stats?.member ?? 0} />
        <StatCard label="게스트 수" value={stats?.guest ?? 0} />
        <StatCard label="잔여 좌석" value={stats?.remaining ?? 0} />
      </div>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[14rem_1fr_auto_auto_auto] lg:items-center">
          <select className="admin-input" value={selectedEvent?.id ?? ""} onChange={(event) => setSelectedEventId(event.target.value)}>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
          <input className="admin-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 휴대폰, 메모 검색" />
          <div className="grid grid-cols-3 gap-2">
            {[
              ["all", "전체"],
              ["member", "멤버"],
              ["guest", "게스트"]
            ].map(([value, label]) => (
              <button className={`filter-button ${filter === value ? "filter-button-active" : ""}`} key={value} type="button" onClick={() => setFilter(value as FilterValue)}>
                {label}
              </button>
            ))}
          </div>
          <button className="admin-button" type="button" onClick={downloadExcel}>엑셀 내보내기</button>
          <button className="danger-button" type="button" disabled={isBusy} onClick={resetAll}>전체 초기화</button>
        </div>
      </section>

      {selectedEvent && (
        <section className="rounded-lg border border-line bg-panel p-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-slate-900">{selectedEvent.title}</h3>
            {selectedEvent.description && (
              <p className="text-sm leading-6 text-slate-600">{selectedEvent.description}</p>
            )}
            {selectedEvent.custom_options.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedEvent.custom_options.map((option) => (
                  <span key={option.id} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                    {option.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {rosterMatch.roster.length > 0 && (
            <div className="mt-5 border-t border-line pt-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="font-semibold text-slate-900">명단 대조</span>
                <span className="text-slate-500">명단 {rosterMatch.roster.length}명</span>
                <span className="text-emerald-700">출석 {rosterMatch.present.length}명</span>
                <span className="text-red-600">불참 {rosterMatch.absent.length}명</span>
                {rosterMatch.unexpected.length > 0 && (
                  <span className="text-slate-500">명단 외 {rosterMatch.unexpected.length}명</span>
                )}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-red-600">불참 ({rosterMatch.absent.length})</p>
                  {rosterMatch.absent.length === 0 ? (
                    <p className="text-sm text-slate-400">전원 출석했습니다.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rosterMatch.absent.map((name) => (
                        <span key={name} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-sm text-red-700">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">명단 외 체크인 ({rosterMatch.unexpected.length})</p>
                  {rosterMatch.unexpected.length === 0 ? (
                    <p className="text-sm text-slate-400">명단에 없는 체크인이 없습니다.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {rosterMatch.unexpected.map((record) => (
                        <span key={record.id} className="rounded-md border border-line bg-white px-2.5 py-1 text-sm text-slate-600">{record.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <AttendanceTable records={filteredRecords} options={selectedEvent?.custom_options ?? []} onDelete={deleteRecord} isBusy={isBusy} />

      <AttendanceStats />
    </div>
  );

  function setEventFormValue<K extends keyof EventFormInput>(key: K, value: EventFormInput[K]) {
    setEventForm((current) => ({ ...current, [key]: value }));
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

// `datetime-local` 인풋은 사용자 로컬 타임존의 wall-clock 문자열을 다룬다.
// Supabase의 timestamptz 컬럼에 안전하게 저장하려면 UTC ISO로 변환해 보내야 한다.
function localInputToIso(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

// DB에서 받은 UTC ISO 문자열을 `datetime-local` 인풋이 기대하는
// "YYYY-MM-DDTHH:mm" 로컬 wall-clock 문자열로 되돌린다.
function isoToLocalInput(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildExcelHtml(headers: string[], rows: Record<string, string>[], title: string) {
  const body = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(title)}</h1><table border="1"><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

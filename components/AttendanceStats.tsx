"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatsResponse } from "@/types/attendance";

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export default function AttendanceStats() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stats", { cache: "no-store" });
      const json = (await response.json()) as StatsResponse & { error?: string };
      if (!response.ok) {
        setError(json.error ?? "통계를 불러오지 못했습니다.");
        return;
      }
      setData(json);
      setSelectedTagId((current) => current || json.tags[0]?.id || "");
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 태그 기준으로 모든 시즌 멤버의 참석률을 계산합니다. 시즌은 멤버 옆에 라벨로만 표기합니다.
  const { rows, eventCount, averageRate } = useMemo(() => {
    if (!data || !selectedTagId) {
      return { rows: [], eventCount: 0, averageRate: 0 };
    }

    const tagEvents = data.events.filter((event) => event.tag_id === selectedTagId);
    const eventCount = tagEvents.length;

    // 멤버를 이름 기준으로 모으고, 속한 시즌들을 라벨로 합칩니다.
    const memberMap = new Map<string, { name: string; seasons: string[] }>();
    for (const season of data.seasons) {
      for (const member of season.members) {
        const key = normalizeName(member);
        if (!key) {
          continue;
        }
        const entry = memberMap.get(key);
        if (entry) {
          if (!entry.seasons.includes(season.name)) {
            entry.seasons.push(season.name);
          }
        } else {
          memberMap.set(key, { name: member, seasons: [season.name] });
        }
      }
    }

    const rows = [...memberMap.values()]
      .map(({ name, seasons }) => {
        const key = normalizeName(name);
        const attended = tagEvents.filter((event) => event.attendees.some((attendee) => normalizeName(attendee) === key)).length;
        return {
          name,
          seasons: seasons.join(", "),
          attended,
          rate: eventCount > 0 ? Math.round((attended / eventCount) * 100) : 0
        };
      })
      .sort((a, b) => b.attended - a.attended || a.name.localeCompare(b.name, "ko"));

    const totalAttendance = rows.reduce((sum, row) => sum + row.attended, 0);
    const averageRate =
      eventCount > 0 && rows.length > 0 ? Math.round((totalAttendance / (rows.length * eventCount)) * 100) : 0;

    return { rows, eventCount, averageRate };
  }, [data, selectedTagId]);

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">참석률 통계</h3>
        <button type="button" className="table-button" onClick={load} disabled={loading}>
          {loading ? "불러오는 중" : "새로고침"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">태그별로 멤버 참석률을 확인합니다. 멤버 옆에 소속 시즌이 표기됩니다.</p>

      {error && <p className="notice-error mt-3">{error}</p>}

      {data && data.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setSelectedTagId(tag.id)}
              className={`filter-button ${selectedTagId === tag.id ? "filter-button-active" : ""}`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        {eventCount === 0 ? (
          <p className="text-sm text-slate-400">선택한 태그의 이벤트가 없습니다.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 멤버가 없습니다. &lsquo;시즌 멤버 관리&rsquo;에서 멤버를 추가해주세요.</p>
        ) : (
          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-sm text-slate-500">이벤트 {eventCount}개</span>
              <span className="text-sm text-slate-500">멤버 {rows.length}명</span>
              <span className="text-sm font-semibold text-emerald-700">평균 참석률 {averageRate}%</span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.04em] text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">이름</th>
                    <th className="py-2 pr-4">시즌</th>
                    <th className="py-2 pr-4">참석</th>
                    <th className="py-2">참석률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.name} className="text-slate-700">
                      <td className="py-2 pr-4 font-medium text-slate-900">{row.name}</td>
                      <td className="py-2 pr-4 text-slate-500">{row.seasons || "-"}</td>
                      <td className="py-2 pr-4 tabular-nums">{row.attended} / {eventCount}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.rate}%` }} />
                          </div>
                          <span className="tabular-nums text-slate-600">{row.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

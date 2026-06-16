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

  // 선택한 태그 기준으로 시즌별 멤버 참석률을 계산합니다.
  const seasonStats = useMemo(() => {
    if (!data || !selectedTagId) {
      return [];
    }

    const tagEvents = data.events.filter((event) => event.tag_id === selectedTagId);

    return data.seasons
      .map((season) => {
        const events = tagEvents.filter((event) => event.season_id === season.id);
        const eventCount = events.length;

        const members = season.members.map((member) => {
          const key = normalizeName(member);
          const attended = events.filter((event) => event.attendees.some((name) => normalizeName(name) === key)).length;
          return {
            name: member,
            attended,
            rate: eventCount > 0 ? Math.round((attended / eventCount) * 100) : 0
          };
        });

        const totalAttendance = members.reduce((sum, member) => sum + member.attended, 0);
        const averageRate =
          eventCount > 0 && members.length > 0
            ? Math.round((totalAttendance / (members.length * eventCount)) * 100)
            : 0;

        return { season, eventCount, members, averageRate };
      })
      .filter((entry) => entry.eventCount > 0);
  }, [data, selectedTagId]);

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">참석률 통계</h3>
        <button type="button" className="table-button" onClick={load} disabled={loading}>
          {loading ? "불러오는 중" : "새로고침"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">태그별로 각 시즌 멤버의 참석률을 확인합니다.</p>

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

      <div className="mt-4 space-y-4">
        {seasonStats.length === 0 ? (
          <p className="text-sm text-slate-400">선택한 태그에 해당하는 이벤트가 없습니다.</p>
        ) : (
          seasonStats.map(({ season, eventCount, members, averageRate }) => (
            <div key={season.id} className="rounded-md border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-slate-900">{season.name}</span>
                <span className="text-sm text-slate-500">이벤트 {eventCount}개</span>
                <span className="text-sm text-slate-500">멤버 {members.length}명</span>
                <span className="text-sm font-semibold text-emerald-700">평균 참석률 {averageRate}%</span>
              </div>

              {members.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">이 시즌에 등록된 멤버가 없습니다.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.04em] text-slate-400">
                      <tr>
                        <th className="py-2 pr-4">이름</th>
                        <th className="py-2 pr-4">참석</th>
                        <th className="py-2">참석률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {members.map((member) => (
                        <tr key={member.name} className="text-slate-700">
                          <td className="py-2 pr-4 font-medium text-slate-900">{member.name}</td>
                          <td className="py-2 pr-4 tabular-nums">{member.attended} / {eventCount}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${member.rate}%` }} />
                              </div>
                              <span className="tabular-nums text-slate-600">{member.rate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

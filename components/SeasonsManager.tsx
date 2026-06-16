"use client";

import { FormEvent, useMemo, useState } from "react";
import { Season } from "@/types/attendance";

type SeasonsManagerProps = {
  seasons: Season[];
  onChanged: () => void;
};

export default function SeasonsManager({ seasons, onChanged }: SeasonsManagerProps) {
  // 잡식건축가 = 모든 시즌 멤버를 합친 종합(중복 제거). 시즌을 추가하면 자동 반영됩니다.
  const allMembers = useMemo(() => {
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
  }, [seasons]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [membersText, setMembersText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function startCreate() {
    setIsCreating(true);
    setEditingId(null);
    setName("");
    setMembersText("");
    setError("");
  }

  function startEdit(season: Season) {
    setIsCreating(false);
    setEditingId(season.id);
    setName(season.name);
    setMembersText(season.members.join("\n"));
    setError("");
  }

  function cancel() {
    setIsCreating(false);
    setEditingId(null);
    setName("");
    setMembersText("");
    setError("");
  }

  async function save(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setBusy(true);
    setError("");

    try {
      const endpoint = editingId ? `/api/seasons/${editingId}` : "/api/seasons";
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: { name, members: membersText } })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "시즌 저장에 실패했습니다.");
        return;
      }

      cancel();
      onChanged();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("이 시즌을 삭제할까요? 연결된 이벤트의 시즌 정보는 해제됩니다.")) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/seasons/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "시즌 삭제에 실패했습니다.");
        return;
      }

      if (editingId === id) {
        cancel();
      }
      onChanged();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  const showForm = isCreating || editingId !== null;

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">시즌 멤버 관리</h3>
        {!showForm && <button type="button" className="admin-button" onClick={startCreate}>+ 시즌 추가</button>}
      </div>
      <p className="mt-1 text-sm text-slate-500">시즌별 멤버 명단을 저장해두면 이벤트 생성 시 참가자 명단으로 불러올 수 있습니다.</p>

      {error && <p className="notice-error mt-3">{error}</p>}

      {showForm && (
        <form className="mt-4 space-y-3" onSubmit={save}>
          <label className="block">
            <span className="admin-label">시즌 이름</span>
            <input className="admin-input" value={name} placeholder="예: 시즌1" onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block">
            <span className="admin-label">멤버 명단 (한 줄에 한 명)</span>
            <textarea
              className="admin-input min-h-32 resize-y"
              value={membersText}
              placeholder={"홍길동\n김철수\n이영희"}
              onChange={(event) => setMembersText(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button className="admin-button" type="submit" disabled={busy}>{editingId ? "시즌 수정" : "시즌 추가"}</button>
            <button className="admin-button-muted" type="button" onClick={cancel}>취소</button>
          </div>
        </form>
      )}

      <div className="mt-4 rounded-md border border-slate-900 bg-slate-900 px-4 py-3 text-white">
        <p className="font-semibold">잡식건축가 <span className="font-normal text-slate-300">· 전체 멤버 종합</span></p>
        <p className="mt-0.5 text-xs text-slate-300">
          멤버 {allMembers.length}명 · {allMembers.join(", ") || "등록된 멤버 없음"}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">시즌을 추가하면 자동으로 합산됩니다(중복 제거).</p>
      </div>

      <div className="mt-3 space-y-2">
        {seasons.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 시즌이 없습니다.</p>
        ) : (
          seasons.map((season) => (
            <div key={season.id} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{season.name}</p>
                <p className="truncate text-xs text-slate-500">멤버 {season.members.length}명 · {season.members.join(", ") || "명단 없음"}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" className="table-button" onClick={() => startEdit(season)}>편집</button>
                <button type="button" className="table-button-danger" disabled={busy} onClick={() => remove(season.id)}>삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

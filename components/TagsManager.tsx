"use client";

import { useState } from "react";
import { Tag } from "@/types/attendance";

type TagsManagerProps = {
  tags: Tag[];
  onChanged: () => void;
};

export default function TagsManager({ tags, onChanged }: TagsManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addTag() {
    if (!newName.trim()) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: { name: newName } })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "태그 추가에 실패했습니다.");
        return;
      }
      setNewName("");
      onChanged();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: { name: editingName } })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "태그 수정에 실패했습니다.");
        return;
      }
      setEditingId(null);
      setEditingName("");
      onChanged();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(id: string) {
    if (!window.confirm("이 태그를 삭제할까요? 연결된 이벤트의 태그는 해제됩니다.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "태그 삭제에 실패했습니다.");
        return;
      }
      onChanged();
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h3 className="text-lg font-bold text-slate-900">태그 관리</h3>
      <p className="mt-1 text-sm text-slate-500">이벤트 종류 태그(연사강연, 번개, 독서모임 등)를 관리합니다.</p>

      {error && <p className="notice-error mt-3">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) =>
          editingId === tag.id ? (
            <div key={tag.id} className="flex items-center gap-1">
              <input
                className="admin-input w-32"
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
              />
              <button type="button" className="table-button" disabled={busy} onClick={() => saveEdit(tag.id)}>저장</button>
              <button type="button" className="table-button" onClick={() => { setEditingId(null); setEditingName(""); }}>취소</button>
            </div>
          ) : (
            <span key={tag.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-slate-700">
              {tag.name}
              <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}>편집</button>
              <button type="button" className="text-slate-400 hover:text-red-600" disabled={busy} onClick={() => removeTag(tag.id)}>×</button>
            </span>
          )
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="admin-input w-48"
          value={newName}
          placeholder="새 태그 이름"
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
        />
        <button type="button" className="admin-button" disabled={busy} onClick={addTag}>태그 추가</button>
      </div>
    </section>
  );
}

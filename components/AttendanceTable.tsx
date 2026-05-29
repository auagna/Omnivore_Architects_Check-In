"use client";

import { AttendanceRecord, GroupType } from "@/types/attendance";

type AttendanceTableProps = {
  records: AttendanceRecord[];
  onDelete: (id: string) => void;
  isBusy: boolean;
};

export default function AttendanceTable({ records, onDelete, isBusy }: AttendanceTableProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-panel p-8 text-center text-slate-500">
        표시할 출석 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.04em] text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">시간</th>
              <th className="whitespace-nowrap px-4 py-3">이름</th>
              <th className="whitespace-nowrap px-4 py-3">휴대폰</th>
              <th className="whitespace-nowrap px-4 py-3">타입</th>
              <th className="min-w-48 px-4 py-3">메모</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {records.map((record) => (
              <tr className="text-slate-700" key={record.id}>
                <td className="whitespace-nowrap px-4 py-4 text-slate-500 tabular-nums">{formatTime(record.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">{record.name}</td>
                <td className="whitespace-nowrap px-4 py-4 tabular-nums">{record.phone_last4}</td>
                <td className="whitespace-nowrap px-4 py-4"><GroupBadge groupType={record.group_type} /></td>
                <td className="px-4 py-4 text-slate-600">{record.memo || "-"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right">
                  <button className="table-button-danger" type="button" disabled={isBusy} onClick={() => onDelete(record.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupBadge({ groupType }: { groupType: GroupType }) {
  const isMember = groupType === "member";
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${
        isMember ? "bg-slate-900 text-white" : "border border-line bg-white text-slate-700"
      }`}
    >
      {isMember ? "멤버" : "게스트"}
    </span>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

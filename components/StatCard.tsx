type StatCardProps = {
  label: string;
  value: string | number;
  tone?: "default" | "bright";
};

export default function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === "bright" ? "border-slate-900 bg-slate-900 text-white" : "border-line bg-panel text-slate-900"
      }`}
    >
      <p className={`text-sm ${tone === "bright" ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

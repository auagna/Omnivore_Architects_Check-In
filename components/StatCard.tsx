type StatCardProps = {
  label: string;
  value: string | number;
  tone?: "default" | "bright";
};

export default function StatCard({ label, value, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone === "bright" ? "text-white" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}

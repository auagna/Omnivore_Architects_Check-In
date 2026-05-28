"use client";

import { FormEvent, useState } from "react";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminLogin() {
  const [pin, setPin] = useState("");
  const [verifiedPin, setVerifiedPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "PIN이 올바르지 않습니다.");
        return;
      }

      setVerifiedPin(pin);
    } catch {
      setError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  }

  if (verifiedPin) {
    return <AdminDashboard pin={verifiedPin} onLogout={() => setVerifiedPin("")} />;
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-line bg-panel/95 p-5 shadow-glow">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-200">운영진 PIN</span>
          <input className="focus-ring w-full rounded-md border border-line bg-ink px-4 py-4 text-center text-2xl font-semibold tracking-[0.35em] text-white placeholder:text-zinc-600" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="PIN" inputMode="numeric" autoComplete="off" required />
        </label>

        {error && <p className="notice-error">{error}</p>}

        <button className="focus-ring w-full rounded-md bg-white px-5 py-4 text-lg font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isLoading}>
          {isLoading ? "확인 중" : "운영진 화면 열기"}
        </button>
      </form>
    </div>
  );
}

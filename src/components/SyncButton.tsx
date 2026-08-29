"use client";

import { useState } from "react";

export function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Senkron başarısız");
      const total = (data.sync as { bookingsUpserted: number }[]).reduce(
        (sum, r) => sum + r.bookingsUpserted,
        0,
      );
      setMessage(
        `${data.seed.message}. ${total} kayıt güncellendi.`,
      );
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Senkron başarısız",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Senkronlanıyor…" : "Mock Senkron Çalıştır"}
      </button>
      {message && (
        <p className="text-sm text-[var(--muted)]">{message}</p>
      )}
    </div>
  );
}

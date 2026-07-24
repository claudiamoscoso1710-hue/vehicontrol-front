"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkDriverToUser } from "@/lib/actions/members";

type Props = {
  organizationId: string;
  driverId: string;
};

export function LinkDriverForm({ organizationId, driverId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await linkDriverToUser(organizationId, driverId, email);

    if (!result.success) {
      setError(result.error);
    } else {
      setEmail("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email del conductor"
        required
        className="min-w-[180px] flex-1 rounded-md border px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
      >
        {loading ? "..." : "Vincular app"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}

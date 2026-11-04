"use client";

import { useState } from "react";

export function ShareButton({ title, label, copied }: { title: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled, or sharing is unavailable. Copying the link still works.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      window.setTimeout(() => setDone(false), 2500);
    } catch {
      // Without clipboard access the address bar is still there.
    }
  };
  return (
    <button type="button" className="btn btn-line" onClick={share} aria-live="polite">
      {done ? copied : label}
    </button>
  );
}

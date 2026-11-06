"use client";

import { Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur sticky top-0 z-20 flex items-center px-8 gap-4">
      <button
        onClick={() => {
          const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
          document.dispatchEvent(ev);
        }}
        className="flex items-center gap-2 h-8 px-2 rounded-md text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 flex-1 max-w-sm"
      >
        <Search className="w-4 h-4" />
        <span>Search or run a command…</span>
        <kbd className="ml-auto text-xs border border-neutral-200 dark:border-neutral-800 rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}
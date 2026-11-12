"use client";

import { Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20 flex items-center px-8 gap-4">
      <button
        onClick={() => {
          const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
          document.dispatchEvent(ev);
        }}
        className="flex items-center gap-2 h-9 px-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex-1 max-w-sm transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search or run a command…</span>
        <kbd className="ml-auto text-[10px] font-medium border border-border bg-muted/60 rounded-md px-1.5 py-0.5 text-muted-foreground">
          ⌘K
        </kbd>
      </button>
    </header>
  );
}

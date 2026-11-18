"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { SearchDialog } from "@/components/terminal/search-dialog";
import { useHotkey } from "@/hooks/use-hotkey";
import { cn } from "@/lib/utils";
import { StatusStrip } from "./status-strip";
import { NAV, type NavSection, TopBar } from "./top-bar";

export function AppShell({ section, children }: { section?: NavSection; children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  useHotkey(
    (e) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k",
    () => setSearchOpen(true),
  );
  useHotkey(
    (e) => e.key === "/",
    () => setSearchOpen(true),
    { ignoreInputs: true },
  );
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar section={section} onSearch={() => setSearchOpen(true)} />
      <main id="main-content" className="min-h-0 flex-1 overflow-auto">
        {children}
      </main>
      <StatusStrip />
      <nav
        aria-label="Primary"
        className="grid h-[calc(56px+env(safe-area-inset-bottom))] shrink-0 grid-cols-4 border-t bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.section === section ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center border-t-2 border-transparent font-medium text-xs text-muted-foreground transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-foreground",
              item.section === section && "border-primary text-primary",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

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
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      <StatusStrip />
      <nav aria-label="Primary" className="grid h-14 shrink-0 grid-cols-4 border-t bg-sidebar md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.section === section ? "page" : undefined}
            className={cn(
              "flex items-center justify-center text-muted-foreground",
              item.section === section && "font-medium text-primary",
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

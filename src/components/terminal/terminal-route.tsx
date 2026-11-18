"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TerminalSkeleton } from "./panel-skeleton";
import { Terminal } from "./terminal";

function TerminalForRoute() {
  const { mint } = useParams<{ mint: string }>();
  return <Terminal mint={mint} />;
}

export function TerminalRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <TerminalForRoute /> : <TerminalSkeleton />;
}

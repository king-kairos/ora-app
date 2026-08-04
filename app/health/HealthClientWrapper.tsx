"use client";

import { HealthProvider } from "./context";
import type { ReactNode } from "react";

export default function HealthClientWrapper({
  children,
}: {
  children: ReactNode;
}) {
  return <HealthProvider>{children}</HealthProvider>;
}

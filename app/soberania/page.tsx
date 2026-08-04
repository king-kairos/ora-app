"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SoberaniaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/kairos");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#00ff88",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        padding: 24,
      }}
    >
      Redirigiendo a la cabina soberana única...
    </div>
  );
}

import type { ReactNode, CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import HealthClientWrapper from "./HealthClientWrapper";
import NavBar from "./NavBar";

export const metadata: Metadata = {
  title: "ORA Health SMG",
  description: "Núcleo clínico de pacientes, doctores, consultas, recetas y analíticas.",
  applicationName: "ORA Health SMG",
  keywords: [
    "ORA Health",
    "ORA Health SMG",
    "Pacientes",
    "Doctores",
    "Consultas",
    "Recetas",
    "Analíticas",
    "Expediente clínico",
    "Salud",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ORA Health",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/icons/icon-192.png"],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function HealthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div style={shellStyle}>
      <NavBar />

      <HealthClientWrapper>
        <main style={contentStyle}>{children}</main>
      </HealthClientWrapper>
    </div>
  );
}

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#00ff88",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
};

const contentStyle: CSSProperties = {
  padding: "0",
};


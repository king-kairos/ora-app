"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

const navItems = [
  { href: "/health", label: "Dashboard" },
  { href: "/health/patients", label: "Pacientes" },
  { href: "/health/doctors", label: "Doctores" },
  { href: "/health/consultations", label: "Consultas" },
  { href: "/health/prescriptions", label: "Recetas" },
  { href: "/health/analytics", label: "Analíticas" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header style={headerStyle}>
      <div style={brandRowStyle}>
        <div>
          <div style={badgeStyle}>ORA HEALTH SMG</div>
          <h1 style={brandTitleStyle}>Núcleo Clínico</h1>
        </div>
      </div>

      <nav style={navScrollWrapStyle}>
        <div style={navStyle}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  ...navLinkStyle,
                  border: isActive
                    ? "1px solid #00ff88"
                    : "1px solid rgba(0,255,136,0.35)",
                  background: isActive ? "#001a10" : "#0b0b0b",
                  boxShadow: isActive
                    ? "0 0 10px rgba(0,255,136,0.28)"
                    : "none",
                }}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

const headerStyle: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 20,
  background: "rgba(5,5,5,0.96)",
  borderBottom: "1px solid rgba(0,255,136,0.25)",
  padding: "16px 16px 14px",
  backdropFilter: "blur(8px)",
};

const brandRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  border: "1px solid #00ff88",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: 12,
  marginBottom: 10,
};

const brandTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.1,
};

const navScrollWrapStyle: CSSProperties = {
  overflowX: "auto",
  overflowY: "hidden",
  WebkitOverflowScrolling: "touch",
};

const navStyle: CSSProperties = {
  display: "inline-flex",
  gap: 10,
  minWidth: "max-content",
  paddingBottom: 2,
};

const navLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "#00ff88",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: 14,
  whiteSpace: "nowrap",
};

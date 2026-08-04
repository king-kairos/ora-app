import Script from "next/script";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ORA — Origen Real de la Alianza",
  description: "ORA Central | Núcleo Kairos | Sistema de Inteligencia Modular",
  applicationName: "ORA",
  authors: [{ name: "ORA Alliance" }],
  keywords: [
    "ORA",
    "Origen Real de la Alianza",
    "Kairos",
    "Inteligencia modular",
    "Sistema ORA",
  ],
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#050505",
          color: "#00ff88",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        {children}

        <Script id="ora-sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker
                  .register('/sw.js')
                  .catch(function (error) {
                    console.error('SW registration failed:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}

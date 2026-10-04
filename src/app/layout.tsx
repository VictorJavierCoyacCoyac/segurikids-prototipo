import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SeguriKids · Control de acceso escolar",
    template: "%s · SeguriKids",
  },
  description:
    "Prototipo funcional de SeguriKids: control seguro de entradas, salidas y recogida de alumnos en centros preescolares mediante validación de personas autorizadas con código QR.",
  applicationName: "SeguriKids",
  authors: [{ name: "Prototipo académico SeguriKids" }],
  keywords: ["seguridad escolar", "control de acceso", "preescolar", "QR", "prototipo"],
  robots: { index: false, follow: false }, // Prototipo: no debe indexarse.
};

/** Configuración pensada para que la web se sienta como una app instalada. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2549e0",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

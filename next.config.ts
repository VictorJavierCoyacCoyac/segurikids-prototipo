import type { NextConfig } from "next";

/**
 * Dominios autorizados para compartir la demostración por túnel.
 *
 * Next.js rechaza las Server Actions cuyo `Origin` no coincide con el `Host`
 * (protección contra CSRF). Al exponer el prototipo con un reenvío de puerto,
 * el origen es el dominio público del túnel y hay que declararlo aquí; si no,
 * la interfaz se ve pero los botones fallan con «Invalid Server Actions request».
 *
 * Se usa `**` y no `*` porque el comodín simple de Next solo cubre UN segmento,
 * y los dominios de túnel suelen tener varios (p. ej. `abc-3000.use.devtunnels.ms`).
 *
 * ⚠️ Solo para demostraciones. En producción la aplicación se sirve desde su
 * propio dominio y esta lista debe quedar vacía.
 */
const TUNNEL_ORIGINS = [
  // ── Reenvío de puertos de VS Code (dev tunnels) ──
  // Su proxy REESCRIBE la cabecera `Origin` con la dirección local de destino,
  // de modo que al servidor le llega `localhost:3000` aunque el navegador esté
  // en `xxx-3000.usw3.devtunnels.ms`. Por eso hay que autorizar el origen local
  // además del dominio público: el comodín del dominio por sí solo no basta.
  "localhost:3000",
  "localhost:3001",
  "**.devtunnels.ms",

  // ── Túneles que sí conservan el `Origin` original ──
  "**.trycloudflare.com", // cloudflared tunnel --url
  "**.lhr.life", // localhost.run (ssh)
  "**.ngrok-free.app", // ngrok
  "**.ngrok.io",
  "**.loca.lt", // localtunnel
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El prototipo se sirve como aplicación web responsive (mobile first).
  // Preparado para envolverse con Capacitor/Expo Web si el proyecto evoluciona a app nativa.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: TUNNEL_ORIGINS,
    },
  },
  // Permite que el servidor de desarrollo acepte peticiones desde el túnel.
  allowedDevOrigins: TUNNEL_ORIGINS,
};

export default nextConfig;

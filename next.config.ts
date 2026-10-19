import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Alleen voor de lokale dev-server: zo werkt testen op de telefoon via het netwerkadres van de Mac.
  // Next 16.3 blokkeert dat anders en de pagina blijft leeg. Verandert het adres, pas dit dan aan.
  allowedDevOrigins: ["192.168.0.23"],
  /* config options here */
  experimental: {
    serverActions: {
      // Mediabibliotheek stuurt genormaliseerde webp's als base64 mee naar een server action;
      // dat kan boven de standaard 1 MB uitkomen.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

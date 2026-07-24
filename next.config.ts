import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

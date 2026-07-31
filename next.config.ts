import type { NextConfig } from "next";

function supabaseHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/render/image/public/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from the Supabase domain
    domains: ["jhsxcdnygnqpvqbephkz.supabase.co"],
    // More specific pattern matching for different URL structures
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jhsxcdnygnqpvqbephkz.supabase.co',
        pathname: '/**', // Allow any path structure
      },
    ],
    // Don't limit image sizes since we're using external storage
    unoptimized: true,
  },
};

export default nextConfig;

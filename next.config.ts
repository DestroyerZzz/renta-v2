import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from the Supabase domain
    domains: [
      "hoeawwtkoongxratcaau.supabase.co",
      "lh3.googleusercontent.com",
      "lh4.googleusercontent.com",
      "lh5.googleusercontent.com",
      "l65.googleusercontent.com",
],
    // More specific pattern matching for different URL structures
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hoeawwtkoongxratcaau.supabase.co',
        pathname: '/**', // Allow any path structure
      },
      {
       protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**', 
      },
    ],
    // Disable unoptimized for production to use Next.js image optimization
    unoptimized: process.env.NODE_ENV === 'development',
    // Optimize image formats - use modern formats when supported
    formats: ['image/avif', 'image/webp'],
    // Set reasonable image quality level
    minimumCacheTTL: 60, // Cache images for at least 60 seconds
    dangerouslyAllowSVG: true, // Allow SVG images if needed
  },
  // Add transpilePackages to correctly handle Supabase dependencies
  transpilePackages: [
    '@supabase/supabase-js',
    '@supabase/ssr',
    '@supabase/auth-helpers-nextjs',
  ],
  // Disable strict mode temporarily to avoid double rendering issues during dev
  reactStrictMode: false,
  experimental: {
    // Enable optimistic updates for better performance
    optimisticClientCache: true,
  }
};

export default nextConfig;

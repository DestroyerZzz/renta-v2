import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import LoadingProvider from "@/components/ui/LoadingProvider";
import { Suspense } from "react";


const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Product Dashboard",
  description: "A product management dashboard built with Next.js and Supabase By DR-Ninja",
  keywords: ["интересы", "панель приборов", "управление", " инвентарь", "управление интересами"],
  authors: [{ name: "Mohamed Foad & Front2Back" }],
  creator: "Mohamed Foad & Front2Back",
  publisher: "Dr-Ninja",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={inter.className}>
        <LoadingProvider color="#3d82f7" height={3} />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
          {children}
        </Suspense>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

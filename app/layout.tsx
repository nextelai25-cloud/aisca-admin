import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'AISCA Admin | Board Operations Panel',
  description: 'AISCA Board Administration Dashboard',
  icons: {
    icon: [
      { url: 'https://aisca.lk/favicon.ico', sizes: '32x32' },
      { url: 'https://aisca.lk/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: 'https://aisca.lk/apple-touch-icon.png' }],
    shortcut: 'https://aisca.lk/favicon.ico'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="https://aisca.lk/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="https://aisca.lk/apple-touch-icon.png" />
        <title>AISCA Admin | Board Operations Panel</title>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  );
}

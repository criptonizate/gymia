import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { OfflineBadge } from "@/components/offline-badge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GYMIA",
  description: "Tu rutina de gimnasio, simple y en vivo desde el celular.",
  applicationName: "GYMIA",
  appleWebApp: {
    capable: true,
    title: "GYMIA",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        <OfflineBadge />
        {children}
      </body>
    </html>
  );
}

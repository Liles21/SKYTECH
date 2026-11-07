import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "Sky-Tech ISP | Reliable connectivity",
  description: "Manage your Sky-Tech internet service in one place.",
  icons: {
    icon: "/images/Skytech.jpg",
    shortcut: "/images/Skytech.jpg",
    apple: "/images/Skytech.jpg",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

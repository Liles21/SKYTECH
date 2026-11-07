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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('skytech-admin-theme') === 'dark') {
                  document.documentElement.classList.add('admin-dark-mode');
                } else {
                  document.documentElement.classList.remove('admin-dark-mode');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

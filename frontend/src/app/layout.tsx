import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "chudvault - Your Twitter Bookmarks Archive",
    template: "%s | chudvault"
  },
  description: "Organize and manage your Twitter bookmarks with chudvault. Search, tag, and archive your favorite tweets.",
  keywords: ["Twitter", "Bookmarks", "Archive", "Social Media", "Organization"],
  authors: [{ name: "chudvault" }],
  creator: "chudvault",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chudvault.app",
    title: "chudvault - Your Twitter Bookmarks Archive",
    description: "Organize and manage your Twitter bookmarks with chudvault. Search, tag, and archive your favorite tweets.",
    siteName: "chudvault",
  },
  twitter: {
    card: "summary_large_image",
    title: "chudvault - Your Twitter Bookmarks Archive",
    description: "Organize and manage your Twitter bookmarks with chudvault",
    creator: "@chudvault",
  },
  icons: {
    icon: [
      {
        url: "/logo.svg",
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: "/logo.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <ThemeProvider>{children}</ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

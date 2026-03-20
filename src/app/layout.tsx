import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ShowTrackr",
    template: "%s | ShowTrackr",
  },
  description:
    "Track your favorite TV shows — discover new series, follow episodes, and never lose your place.",
  metadataBase: new URL("https://show-trackr-ten.vercel.app"),
  openGraph: {
    title: "ShowTrackr",
    description:
      "Track your favorite TV shows — discover new series, follow episodes, and never lose your place.",
    url: "https://show-trackr-ten.vercel.app",
    siteName: "ShowTrackr",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShowTrackr",
    description:
      "Track your favorite TV shows — discover new series, follow episodes, and never lose your place.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="font-sans min-h-screen pb-20">{children}</body>
    </html>
  );
}

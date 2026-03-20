import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ShowTrackr",
  description:
    "Track your favorite TV shows — discover new series, follow episodes, and never lose your place.",
  openGraph: {
    title: "ShowTrackr",
    description:
      "Track your favorite TV shows — discover new series, follow episodes, and never lose your place.",
    url: "https://show-trackr-ten.vercel.app",
    siteName: "ShowTrackr",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShowTrackr",
    description:
      "Track your favorite TV shows — discover new series, follow episodes, and never lose your place.",
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "MailCast — Broadcast newsletters from your own Gmail",
  description:
    "The simplest way to send mass newsletter broadcasts straight from your Gmail account. Bring your app password, import your list, write, and send.",
  keywords: [
    "newsletter",
    "gmail broadcast",
    "mass email",
    "newsletter tool",
    "email marketing",
    "app password",
  ],
  authors: [{ name: "MailCast" }],
  openGraph: {
    title: "MailCast — Broadcast newsletters from your own Gmail",
    description:
      "Send mass newsletter broadcasts straight from your Gmail account. Simple, fast, affordable.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MailCast",
    description: "Broadcast newsletters from your own Gmail.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

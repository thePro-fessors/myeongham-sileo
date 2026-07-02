import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "Myeongham - Online Business Cards",
  description: "Create and share your beautiful, custom-designed business cards. Support for QR codes, NFC, and HCE.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${outfit.variable} dark antialiased`}>
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}

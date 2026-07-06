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
  metadataBase: new URL("https://no-paper.kro.kr"),
  title: "no-paper - 스마트한 모바일 인맥 명함첩",
  description: "나만의 고품격 모바일 명함을 3초 만에 만들고 NFC, QR코드 기술로 손쉽게 공유해보세요. 인맥을 똑똑하게 관리하는 나만의 명함첩 지갑.",
  openGraph: {
    title: "no-paper - 스마트한 모바일 인맥 명함첩",
    description: "나만의 고품격 모바일 명함을 3초 만에 만들고 NFC, QR코드 기술로 손쉽게 공유해보세요. 인맥을 똑똑하게 관리하는 나만의 명함첩 지갑.",
    type: "website",
    images: ["data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"],
  },
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

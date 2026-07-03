import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://no-paper.kro.kr"),
  title: "Myeongham - 모바일 명함 공유",
  description: "누군가 당신에게 모바일 명함을 보냈습니다. 링크를 터치하여 확인하고 편리하게 내 명함첩 지갑에 보관해 보세요.",
  openGraph: {
    title: "Myeongham - 모바일 명함 공유",
    description: "누군가 당신에게 모바일 명함을 보냈습니다. 링크를 터치하여 확인하고 편리하게 내 명함첩 지갑에 보관해 보세요.",
    images: [
      {
        url: "/og-image-v3.png",
        width: 1200,
        height: 1200,
        alt: "Myeongham 모바일 명함 공유 미리보기",
      },
    ],
    type: "website",
  },
};

export default function ShareLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

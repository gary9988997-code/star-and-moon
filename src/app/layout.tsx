import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC, Playfair_Display } from "next/font/google";
import { BackgroundMusic } from "@/components/BackgroundMusic";
import { SiteNav } from "@/components/SiteNav";
import { StarField } from "@/components/StarField";
import { siteMeta } from "@/data/site";
import "./globals.css";

/** 中文标题：Noto Serif SC / 思源宋体 */
const display = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

/** 中文正文：Noto Sans SC / 思源黑体 */
const body = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

/** 英文点缀：Playfair Display（中文自动回退到 display 栈） */
const accent = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: siteMeta.title,
  description: siteMeta.description,
  openGraph: {
    title: siteMeta.shareTitle,
    description: siteMeta.shareDescription,
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary",
    title: siteMeta.shareTitle,
    description: siteMeta.shareDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${display.variable} ${body.variable} ${accent.variable}`}
    >
      <body className="font-body relative min-h-dvh">
        <StarField />
        <BackgroundMusic />
        {children}
        <SiteNav />
      </body>
    </html>
  );
}

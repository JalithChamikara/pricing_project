import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { AuthProvider } from "@/lib/auth";
import Header from "@/components/Header";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"], display: "swap" });
const notoSinhala = Noto_Sans_Sinhala({
  variable: "--font-noto-sinhala",
  preload: false,
  display: "swap",
});
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Room Price — Pricing help for small hotels in Sri Lanka",
  description:
    "Simple AI price suggestions for small hotels, guesthouses and homestays in Sri Lanka, in English, Sinhala and Tamil.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#039855",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSinhala.variable} ${notoTamil.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <I18nProvider>
          <AuthProvider>
            <Header />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-6 sm:px-6">{children}</main>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

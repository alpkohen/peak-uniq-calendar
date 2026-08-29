import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Logo } from "@/components/Logo";
import { MainNav } from "@/components/MainNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kapasite Takip | Peak",
  description: "Peak eğitmen doluluk ve kapasite takip sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <header className="app-header sticky top-0 z-50">
            <div className="app-header-inner">
              <Logo />
              <MainNav />
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto max-w-[1200px] px-4 py-4 text-sm text-slate-500 sm:px-6">
              Peak · Kapasite Takip
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CineFreak — Download Movies",
  description:
    "Browse and download movies. Trending titles, latest releases and full movie details.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-night text-zinc-100">
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <footer className="border-t border-line bg-panel mt-12">
          <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-400">
              <span className="font-bold text-accent">CINEFREAK</span> — Your
              movie download destination.
            </p>
            <p className="text-xs text-zinc-500">
              Movie data &amp; posters provided by TMDB. This product uses the
              TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </footer>
        <script data-cfasync="false" src="https://aarems.org/1/9c562358bc2a25639f5158f38088d68d"></script>
      </body>
    </html>
  );
}

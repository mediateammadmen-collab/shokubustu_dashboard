import { IBM_Plex_Sans, Shippori_Mincho } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex" });
const mincho = Shippori_Mincho({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-mincho" });

export const metadata = {
  title: "Shokubutsu · Meta Ads",
  description: "Live Meta Ads performance for Shokubutsu Bangladesh.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${plex.variable} ${mincho.variable}`}>
      <body className="min-h-dvh">
        <Header />
        <main className="mx-auto max-w-[1360px] px-4 pb-20 sm:px-8">{children}</main>
      </body>
    </html>
  );
}

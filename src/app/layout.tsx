import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { Toaster } from "@/components/ui/sonner";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = { title: "PTM", description: "Projects, time, billing, bookkeeping." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} antialiased`}>
        <Providers>
          <CommandPalette />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
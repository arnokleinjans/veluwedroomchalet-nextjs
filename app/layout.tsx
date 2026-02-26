import type { Metadata } from "next";
import { Nunito, Lora } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Great Stay - Veluwe Droomchalet",
  description: "Digitale Conciërge voor uw verblijf.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script type="module" suppressHydrationWarning src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js" async></script>
        <script noModule suppressHydrationWarning src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js" async></script>
      </head>
      <body className={`${nunito.variable} ${lora.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

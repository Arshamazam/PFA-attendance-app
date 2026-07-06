import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "PFA Attendance — Admin Panel",
  description: "Punjab Food Authority Attendance Management System",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DumpPost",
  description: "Dump your thoughts. Post your story.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
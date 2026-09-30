import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisualVoice | Text-to-Pictogram Translation for AAC",
  description: "An Intelligent Text-to-Pictogram Translation System for AAC - VIT Chennai Capstone Project BCSE497J - T5-Base 51.41 BLEU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50 antialiased">
        {children}
      </body>
    </html>
  );
}

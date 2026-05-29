import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/src/lib/calendar/i18n";

export const metadata: Metadata = {
  title: "Cozy Casa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

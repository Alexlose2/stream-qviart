import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stream Qviart",
  description: "Panel privado para arrancar y ver la transmision de la Raspberry."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

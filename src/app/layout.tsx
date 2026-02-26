import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema Inmobiliaria",
  description: "ERP para gestión de desarrollos inmobiliarios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

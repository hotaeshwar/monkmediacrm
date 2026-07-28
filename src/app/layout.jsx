import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Monk Media CRM",
  description: "Advanced CRM platform for Monk Media marketing and production agency.",
  icons: {
    icon: "/logonew.png",
    shortcut: "/logonew.png",
    apple: "/logonew.png",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className={`${inter.className} h-full bg-white text-sky-600 antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

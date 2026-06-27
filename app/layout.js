import localFont from "next/font/local";
import "./globals.css";
import {Outfit} from 'next/font/google'
import { ClerkProvider } from "@clerk/nextjs";
import Provider from "./provider";
import QueryProvider from "./QueryProvider";
import { Toaster } from "@/components/ui/sonner";
export const metadata = {
  title: "Gemini LMS",
  description: "AI-Powered Learning Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gemini LMS",
  },
  icons: {
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

const outfit=Outfit({subsets:['latin']});

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body
        className={outfit.className}
      >
        <QueryProvider>
          <Provider>
            {children}
            <Toaster />
          </Provider>
        </QueryProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}

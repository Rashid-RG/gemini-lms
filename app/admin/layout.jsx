import AdminLayoutClient from "./AdminLayoutClient";

export const metadata = {
  title: "Gemini LMS Admin",
  description: "Gemini LMS Administration Portal",
  manifest: "/manifest-admin.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gemini Admin",
  },
  icons: {
    apple: [
      { url: "/icon-admin-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function AdminLayout({ children }) {
  return (
    <AdminLayoutClient>
      {children}
    </AdminLayoutClient>
  );
}

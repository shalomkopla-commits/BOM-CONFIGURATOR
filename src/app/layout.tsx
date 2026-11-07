import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'קונפיגורטור מוצר – יצירת BOM לפי דרישת לקוח',
  description:
    'מערכת לניהול תצורה, גזירת BOM אוטומטית, עץ מוצר ויזואלי, Metadata מלא וסל מיחזור (Next.js + Supabase)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-slate-100 text-slate-900 font-sans min-h-screen flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}


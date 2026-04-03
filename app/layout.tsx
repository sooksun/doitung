// app/layout.tsx
// Root layout for Next.js App Router

import type { Metadata } from 'next';
import { Kanit } from 'next/font/google';
import './globals.css';
import ToastProvider from './components/ToastProvider';

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Doitung School Quality Dashboard',
  description: 'ระบบประเมินและพัฒนาคุณภาพโรงเรียนด้วยเครื่องมือ DERS, Thai P.1-3, และ Q-Model',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={kanit.className}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}

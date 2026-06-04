// app/layout.tsx
// Root layout for Next.js App Router

import type { Metadata } from 'next';
import { Kanit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ToastProvider from './components/ToastProvider';
import { ThemeProvider } from './components/ui';
import { ConditionalShell } from './components/shell/ConditionalShell';

const kanit = Kanit({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'thai'],
  display: 'swap',
  variable: '--font-kanit',
});

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'TSQMn แม่ฟ้าหลวง — Doitung Development Evaluation',
  description: 'ระบบประเมินและพัฒนาคุณภาพโรงเรียนด้วยเครื่องมือ DERS, Thai P.1-3, และ Q-Model',
};

// Runs before paint to set data-theme on <html>, preventing a flash of the wrong theme.
const themeInitScript = `(function(){try{var t=localStorage.getItem('de-theme');if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${kanit.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className={kanit.className}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <ConditionalShell>{children}</ConditionalShell>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}

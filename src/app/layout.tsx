import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tripit',
  description: 'Follow our trip progress on an interactive map!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-sky-100">
        {children}
      </body>
    </html>
  );
}

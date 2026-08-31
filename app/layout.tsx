import type { Metadata } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';

const heading = Barlow_Condensed({ variable: '--font-heading', subsets: ['latin'], weight: ['600', '700', '800'] });
const body = Inter({ variable: '--font-body', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bentengan: Squad Tag — Playable Prototype',
  description: 'Bentengan web 2,5D 5v5: pilih Tim Merah atau Hijau, mainkan 12 karakter unik, sprint, parkour, penjara, dan rescue.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${heading.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}

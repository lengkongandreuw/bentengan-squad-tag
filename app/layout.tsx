import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const body = Poppins({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  icons: { icon: './favicon-bst.png?v=1' },
  title: 'Bentengan: Squad Tag — Playable Prototype',
  description:
    'Bentengan web 2,5D 5v5: pilih Tim Merah atau Hijau, mainkan 14 karakter unik di empat arena, sprint, parkour, penjara, dan rescue.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={body.variable}>{children}</body>
    </html>
  );
}

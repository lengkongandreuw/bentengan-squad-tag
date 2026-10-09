import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import './ux-priority.css';

const body = Poppins({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  icons: { icon: './favicon-bst.png?v=1' },
  title: 'Bentengan: Squad Tag',
  description:
    'Pick your squad. Tag, rescue and take the enemy fort in Bentengan: Squad Tag, a 5v5 arena game.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={body.variable}>{children}</body>
    </html>
  );
}

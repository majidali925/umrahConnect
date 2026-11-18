import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import StoreProvider from '@/store/StoreProvider';
import '@/styles/globals.scss';

const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const heading = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-heading', weight: ['600', '700', '800'], display: 'swap' });

export const metadata = {
  title: {
    default: 'UmrahConnect Admin',
    template: '%s · UmrahConnect Admin',
  },
  description: 'UmrahConnect platform administration.',
  // The admin panel must never appear in search results.
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: '#0b5d3b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}

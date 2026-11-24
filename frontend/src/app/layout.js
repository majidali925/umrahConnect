import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import StoreProvider from '@/store/StoreProvider';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, baseOpenGraph } from '@/lib/site';
import '@/styles/globals.scss';

const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const heading = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-heading', weight: ['600', '700', '800'], display: 'swap' });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Umrah Packages from Pakistan · Compare Verified Umrah Agencies | UmrahConnect',
    template: '%s · UmrahConnect',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Umrah packages',
    'Umrah packages from Pakistan',
    'Umrah package price',
    'Umrah agency',
    'Umrah agencies in Pakistan',
    'Umrah travel agency',
    'Umrah packages Lahore',
    'Umrah packages Karachi',
    'Umrah packages Islamabad',
    'verified Umrah agencies',
  ],
  openGraph: baseOpenGraph,
  twitter: { card: 'summary_large_image' },
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

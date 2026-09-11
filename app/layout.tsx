import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scoutboard',
  description: 'Football scouting watchlist and calendar.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

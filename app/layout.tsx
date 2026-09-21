import type { Metadata } from 'next';
import { Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';
import { Header } from '../components/Header';
import { PageTransition } from '../components/PageTransition';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });
const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Daily Puzzles',
  description: 'Un puzzle nuevo cada día.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen`}>
        <ThemeProvider>
          <Header />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}

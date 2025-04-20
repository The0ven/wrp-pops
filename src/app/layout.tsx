import './globals.css';
import { Inter } from 'next/font/google';
import Navbar from '../components/ui/Navbar';
import Sidebar from '../components/ui/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Population Statistics Tracker',
  description: 'Track and analyze population statistics across different regions',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen bg-secondary-50">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Navbar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
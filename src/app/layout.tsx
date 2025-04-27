import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/ui/Sidebar';
import { SidebarProvider } from '@/components/providers/SidebarProvider';
import { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { QueryProvider } from '@/providers/query-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Population Statistics Tracker',
  description: 'Track and analyze population statistics across different regions',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <SidebarProvider>
              <div className="flex h-screen">
                <Sidebar />
              <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 transition-all duration-300">
                {children}
                </main>
              </div>
            </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
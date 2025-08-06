
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from './theme-provider';
import { NewsProvider } from '@/lib/contexts/news-context';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NewsProvider>
        {children}
      </NewsProvider>
    </ThemeProvider>
  );
}

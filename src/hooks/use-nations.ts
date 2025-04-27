'use client';

import { useQuery } from '@tanstack/react-query';

interface Nation {
  id: string;
  name: string;
  region: string;
  startYear: number;
  startPopulation: number;
  isArchived: boolean;
  growths: Array<{
    endPopulation: number;
    createdAt: string;
  }>;
}

async function fetchNations(): Promise<Nation[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/nations`
  );
  
  if (!res.ok) {
    throw new Error('Failed to fetch nations');
  }
  return res.json();
}

export function useNations() {
  return useQuery({
    queryKey: ['nations'],
    queryFn: fetchNations,
    staleTime: 60 * 1000, // 60 seconds
  });
} 
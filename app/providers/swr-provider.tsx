"use client";

import { SWRConfig } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  return res.json();
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{
        fetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: false
      }}
    >
      {children}
    </SWRConfig>
  );
} 
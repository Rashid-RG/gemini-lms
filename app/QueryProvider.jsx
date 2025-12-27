"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh longer
            cacheTime: 10 * 60 * 1000, // 10 minutes cache
            refetchOnWindowFocus: false, // Don't refetch on focus (faster)
            refetchOnReconnect: false, // Don't auto-refetch
            retry: 1,
            refetchOnMount: false, // Use cache on mount
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

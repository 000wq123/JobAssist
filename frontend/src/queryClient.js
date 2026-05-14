import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default queryClient;

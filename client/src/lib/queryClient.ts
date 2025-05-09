import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthHeaders } from "./auth";

// Define a more specific headers type to avoid TypeScript errors
type Headers = Record<string, string>;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const authHeaders = getAuthHeaders();
  const defaultHeaders: Record<string, string> = {};
  
  // Add auth headers if available
  if (authHeaders.Authorization) {
    defaultHeaders.Authorization = authHeaders.Authorization;
  }
  
  if (options.body && typeof options.body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
    
    // Debug logging to check what's being sent in the request body
    try {
      const jsonData = JSON.parse(options.body);
      console.log('[apiRequest] Sending data to ' + url + ':', jsonData);
      
      // IMPORTANT: Make special note of boolean values to check for potential type coercion
      if (jsonData.isClient !== undefined) {
        console.log('[apiRequest] isClient value in request:', {
          value: jsonData.isClient,
          type: typeof jsonData.isClient,
          stringified: JSON.stringify(jsonData.isClient)
        });
      }
    } catch (e) {
      console.error('[apiRequest] Error parsing JSON body:', e);
    }
  }
  
  console.log('[apiRequest] Making request to:', url, 'with auth token:', !!defaultHeaders.Authorization);
  
  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = getAuthHeaders();
    const requestHeaders: Record<string, string> = {};
    
    // Add auth headers if available
    if (authHeaders.Authorization) {
      requestHeaders.Authorization = authHeaders.Authorization;
    }
    
    console.log('[queryFn] Making request to:', queryKey[0], 'with auth token:', !!requestHeaders.Authorization);
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: requestHeaders
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

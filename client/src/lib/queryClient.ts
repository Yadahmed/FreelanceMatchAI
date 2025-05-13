import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthHeaders } from "./auth";

// Define a more specific headers type to avoid TypeScript errors
type Headers = Record<string, string>;

// Get admin session headers if admin session exists
function getAdminHeaders(): Headers {
  const isAdminSession = localStorage.getItem('adminSession') === 'true';
  console.log('[Admin Headers] Admin session check:', isAdminSession);
  // Create an empty header object then add to it conditionally to satisfy TypeScript
  const headers: Headers = {};
  if (isAdminSession) {
    headers['admin-session'] = 'true';
  }
  console.log('[Admin Headers] Returning headers:', headers);
  return headers;
}

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
  const adminHeaders = getAdminHeaders();
  const defaultHeaders: Record<string, string> = {
    ...adminHeaders
  };
  
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
  
  // Attempt the request with the current token
  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: "include",
  });
  
  // If we get a 401 unauthorized error, try to refresh the token and retry the request once
  if (res.status === 401) {
    try {
      // Dynamically import to avoid circular dependencies
      const { refreshAuthToken } = await import('./auth');
      const newToken = await refreshAuthToken();
      
      if (newToken) {
        console.log('[apiRequest] Token refreshed, retrying request');
        // Retry the request with the new token
        return fetch(url, {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
            'Authorization': `Bearer ${newToken}`
          },
          credentials: "include",
        });
      }
    } catch (refreshError) {
      console.error('[apiRequest] Failed to refresh token:', refreshError);
    }
  }

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
    const adminHeaders = getAdminHeaders();
    const requestHeaders: Record<string, string> = {
      ...adminHeaders
    };
    
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

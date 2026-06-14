import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

let accessToken: string | null = null;
let refreshSubscribers: ((token: string) => void)[] = [];
let isRefreshing = false;

export const setLocalAccessToken = (token: string | null) => {
  accessToken = token;
};

apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Bypass refreshes for login and refresh endpoints themselves
    if (originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          const newAccessToken = res.data.accessToken;
          setLocalAccessToken(newAccessToken);
          isRefreshing = false;
          
          // Execute all queued retries
          refreshSubscribers.forEach((callback) => callback(newAccessToken));
          refreshSubscribers = [];
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          setLocalAccessToken(null);
          // Dispatch custom event to signal AuthContext to flush profile
          window.dispatchEvent(new Event("auth:logout"));
          return Promise.reject(refreshError);
        }
      }

      // Queue concurrent 401 requests until refreshing finishes
      const retryOriginalRequest = new Promise((resolve) => {
        refreshSubscribers.push((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
      return retryOriginalRequest;
    }
    return Promise.reject(error);
  }
);

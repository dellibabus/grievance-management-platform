import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient, setLocalAccessToken } from "../api/client";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "super_admin" | "state_admin" | "district_admin" | "volunteer";
  permissions: string[];
  district: { id: string; name: string } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and load logged-in profile
  const fetchProfile = async () => {
    try {
      // First try refreshing access token in case it's expired
      const refreshRes = await apiClient.post("/auth/refresh");
      setLocalAccessToken(refreshRes.data.accessToken);

      const res = await apiClient.get("/auth/me");
      if (res.data.success) {
        setUser(res.data.user);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Listen for axios interceptor logout triggers
    const handleInterceptorLogout = () => {
      setUser(null);
      setLocalAccessToken(null);
    };

    window.addEventListener("auth:logout", handleInterceptorLogout);
    return () => {
      window.removeEventListener("auth:logout", handleInterceptorLogout);
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const loggedUser = res.data.user;
      setLocalAccessToken(res.data.accessToken);
      setUser(loggedUser);
      return loggedUser;
    } catch (error: any) {
      setUser(null);
      setLocalAccessToken(null);
      throw error.response?.data?.message || "Login failed";
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // proceed with local cleanup anyway
    } finally {
      setUser(null);
      setLocalAccessToken(null);
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

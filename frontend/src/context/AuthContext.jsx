import React, { createContext, useState, useEffect, useContext } from "react";
import { authService } from "../services/authService";
import { toast } from "react-toastify";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      console.error("Error loading user:", error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password_hash) => {
    try {
      const response = await authService.login(email, password_hash);

      // Response structure from backend: { success: true, message: '...', data: { token, user } }
      if (response && response.success) {
        if (response.data && response.data.token && response.data.user) {
          const { token: newToken, user: userData } = response.data;

          setToken(newToken);
          setUser(userData);
          localStorage.setItem("token", newToken);
          localStorage.setItem("user", JSON.stringify(userData));

          toast.success(response.message || "Login successful!");
          return { success: true };
        } else {
          // Try alternative structure (direct token and user in data)
          const newToken = response.data?.token || response.token;
          const userData = response.data?.user || response.user;

          if (newToken && userData) {
            setToken(newToken);
            setUser(userData);
            sessionStorage.setItem("token", newToken);
            sessionStorage.setItem("user", JSON.stringify(userData));

            toast.success(response.message || "Login successful!");
            return { success: true };
          }
        }
      }

      // If response doesn't have expected structure, show error
      const errorMsg = response?.message || "Invalid response from server";
      toast.error(errorMsg);
      return { success: false, message: errorMsg };
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        connectionRefused: error.connectionRefused,
      });

      // Show specific message for connection refused
      if (error.connectionRefused) {
        toast.error(
          "Backend server is not running. Please start the backend server on port 5000."
        );
        return { success: false, message: "Backend server is not running" };
      }

      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please check your credentials.";
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);

      // Registration successful - don't auto-login, just return success
      if (response && response.success) {
        return {
          success: true,
          message: response.message || "Registration successful!",
        };
      }

      toast.error("Invalid response from server");
      return { success: false, message: "Invalid response from server" };
    } catch (error) {
      // Extract error message from response with better error handling
      const errorData = error.response?.data;
      const errorMessage =
        errorData?.message ||
        (Array.isArray(errorData?.errors)
          ? errorData.errors.join(", ")
          : errorData?.errors) ||
        error.message ||
        "Registration failed";

      console.error("Registration error:", {
        message: errorMessage,
        status: error.response?.status,
        data: errorData,
      });

      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.user_type === "Admin",
    isPlayer: user?.user_type === "Player",
    isJudge: user?.user_type === "Judge",
    isCoach: user?.user_type === "Coach",
    isOrganizer: user?.user_type === "Organizer",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

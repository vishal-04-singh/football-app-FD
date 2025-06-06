"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { apiService } from "../../services/api"
import type { User } from "../types"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (userData: SignupData) => Promise<boolean>
  socialAuth: (provider: string, token: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
}

export interface SignupData {
  name: string
  email: string
  password: string
  role: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("user")
      const token = await AsyncStorage.getItem("auth_token")

      if (userData && token) {
        setUser(JSON.parse(userData))
      }
    } catch (error) {
      console.error("Error loading user:", error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await apiService.login(email, password)

      if (response.user && response.token) {
        // Make sure we're storing the complete user object with teamId
        setUser(response.user)
        await AsyncStorage.setItem("user", JSON.stringify(response.user))

        // Force a refresh of the tournament data after login
        try {
          await apiService.refreshToken() // Make sure token is set
          // We'll let the TournamentContext handle the actual data refresh
        } catch (refreshError) {
          console.error("Error refreshing data after login:", refreshError)
        }

        return true
      }

      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const signup = async (userData: SignupData): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await apiService.signup(userData)

      if (response.success) {
        console.log("✅ Signup successful")
        return true
      }

      return false
    } catch (error) {
      console.error("Signup error:", error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const socialAuth = async (provider: string, token: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await apiService.socialAuth(provider, token)

      if (response.user && response.token) {
        setUser(response.user)
        return true
      }

      return false
    } catch (error) {
      console.error(`${provider} auth error:`, error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiService.logout()
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const value = {
    user,
    login,
    signup,
    socialAuth,
    logout,
    loading,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider

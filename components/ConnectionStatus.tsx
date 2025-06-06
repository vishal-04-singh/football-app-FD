"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet } from "react-native"
import { apiService } from "../services/api"
import { COLORS } from "../src/constants/colors"
import { Ionicons } from "@expo/vector-icons"

const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const checkConnection = async () => {
    if (isChecking) return

    setIsChecking(true)
    try {
      await apiService.healthCheck()
      setIsConnected(true)
    } catch (error) {
      setIsConnected(false)
    } finally {
      setIsChecking(false)
    }
  }

  if (isConnected === null) return null

  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <Ionicons
        name={isConnected ? "wifi" : "wifi-outline"}
        size={16}
        color={isConnected ? COLORS.green : COLORS.red}
      />
      <Text style={[styles.text, { color: isConnected ? COLORS.green : COLORS.red }]}>
        {isConnected ? "Connected" : "Offline"}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    margin: 10,
  },
  connected: {
    backgroundColor: `${COLORS.green}20`,
  },
  disconnected: {
    backgroundColor: `${COLORS.red}20`,
  },
  text: {
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
})

export default ConnectionStatus

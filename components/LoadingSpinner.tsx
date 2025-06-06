import type React from "react"
import { View, ActivityIndicator, Text, StyleSheet } from "react-native"
import { COLORS } from "../src/constants/colors"

interface LoadingSpinnerProps {
  message?: string
  size?: "small" | "large"
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading...", size = "large" }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={COLORS.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
    padding: 20,
  },
  message: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
  },
})

export default LoadingSpinner

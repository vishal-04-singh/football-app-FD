import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../src/constants/colors'

interface RefreshButtonProps {
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  text?: string
  showIcon?: boolean
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onPress,
  loading = false,
  disabled = false,
  style,
  text = "Refresh Data",
  showIcon = true
}) => {
  return (
    <TouchableOpacity 
      style={[styles.refreshButton, style]} 
      onPress={onPress} 
      disabled={disabled || loading}
    >
      {showIcon && (
        <Ionicons 
          name={loading ? "sync" : "refresh"} 
          size={20} 
          color={COLORS.white} 
        />
      )}
      <Text style={styles.refreshText}>{text}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  refreshText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
  },
})
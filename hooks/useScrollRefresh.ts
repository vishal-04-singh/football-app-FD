import { useState } from 'react'
import { Alert } from 'react-native'

interface UseScrollRefreshProps {
  onRefresh: () => Promise<void>
  successMessage?: string
  errorMessage?: string
}

interface UseScrollRefreshReturn {
  refreshing: boolean
  onRefresh: () => Promise<void>
}

export const useScrollRefresh = ({
  onRefresh,
  successMessage = "Data refreshed successfully!",
  errorMessage = "Failed to refresh data. Please try again."
}: UseScrollRefreshProps): UseScrollRefreshReturn => {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    //   Alert.alert("Success", successMessage)
    } catch (error) {
      console.error("Error refreshing data:", error)
    //   Alert.alert("Error", errorMessage)
    } finally {
      setRefreshing(false)
    }
  }

  return {
    refreshing,
    onRefresh: handleRefresh
  }
}
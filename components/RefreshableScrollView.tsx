import React from 'react'
import { ScrollView, RefreshControl, ViewStyle } from 'react-native'
import { COLORS } from '../src/constants/colors'

interface RefreshableScrollViewProps {
  children: React.ReactNode
  refreshing: boolean
  onRefresh: () => Promise<void>
  style?: ViewStyle
  contentContainerStyle?: ViewStyle
  showsVerticalScrollIndicator?: boolean
}

export const RefreshableScrollView: React.FC<RefreshableScrollViewProps> = ({
  children,
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = true
}) => {
  return (
    <ScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
          progressBackgroundColor={COLORS.background}
        />
      }
    >
      {children}
    </ScrollView>
  )
}
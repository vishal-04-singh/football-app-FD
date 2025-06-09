import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../src/constants/colors'

interface LiveMatchTimerProps {
  matchStartTime: Date | null
  isHalfTime: boolean
  onTimeUpdate: (minute: number, seconds: number) => void
  onToggleHalfTime: () => void
  isManagement: boolean
  matchStatus: 'upcoming' | 'live' | 'completed'
}

const LiveMatchTimer: React.FC<LiveMatchTimerProps> = ({
  matchStartTime,
  isHalfTime,
  onTimeUpdate,
  onToggleHalfTime,
  isManagement,
  matchStatus
}) => {
  const [currentMinute, setCurrentMinute] = useState(0)
  const [currentSeconds, setCurrentSeconds] = useState(0)
  const [stoppageTime, setStoppageTime] = useState(0)
  const [isSecondHalf, setIsSecondHalf] = useState(false)
  
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const halfTimeStartTime = useRef<Date | null>(null)
  const halfTimeDuration = 15 * 60 * 1000 // 15 minutes in milliseconds

  useEffect(() => {
    if (matchStatus === 'live' && matchStartTime && !isHalfTime) {
      startTimer()
    } else {
      stopTimer()
    }

    return () => stopTimer()
  }, [matchStatus, matchStartTime, isHalfTime])

  const startTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
    }

    timerInterval.current = setInterval(() => {
      updateMatchTime()
    }, 1000)
  }

  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }

  const updateMatchTime = () => {
    if (!matchStartTime) return

    let elapsedMs = Date.now() - matchStartTime.getTime()

    // Subtract half-time duration if we're past it
    if (halfTimeStartTime.current) {
      const halfTimeElapsed = Date.now() - halfTimeStartTime.current.getTime()
      if (halfTimeElapsed >= halfTimeDuration) {
        elapsedMs -= halfTimeDuration
        setIsSecondHalf(true)
      }
    }

    const totalSeconds = Math.floor(elapsedMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    // Handle match periods
    if (minutes <= 45) {
      // First half
      setCurrentMinute(minutes)
      setCurrentSeconds(seconds)
      setIsSecondHalf(false)
    } else if (minutes <= 90) {
      // Second half
      setCurrentMinute(minutes)
      setCurrentSeconds(seconds)
      setIsSecondHalf(true)
    } else {
      // Stoppage time
      const stoppageMinutes = minutes - 90
      setCurrentMinute(90)
      setCurrentSeconds(0)
      setStoppageTime(stoppageMinutes)
    }

    onTimeUpdate(currentMinute, currentSeconds)
  }

  const handleToggleHalfTime = () => {
    if (!isManagement) return

    if (!isHalfTime && currentMinute >= 45) {
      // Start half-time
      halfTimeStartTime.current = new Date()
      onToggleHalfTime()
    } else if (isHalfTime) {
      // End half-time
      onToggleHalfTime()
    }
  }

  const adjustTime = (increment: number) => {
    if (!isManagement) return

    const newMinute = Math.max(0, Math.min(120, currentMinute + increment))
    setCurrentMinute(newMinute)
    onTimeUpdate(newMinute, currentSeconds)
  }

  const formatTime = () => {
    if (isHalfTime) return "HT"
    
    const displayMinute = currentMinute
    const displaySeconds = currentSeconds.toString().padStart(2, '0')
    
    if (stoppageTime > 0) {
      return `90+${stoppageTime}:${displaySeconds}`
    }
    
    return `${displayMinute}:${displaySeconds}`
  }

  const getMatchPeriod = () => {
    if (isHalfTime) return "Half-Time"
    if (currentMinute <= 45) return "1st Half"
    if (currentMinute <= 90) return "2nd Half"
    return "Stoppage Time"
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerDisplay}>
        <Text style={styles.timeText}>{formatTime()}</Text>
        <Text style={styles.periodText}>{getMatchPeriod()}</Text>
        
        {matchStatus === 'live' && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {isManagement && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjustTime(-1)}
          >
            <Ionicons name="remove" size={16} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.halfTimeButton,
              isHalfTime && styles.activeHalfTimeButton
            ]}
            onPress={handleToggleHalfTime}
            disabled={currentMinute < 45 && !isHalfTime}
          >
            <Ionicons 
              name={isHalfTime ? "play" : "pause"} 
              size={16} 
              color={COLORS.white} 
            />
            <Text style={styles.halfTimeButtonText}>
              {isHalfTime ? "Resume" : "Half Time"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjustTime(1)}
          >
            <Ionicons name="add" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    margin: 20,
    alignItems: 'center',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 15,
  },
  timeText: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  periodText: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 5,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  controlButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeHalfTimeButton: {
    backgroundColor: '#9C27B0',
  },
  halfTimeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
})

export default LiveMatchTimer
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
  const [pausedTime, setPausedTime] = useState(0) // Track paused time
  
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const halfTimeStartTime = useRef<Date | null>(null)
  const pauseStartTime = useRef<Date | null>(null)
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

    // Subtract any paused time
    elapsedMs -= pausedTime

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

    let displayMinute = minutes
    let displaySeconds = seconds

    // Handle match periods with proper formatting
    if (minutes <= 45) {
      // First half (0-45 minutes)
      setIsSecondHalf(false)
      setStoppageTime(0)
    } else if (minutes <= 90) {
      // Second half (46-90 minutes)
      setIsSecondHalf(true)
      setStoppageTime(0)
    } else {
      // Stoppage time (90+ minutes)
      const stoppageMinutes = minutes - 90
      setStoppageTime(stoppageMinutes)
      displayMinute = 90
      displaySeconds = 0
    }

    setCurrentMinute(displayMinute)
    setCurrentSeconds(displaySeconds)
    onTimeUpdate(displayMinute, displaySeconds)
  }

  const handleToggleHalfTime = () => {
    if (!isManagement) return

    if (!isHalfTime) {
      // Start half-time
      halfTimeStartTime.current = new Date()
      pauseStartTime.current = new Date()
      onToggleHalfTime()
    } else {
      // End half-time - calculate paused time
      if (pauseStartTime.current) {
        const pauseDuration = Date.now() - pauseStartTime.current.getTime()
        setPausedTime(prev => prev + pauseDuration)
        pauseStartTime.current = null
      }
      onToggleHalfTime()
    }
  }

  const adjustTime = (increment: number) => {
    if (!isManagement) return

    const newMinute = Math.max(0, Math.min(120, currentMinute + increment))
    setCurrentMinute(newMinute)
    onTimeUpdate(newMinute, currentSeconds)
  }

  const adjustSeconds = (increment: number) => {
    if (!isManagement) return

    let newSeconds = currentSeconds + increment
    let newMinute = currentMinute

    if (newSeconds >= 60) {
      newSeconds = 0
      newMinute = Math.min(120, newMinute + 1)
    } else if (newSeconds < 0) {
      newSeconds = 59
      newMinute = Math.max(0, newMinute - 1)
    }

    setCurrentMinute(newMinute)
    setCurrentSeconds(newSeconds)
    onTimeUpdate(newMinute, newSeconds)
  }

  // Format time in MM-SS-MS format (35-5-53)
  const formatTime = () => {
    if (isHalfTime) return "HT"
    
    const displayMinute = currentMinute.toString().padStart(2, '0')
    const displaySeconds = currentSeconds.toString().padStart(2, '0')
    const milliseconds = Math.floor((Date.now() % 1000) / 10).toString().padStart(2, '0')
    
    if (stoppageTime > 0) {
      return `90+${stoppageTime}-${displaySeconds}-${milliseconds}`
    }
    
    return `${displayMinute}-${displaySeconds}-${milliseconds}`
  }

  // Alternative format for display (more readable)
  const formatTimeReadable = () => {
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
    if (stoppageTime > 0) return "Stoppage Time"
    return "Match Time"
  }

  const getMatchStatus = () => {
    if (matchStatus === 'completed') return 'Full Time'
    if (isHalfTime) return 'Half Time'
    if (matchStatus === 'live') return 'Live'
    return 'Upcoming'
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerDisplay}>
        {/* Main time display */}
        <Text style={styles.timeText}>{formatTimeReadable()}</Text>
        
        {/* Technical format display (35-5-53) */}
        <Text style={styles.technicalTimeText}>{formatTime()}</Text>
        
        <Text style={styles.periodText}>{getMatchPeriod()}</Text>
        
        {matchStatus === 'live' && !isHalfTime && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}

        {isHalfTime && (
          <View style={styles.halfTimeIndicator}>
            <Ionicons name="pause" size={16} color={COLORS.primary} />
            <Text style={styles.halfTimeText}>HALF TIME</Text>
          </View>
        )}
      </View>

      {isManagement && (
        <View style={styles.controls}>
          {/* Minute controls */}
          <View style={styles.timeControlGroup}>
            <Text style={styles.controlLabel}>Minutes</Text>
            <View style={styles.timeControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => adjustTime(-1)}
              >
                <Ionicons name="remove" size={16} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.timeValue}>{currentMinute}</Text>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => adjustTime(1)}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Seconds controls */}
          <View style={styles.timeControlGroup}>
            <Text style={styles.controlLabel}>Seconds</Text>
            <View style={styles.timeControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => adjustSeconds(-1)}
              >
                <Ionicons name="remove" size={16} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.timeValue}>{currentSeconds.toString().padStart(2, '0')}</Text>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => adjustSeconds(1)}
              >
                <Ionicons name="add" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Half-time control */}
          <TouchableOpacity
            style={[
              styles.halfTimeButton,
              isHalfTime && styles.activeHalfTimeButton
            ]}
            onPress={handleToggleHalfTime}
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
  technicalTimeText: {
    color: COLORS.gray,
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 5,
    opacity: 0.7,
  },
  periodText: {
    color: COLORS.white,
    fontSize: 14,
    marginTop: 8,
    fontWeight: 'bold',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
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
  halfTimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  halfTimeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  timeControlGroup: {
    alignItems: 'center',
  },
  controlLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  controlButton: {
    backgroundColor: COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3F51B5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
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
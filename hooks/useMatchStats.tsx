import { useState, useCallback, useEffect } from 'react'
import type { MatchStats, MatchStatsUpdate, StatsValidation } from '../src/types/matchStats'

const initialStats: MatchStats = {
  homeScore: 0,
  awayScore: 0,
  minute: 0,
  stoppage: 0,
  possession: { home: 50, away: 50 },
  shots: { home: 0, away: 0 },
  shotsOnTarget: { home: 0, away: 0 },
  corners: { home: 0, away: 0 },
  fouls: { home: 0, away: 0 },
  passAccuracy: { home: 0, away: 0 },
  yellowCards: { home: 0, away: 0 },
  redCards: { home: 0, away: 0 },
  substitutions: { home: 0, away: 0 },
  offsides: { home: 0, away: 0 },
  saves: { home: 0, away: 0 }
}

export const useMatchStats = (matchId: string | null, initialMatchStats?: Partial<MatchStats>) => {
  const [stats, setStats] = useState<MatchStats>({
    ...initialStats,
    ...initialMatchStats
  })
  const [isLocked, setIsLocked] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Validate statistics
  const validateStats = useCallback((newStats: MatchStats): StatsValidation => {
    const warnings: string[] = []
    
    // Check possession totals to 100%
    const totalPossession = newStats.possession.home + newStats.possession.away
    if (Math.abs(totalPossession - 100) > 0.1) {
      return {
        isValid: false,
        error: 'Possession percentages must total 100%'
      }
    }

    // Check shots on target don't exceed total shots
    if (newStats.shotsOnTarget.home > newStats.shots.home) {
      return {
        isValid: false,
        error: 'Shots on target cannot exceed total shots for home team'
      }
    }
    
    if (newStats.shotsOnTarget.away > newStats.shots.away) {
      return {
        isValid: false,
        error: 'Shots on target cannot exceed total shots for away team'
      }
    }

    // Check pass accuracy is reasonable (0-100%)
    if (newStats.passAccuracy.home > 100 || newStats.passAccuracy.away > 100) {
      return {
        isValid: false,
        error: 'Pass accuracy cannot exceed 100%'
      }
    }

    // Warnings for unusual values
    if (newStats.possession.home > 80 || newStats.possession.away > 80) {
      warnings.push('Very high possession percentage detected')
    }

    if (newStats.shots.home > 30 || newStats.shots.away > 30) {
      warnings.push('Unusually high number of shots')
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }, [])

  // Update a specific statistic
  const updateStat = useCallback((update: MatchStatsUpdate): boolean => {
    if (isLocked) {
      console.warn('Cannot update stats: match is completed')
      return false
    }

    setStats(prevStats => {
      const newStats = { ...prevStats }
      
      if (typeof update.statType === 'string' && update.statType in newStats) {
        const statValue = newStats[update.statType]
        
        if (typeof statValue === 'object' && statValue !== null) {
          // Handle team-specific stats (possession, shots, etc.)
          const teamStats = statValue as { home: number; away: number }
          if (update.increment) {
            teamStats[update.team] = Math.max(0, teamStats[update.team] + update.value)
          } else {
            teamStats[update.team] = Math.max(0, update.value)
          }
          
          // Auto-adjust possession to maintain 100% total
          if (update.statType === 'possession') {
            const otherTeam = update.team === 'home' ? 'away' : 'home'
            teamStats[otherTeam] = 100 - teamStats[update.team]
          }
        } else if (typeof statValue === 'number') {
          // Handle general stats (minute, stoppage)
          if (update.increment) {
            (newStats as any)[update.statType] = Math.max(0, statValue + update.value)
          } else {
            (newStats as any)[update.statType] = Math.max(0, update.value)
          }
        }
      }

      // Validate the new stats
      const validation = validateStats(newStats)
      if (!validation.isValid) {
        console.error('Stats validation failed:', validation.error)
        return prevStats // Don't update if invalid
      }

      if (validation.warnings) {
        console.warn('Stats warnings:', validation.warnings)
      }

      setLastUpdate(new Date())
      return newStats
    })

    return true
  }, [isLocked, validateStats])

  // Lock stats when match is completed
  const lockStats = useCallback(() => {
    setIsLocked(true)
  }, [])

  // Unlock stats (for testing or corrections)
  const unlockStats = useCallback(() => {
    setIsLocked(false)
  }, [])

  // Reset stats to initial values
  const resetStats = useCallback(() => {
    if (!isLocked) {
      setStats({ ...initialStats, ...initialMatchStats })
      setLastUpdate(new Date())
    }
  }, [isLocked, initialMatchStats])

  return {
    stats,
    updateStat,
    validateStats,
    lockStats,
    unlockStats,
    resetStats,
    isLocked,
    lastUpdate
  }
}
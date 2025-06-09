import { apiService } from './api'
import type { MatchStats } from '../src/types/matchStats'

class MatchStatsService {
  // Update match statistics
  async updateMatchStats(matchId: string, stats: MatchStats): Promise<MatchStats> {
    try {
      const response = await fetch(`${apiService.baseUrl}/matches/${matchId}/stats`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiService.getToken()}`
        },
        body: JSON.stringify(stats)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating match statistics:', error)
      throw error
    }
  }

  // Get match statistics
  async getMatchStats(matchId: string): Promise<MatchStats | null> {
    try {
      const response = await fetch(`${apiService.baseUrl}/matches/${matchId}/stats`, {
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null // No stats found
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching match statistics:', error)
      throw error
    }
  }

  // Get match statistics history (minute by minute)
  async getMatchStatsHistory(matchId: string): Promise<MatchStats[]> {
    try {
      const response = await fetch(`${apiService.baseUrl}/matches/${matchId}/stats/history`, {
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching match statistics history:', error)
      throw error
    }
  }

  // Delete/reset match statistics
  async resetMatchStats(matchId: string): Promise<void> {
    try {
      const response = await fetch(`${apiService.baseUrl}/matches/${matchId}/stats`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error resetting match statistics:', error)
      throw error
    }
  }

  // Validate statistics before sending to server
  validateStats(stats: MatchStats): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check possession totals to 100%
    const totalPossession = stats.possession.home + stats.possession.away
    if (Math.abs(totalPossession - 100) > 0.1) {
      errors.push('Possession percentages must total 100%')
    }

    // Check shots on target don't exceed total shots
    if (stats.shotsOnTarget.home > stats.shots.home) {
      errors.push('Home shots on target cannot exceed total shots')
    }
    
    if (stats.shotsOnTarget.away > stats.shots.away) {
      errors.push('Away shots on target cannot exceed total shots')
    }

    // Check pass accuracy is within reasonable range
    if (stats.passAccuracy.home > 100 || stats.passAccuracy.away > 100) {
      errors.push('Pass accuracy cannot exceed 100%')
    }

    if (stats.passAccuracy.home < 0 || stats.passAccuracy.away < 0) {
      errors.push('Pass accuracy cannot be negative')
    }

    // Check negative values
    const numericFields: (keyof MatchStats)[] = [
      'homeScore', 'awayScore', 'minute', 'stoppage'
    ]

    numericFields.forEach(field => {
      if ((stats[field] as number) < 0) {
        errors.push(`${field} cannot be negative`)
      }
    })

    // Check team-specific stats for negative values
    const teamStats: (keyof Pick<MatchStats, 'shots' | 'shotsOnTarget' | 'corners' | 'fouls' | 'yellowCards' | 'redCards' | 'substitutions' | 'offsides' | 'saves'>)[] = [
      'shots', 'shotsOnTarget', 'corners', 'fouls', 'yellowCards', 'redCards', 'substitutions', 'offsides', 'saves'
    ]

    teamStats.forEach(stat => {
      const teamStat = stats[stat] as { home: number; away: number }
      if (teamStat.home < 0 || teamStat.away < 0) {
        errors.push(`${stat} cannot be negative`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const matchStatsService = new MatchStatsService()
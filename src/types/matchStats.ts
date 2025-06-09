export interface MatchStats {
  homeScore: number
  awayScore: number
  minute: number
  stoppage: number
  possession: { home: number; away: number }
  shots: { home: number; away: number }
  shotsOnTarget: { home: number; away: number }
  corners: { home: number; away: number }
  fouls: { home: number; away: number }
  passAccuracy: { home: number; away: number }
  yellowCards: { home: number; away: number }
  redCards: { home: number; away: number }
  substitutions: { home: number; away: number }
  offsides: { home: number; away: number }
  saves: { home: number; away: number }
}

export interface MatchStatsUpdate {
  statType: keyof MatchStats
  team: 'home' | 'away'
  value: number
  increment?: boolean
}

export interface StatsValidation {
  isValid: boolean
  error?: string
  warnings?: string[]
}
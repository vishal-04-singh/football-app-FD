export interface User {
  id: string
  name: string
  email: string
  role: "management" | "captain" | "spectator"
  teamId?: string
}

export interface Team {
  primaryColor: string
  secondaryColor: string
  _id: string
  id: string
  name: string
  logo?: string
  captainId?: string // Made optional since it can be null
  players: Player[]
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export interface Player {
  _id: string
  jersey: number
  id: string
  name: string
  position: string
  jerseyNumber: number
  teamId: string
  isSubstitute: boolean
  photo?: string
}

export interface Match {
  stadiumImage: any
  broadcaster: any
  _manuallyCompleted: boolean
  _id: string
  id: string
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  venue: string
  status: "upcoming" | "live" | "completed"
  homeScore: number
  awayScore: number
  events: MatchEvent[]
  week: number
}

export interface MatchEvent {
  teamId: string
  id: string
  type: "goal" | "yellow_card" | "red_card" | "substitution" | "assist"
  playerId: string
  playerName: string
  minute: number
  description: string
}

export interface Tournament {
  id: string
  name: string
  startDate: string
  endDate: string
  teams: Team[]
  matches: Match[]
  currentWeek: number
  status: "upcoming" | "ongoing" | "completed"
}

export interface ScheduleMatchData {
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  venue: string
  week: number
}

"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiService } from "../../services/api"
import type { Tournament, Team, Player, Match } from "../types"

interface ScheduleMatchData {
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  venue: string
  week: number
}

interface MatchStats {
  homeScore: number
  awayScore: number
  minute: number
  possession: { home: number; away: number }
  shots: { home: number; away: number }
  corners: { home: number; away: number }
  fouls: { home: number; away: number }
}

interface TournamentContextType {
  tournament: Tournament | null
  teams: Team[]
  matches: Match[]
  loading: boolean
  refreshData: () => Promise<void>
  updateMatch: (matchId: string, homeScore: number, awayScore: number, events: any[]) => Promise<void>
  updateMatchStatus: (matchId: string, status: string, minute: number, event?: any) => Promise<void>
  updateMatchStats: (matchId: string, stats: MatchStats) => Promise<void>
  addTeam: (teamData: { name: string; logo?: string }) => Promise<void>
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>
  addPlayer: (player: Omit<Player, "id">) => Promise<void>
  scheduleMatch: (matchData: ScheduleMatchData) => Promise<void>
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined)

export const useTournament = () => {
  const context = useContext(TournamentContext)
  if (!context) {
    throw new Error("useTournament must be used within a TournamentProvider")
  }
  return context
}

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<number>(0)

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [])

  // Set up periodic refresh (every 30 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh if it's been more than 30 seconds since the last manual refresh
      const now = Date.now()
      if (now - lastRefresh > 30000) {
        refreshData(false) // silent refresh
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [lastRefresh])

  const refreshData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }

      // Make sure token is refreshed before making the request
      await apiService.refreshToken()

      const data = await apiService.getTournamentData()

      setTournament(data.tournament)
      setTeams(data.teams || [])
      setMatches(data.matches || [])
      setLastRefresh(Date.now())
    } catch (error) {
      console.error("Error fetching tournament data:", error)
      // Initialize with empty data if API fails
      if (!tournament) {
        setTournament({
          id: "default",
          name: "Football League Championship",
          startDate: "2024-01-06",
          endDate: "2024-01-28",
          currentWeek: 1,
          status: "ongoing",
          teams: [],
          matches: [],
        })
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const updateMatch = async (matchId: string, homeScore: number, awayScore: number, events: any[]) => {
    try {
      const updatedMatch = await apiService.updateMatch(matchId, {
        homeScore,
        awayScore,
        events,
        status: "completed",
      })

      setMatches((prev) => prev.map((match) => (match.id === matchId ? { ...match, ...updatedMatch } : match)))

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("Error updating match:", error)
    }
  }

  const updateMatchStatus = async (matchId: string, status: string, minute: number, event?: any) => {
    try {
      const updateData: any = { status, minute }

      if (event) {
        // Handle event updates
        const match = matches.find((m) => m.id === matchId)
        if (match) {
          const newEvent = {
            id: `event${Date.now()}`,
            type: event.type,
            playerId: `player${Date.now()}`,
            playerName: event.playerName,
            minute: event.minute,
            description: `${event.playerName} - ${event.type.replace("_", " ")}`,
          }

          updateData.events = [...(match.events || []), newEvent]

          if (event.type === "goal") {
            if (event.team === "home") {
              updateData.homeScore = (match.homeScore || 0) + 1
            } else {
              updateData.awayScore = (match.awayScore || 0) + 1
            }
          }
        }
      }

      const updatedMatch = await apiService.updateMatch(matchId, updateData)

      setMatches((prev) => prev.map((match) => (match.id === matchId ? { ...match, ...updatedMatch } : match)))

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("Error updating match status:", error)
    }
  }

  const updateMatchStats = async (matchId: string, stats: MatchStats) => {
    try {
      const updatedMatch = await apiService.updateMatchStats(matchId, stats)

      setMatches((prev) => prev.map((match) => (match.id === matchId ? { ...match, ...updatedMatch } : match)))

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("Error updating match stats:", error)
    }
  }

  const addTeam = async (teamData: { name: string; logo?: string }) => {
    try {
      // Only send name and logo - no captainId at all
      const newTeam = await apiService.createTeam({
        name: teamData.name,
        logo: teamData.logo || "",
      })

      setTeams((prev) => [...prev, { ...newTeam, id: newTeam._id, players: [] }])

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("Error adding team:", error)
      throw error
    }
  }

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      const updatedTeam = await apiService.updateTeam(teamId, updates)

      setTeams((prev) => prev.map((team) => (team.id === teamId ? { ...team, ...updatedTeam } : team)))

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("Error updating team:", error)
      throw error
    }
  }

  const addPlayer = async (playerData: Omit<Player, "id">) => {
    try {
      console.log("🏃‍♂️ Adding player with data:", playerData)

      // Validate required fields
      if (!playerData.name || !playerData.position || !playerData.jerseyNumber || !playerData.teamId) {
        throw new Error("Missing required player information")
      }

      // Ensure jersey number is a valid number
      const jerseyNumber = Number(playerData.jerseyNumber)
      if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
        throw new Error("Jersey number must be between 1 and 99")
      }

      // Check if jersey number is already taken in the team
      const team = teams.find((t) => t.id === playerData.teamId || t._id === playerData.teamId)
      if (team) {
        const existingPlayer = team.players.find((p) => p.jerseyNumber === jerseyNumber)
        if (existingPlayer) {
          throw new Error(`Jersey number ${jerseyNumber} is already taken by ${existingPlayer.name}`)
        }

        // Check team capacity
        if (team.players.length >= 14) {
          throw new Error("Team already has maximum players (14)")
        }
      }

      const newPlayer = await apiService.createPlayer({
        name: playerData.name.trim(),
        position: playerData.position,
        jerseyNumber: jerseyNumber,
        teamId: playerData.teamId,
        isSubstitute: playerData.isSubstitute || false,
        photo: playerData.photo || "",
      })

      console.log("✅ Player created successfully:", newPlayer)

      // Update local state
      setTeams((prev) =>
        prev.map((team) =>
          team.id === playerData.teamId || team._id === playerData.teamId
            ? { ...team, players: [...team.players, { ...newPlayer, id: newPlayer._id || newPlayer.id }] }
            : team,
        ),
      )

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("❌ Error adding player:", error)
      throw error
    }
  }

  const scheduleMatch = async (matchData: ScheduleMatchData) => {
    try {
      const newMatch = await apiService.createMatch({
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        date: matchData.date,
        time: matchData.time,
        venue: matchData.venue,
        week: matchData.week,
        status: "upcoming",
        homeScore: 0,
        awayScore: 0,
        events: [],
      })

      setMatches((prev) => [...prev, { ...newMatch, id: newMatch._id }])

      // Refresh data to ensure all clients have the latest
      refreshData(false)
    } catch (error) {
      console.error("Error scheduling match:", error)
      throw error
    }
  }

  // Create tournament object with teams and matches for compatibility
  const tournamentWithData = tournament
    ? {
        ...tournament,
        teams,
        matches,
      }
    : null

  return (
    <TournamentContext.Provider
      value={{
        tournament: tournamentWithData,
        teams,
        matches,
        loading,
        refreshData,
        updateMatch,
        updateMatchStatus,
        updateMatchStats,
        addTeam,
        updateTeam,
        addPlayer,
        scheduleMatch,
      }}
    >
      {children}
    </TournamentContext.Provider>
  )
}

"use client"

import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import { Ionicons } from "@expo/vector-icons"
import { useState, useEffect, useMemo } from "react"
import { debugTeamAssignment } from "../../utils/debugUtils"
import { LinearGradient } from "expo-linear-gradient"
import { RefreshableScrollView } from "../../components/RefreshableScrollView"
import { RefreshButton } from "../../components/RefreshButton"
import { useScrollRefresh } from "../../hooks/useScrollRefresh"

interface PlayerStats {
  _id: string
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  appearances: number
  photo?: string
  position: string
  jerseyNumber: number
}

const HomeScreen: React.FC = () => {
  const { user } = useAuth()
  const { tournament, teams, matches, loading, refreshData } = useTournament()

  // Use the custom hook for scroll refresh
  const { refreshing, onRefresh } = useScrollRefresh({
    onRefresh: refreshData,
    successMessage: "Data refreshed successfully!",
    errorMessage: "Failed to refresh data. Please try again."
  })

  // Debug team assignment on component mount
  useEffect(() => {
    if (user?.role === "captain") {
      debugTeamAssignment(user, teams)
    }
  }, [user, teams])

  // Calculate top scorers from existing data
  const topScorers = useMemo(() => {
    if (!teams || !matches || teams.length === 0 || matches.length === 0) {
      return []
    }

    // Create a map to store player statistics
    const playerStatsMap = new Map<string, PlayerStats>()

    // Initialize all players with zero stats
    teams.forEach(team => {
      if (team.players && team.players.length > 0) {
        team.players.forEach(player => {
          const playerId = player.id || player._id
          playerStatsMap.set(playerId, {
            _id: playerId,
            playerId: playerId,
            playerName: player.name,
            teamId: team._id || team.id,
            teamName: team.name,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            appearances: 0,
            photo: player.photo || null,
            position: player.position,
            jerseyNumber: player.jerseyNumber
          })
        })
      }
    })

    // Process match events to calculate statistics
    matches.forEach(match => {
      if (match.events && match.events.length > 0) {
        const participatingPlayers = new Set<string>()

        match.events.forEach(event => {
          const playerId = event.playerId
          if (!playerId || !playerStatsMap.has(playerId)) return

          const playerStats = playerStatsMap.get(playerId)!
          
          // Track player appearance in this match
          participatingPlayers.add(playerId)

          // Update statistics based on event type
          switch (event.type) {
            case 'goal':
              playerStats.goals += 1
              break
            case 'yellow_card':
              playerStats.yellowCards += 1
              break
            case 'red_card':
              playerStats.redCards += 1
              break
            case 'substitution':
              // Handle substitution logic if needed
              break
            default:
              break
          }

          playerStatsMap.set(playerId, playerStats)
        })

        // Update appearances for all participating players
        participatingPlayers.forEach(playerId => {
          const playerStats = playerStatsMap.get(playerId)!
          playerStats.appearances += 1
          playerStatsMap.set(playerId, playerStats)
        })
      }
    })

    // Convert map to array and sort by goals, then by name
    const allPlayerStats = Array.from(playerStatsMap.values())
      .filter(player => player.goals > 0) // Only include players with goals
      .sort((a, b) => {
        if (b.goals !== a.goals) {
          return b.goals - a.goals // Sort by goals descending
        }
        return a.playerName.localeCompare(b.playerName) // Then by name ascending
      })

    return allPlayerStats.slice(0, 5) // Return top 5
  }, [teams, matches])

  const upcomingMatches = matches.filter((match) => match.status === "upcoming").slice(0, 3) || []
  const liveMatches = matches.filter((match) => match.status === "live") || []
  const completedMatches = matches.filter((match) => match.status === "completed") || []

  // Find user's team if they are a captain
  const userTeam =
    user?.role === "captain" && user?.teamId ? teams.find((t) => t.id === user.teamId || t._id === user.teamId) : null

  const getTeamName = (teamId: string) => {
    return teams.find((team) => team.id === teamId || team._id === teamId)?.name || "Unknown Team"
  }

  const renderTopScorer = (player: PlayerStats, index: number) => {
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#4A90E2', '#50C878'] // Gold, Silver, Bronze, Blue, Green
    const rankIcons = ['trophy', 'medal', 'medal', 'ribbon', 'star']
    
    return (
      <TouchableOpacity key={player._id} style={styles.scorerCard}>
        <View style={styles.scorerRank}>
          <Ionicons 
            name={rankIcons[index]} 
            size={20} 
            color={rankColors[index]} 
          />
          <Text style={[styles.rankNumber, { color: rankColors[index] }]}>
            #{index + 1}
          </Text>
        </View>
        
        <View style={styles.scorerInfo}>
          {player.photo ? (
            <Image source={{ uri: player.photo }} style={styles.playerPhoto} />
          ) : (
            <LinearGradient
              colors={[COLORS.primary + '40', COLORS.primary + '20']}
              style={styles.playerPhotoPlaceholder}
            >
              <Text style={styles.playerInitials}>
                {player.playerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </Text>
            </LinearGradient>
          )}
          
          <View style={styles.scorerDetails}>
            <Text style={styles.playerName} numberOfLines={1}>
              {player.playerName}
            </Text>
            <Text style={styles.teamNameSmall} numberOfLines={1}>
              {player.teamName}
            </Text>
            <Text style={styles.positionText}>
              #{player.jerseyNumber} • {player.position}
            </Text>
          </View>
        </View>
        
        <View style={styles.scorerStats}>
          <LinearGradient
            colors={[COLORS.primary, '#FFB84D']}
            style={styles.goalsBadge}
          >
            <Ionicons name="football" size={12} color={COLORS.black} />
            <Text style={styles.goalsText}>{player.goals}</Text>
          </LinearGradient>
          
          {player.appearances > 0 && (
            <View style={styles.appearancesBadge}>
              <Ionicons name="calendar" size={10} color={COLORS.blue} />
              <Text style={styles.appearancesText}>{player.appearances}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <RefreshableScrollView
      style={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.roleText}>{user?.role.toUpperCase()}</Text>
        {userTeam && <Text style={styles.teamText}>Team: {userTeam.name}</Text>}

        {/* Refresh button using the new component */}
        <RefreshButton
          onPress={onRefresh}
          loading={refreshing || loading}
          style={styles.refreshButtonMargin}
        />
      </View>

      <View style={styles.statsOverview}>
        <Text style={styles.statsTitle}>Tournament Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{teams.length}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{matches.length}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completedMatches.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{liveMatches.length}</Text>
            <Text style={styles.statLabel}>Live</Text>
          </View>
        </View>
      </View>

      {/* Top 5 Scorers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚽ Top 5 Scorers</Text>
          <View style={styles.scorersSummary}>
            <Text style={styles.summaryText}>
              {topScorers.reduce((total, player) => total + player.goals, 0)} goals
            </Text>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="football" size={30} color={COLORS.primary} />
            <Text style={styles.loadingText}>Calculating top scorers...</Text>
          </View>
        ) : topScorers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No goals scored yet</Text>
            <Text style={styles.emptySubtext}>
              Goals will appear here once matches are completed
            </Text>
            <Text style={styles.emptySubtext}>
              {completedMatches.length} of {matches.length} matches played
            </Text>
          </View>
        ) : (
          <View style={styles.scorersContainer}>
            {topScorers.map((player, index) => renderTopScorer(player, index))}
            
            {/* Show total goals summary */}
            <View style={styles.scorersSummaryCard}>
              <Text style={styles.summaryCardText}>
                Total Goals: {topScorers.reduce((total, player) => total + player.goals, 0)}
              </Text>
              <Text style={styles.summaryCardSubtext}>
                From {completedMatches.length} completed matches
              </Text>
            </View>
          </View>
        )}
      </View>

      {liveMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔴 Live Matches</Text>
          {liveMatches.map((match) => (
            <TouchableOpacity key={match.id} style={styles.liveMatchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.liveIndicator}>LIVE</Text>
                <Text style={styles.matchTime}>{match.time}</Text>
              </View>
              <View style={styles.matchTeams}>
                <Text style={styles.teamName}>{getTeamName(match.homeTeamId)}</Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.score}>
                    {match.homeScore} - {match.awayScore}
                  </Text>
                </View>
                <Text style={styles.teamName}>{getTeamName(match.awayTeamId)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Upcoming Matches</Text>
        {upcomingMatches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyText}>No upcoming matches</Text>
            <Text style={styles.emptySubtext}>Check back later for scheduled matches</Text>
          </View>
        ) : (
          upcomingMatches.map((match) => (
            <View key={match.id} style={styles.matchCard}>
              <View style={styles.matchDate}>
                <Text style={styles.dateText}>{match.date}</Text>
                <Text style={styles.timeText}>{match.time}</Text>
              </View>
              <View style={styles.matchTeams}>
                <Text style={styles.teamName}>{getTeamName(match.homeTeamId)}</Text>
                <Text style={styles.vs}>VS</Text>
                <Text style={styles.teamName}>{getTeamName(match.awayTeamId)}</Text>
              </View>
              <Text style={styles.venue}>{match.venue}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Tournament Info</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tournament:</Text>
            <Text style={styles.infoValue}>{tournament?.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Week:</Text>
            <Text style={styles.infoValue}>Week {tournament?.currentWeek}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Teams:</Text>
            <Text style={styles.infoValue}>{teams.length}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Completed Matches:</Text>
            <Text style={styles.infoValue}>{completedMatches.length}/{matches.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="trophy-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Points Table</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Teams</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="football-outline" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>All Matches</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(loading || refreshing) && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Syncing data...</Text>
        </View>
      )}
    </RefreshableScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.background,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 5,
  },
  roleText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 5,
    fontWeight: "bold",
  },
  teamText: {
    fontSize: 14,
    color: COLORS.white,
    marginTop: 5,
  },
  refreshButtonMargin: {
    marginTop: 15,
  },
  statsOverview: {
    backgroundColor: COLORS.background,
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
  },
  statsTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  // Top Scorers Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  scorersSummary: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  summaryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scorersContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 15,
  },
  scorerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray + '20',
  },
  scorerRank: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 50,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  scorerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  playerPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  playerInitials: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scorerDetails: {
    flex: 1,
  },
  playerName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamNameSmall: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
  positionText: {
    color: COLORS.primary,
    fontSize: 10,
    marginTop: 1,
  },
  scorerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 5,
  },
  goalsText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  appearancesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blue + '20',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  appearancesText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  scorersSummaryCard: {
    marginTop: 15,
    padding: 10,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryCardText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryCardSubtext: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: COLORS.background,
    borderRadius: 15,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
  },
  emptySubtext: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  liveMatchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  matchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  liveIndicator: {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "bold",
  },
  matchTime: {
    color: COLORS.gray,
    fontSize: 14,
  },
  matchDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  timeText: {
    color: COLORS.gray,
  },
  matchTeams: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  teamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  vs: {
    color: COLORS.gray,
    fontSize: 14,
    marginHorizontal: 10,
  },
  scoreContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  score: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "bold",
  },
  venue: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    alignItems: "center",
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  loadingOverlay: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadingText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "bold",
  },
})

export default HomeScreen
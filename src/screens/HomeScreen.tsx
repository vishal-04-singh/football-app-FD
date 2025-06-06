"use client"

import type React from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import { Ionicons } from "@expo/vector-icons"
import { useState, useEffect } from "react"
import { debugTeamAssignment } from "../../utils/debugUtils"

const HomeScreen: React.FC = () => {
  const { user } = useAuth()
  const { tournament, teams, matches, loading, refreshData } = useTournament()
  const [refreshing, setRefreshing] = useState(false)

  // Debug team assignment on component mount
  useEffect(() => {
    if (user?.role === "captain") {
      debugTeamAssignment(user, teams)
    }
  }, [user, teams])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshData()
      Alert.alert("Success", "Data refreshed successfully!")
    } catch (error) {
      console.error("Error refreshing data:", error)
      Alert.alert("Error", "Failed to refresh data. Please try again.")
    } finally {
      setRefreshing(false)
    }
  }

  const upcomingMatches = matches.filter((match) => match.status === "upcoming").slice(0, 3) || []
  const liveMatches = matches.filter((match) => match.status === "live") || []

  // Find user's team if they are a captain
  const userTeam =
    user?.role === "captain" && user?.teamId ? teams.find((t) => t.id === user.teamId || t._id === user.teamId) : null

  const getTeamName = (teamId: string) => {
    return teams.find((team) => team.id === teamId || team._id === teamId)?.name || "Unknown Team"
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.roleText}>{user?.role.toUpperCase()}</Text>
        {userTeam && <Text style={styles.teamText}>Team: {userTeam.name}</Text>}

        {/* Add refresh button */}
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing || loading}>
          <Ionicons name="refresh" size={20} color={COLORS.white} />
          <Text style={styles.refreshText}>Refresh Data</Text>
        </TouchableOpacity>
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
            <Text style={styles.statValue}>{liveMatches.length}</Text>
            <Text style={styles.statLabel}>Live</Text>
          </View>
        </View>
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
            <Text style={styles.infoLabel}>Total Matches:</Text>
            <Text style={styles.infoValue}>{matches.length}</Text>
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
    </ScrollView>
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
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 15,
    alignSelf: "flex-start",
  },
  refreshText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 5,
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

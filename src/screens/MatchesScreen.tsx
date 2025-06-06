"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from "react-native"
import { useTournament } from "../contexts/TournamentContext"
import { useAuth } from "../contexts/AuthContext"
import { COLORS } from "../constants/colors"
import type { Match } from "../types"
import { Ionicons } from "@expo/vector-icons"

const MatchesScreen: React.FC = () => {
  const { tournament } = useTournament()
  const { user } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(1)

  const weeks = [1, 2, 3, 4] // 4 weeks total

  const getMatchesForWeek = (week: number) => {
    return tournament?.matches.filter((match) => match.week === week) || []
  }

  const getTeamName = (teamId: string) => {
    return tournament?.teams.find((team) => team.id === teamId)?.name || "Unknown Team"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return COLORS.red
      case "completed":
        return COLORS.green
      default:
        return COLORS.gray
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "live":
        return "LIVE"
      case "completed":
        return "COMPLETED"
      default:
        return "UPCOMING"
    }
  }

  const renderMatch = ({ item: match }: { item: Match }) => (
    <TouchableOpacity style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(match.status) }]}>
          <Text style={styles.statusText}>{getStatusText(match.status)}</Text>
        </View>
        <Text style={styles.matchDate}>{match.date}</Text>
      </View>

      <View style={styles.matchContent}>
        <View style={styles.teamSection}>
          <Text style={styles.teamName}>{getTeamName(match.homeTeamId)}</Text>
          <Text style={styles.teamLabel}>HOME</Text>
        </View>

        <View style={styles.scoreSection}>
          {match.status === "completed" || match.status === "live" ? (
            <View style={styles.scoreContainer}>
              <Text style={styles.score}>{match.homeScore}</Text>
              <Text style={styles.scoreSeparator}>-</Text>
              <Text style={styles.score}>{match.awayScore}</Text>
            </View>
          ) : (
            <View style={styles.timeContainer}>
              <Text style={styles.matchTime}>{match.time}</Text>
            </View>
          )}
        </View>

        <View style={styles.teamSection}>
          <Text style={styles.teamName}>{getTeamName(match.awayTeamId)}</Text>
          <Text style={styles.teamLabel}>AWAY</Text>
        </View>
      </View>

      <View style={styles.matchFooter}>
        <Text style={styles.venue}>📍 {match.venue}</Text>
        {match.status === "live" && (
          <TouchableOpacity style={styles.liveButton}>
            <Ionicons name="play-circle" size={16} color={COLORS.white} />
            <Text style={styles.liveButtonText}>Watch Live</Text>
          </TouchableOpacity>
        )}
      </View>

      {match.events.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.eventsTitle}>Match Events:</Text>
          {match.events.slice(0, 3).map((event, index) => (
            <Text key={index} style={styles.eventText}>
              {event.minute}' - {event.playerName} ({event.type.replace("_", " ")})
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekSelector}>
          {weeks.map((week) => (
            <TouchableOpacity
              key={week}
              style={[styles.weekButton, selectedWeek === week && styles.selectedWeekButton]}
              onPress={() => setSelectedWeek(week)}
            >
              <Text style={[styles.weekButtonText, selectedWeek === week && styles.selectedWeekButtonText]}>
                Week {week}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={getMatchesForWeek(selectedWeek)}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.matchesList}
        showsVerticalScrollIndicator={false}
      />

      {selectedWeek === 4 && (
        <View style={styles.playoffInfo}>
          <Text style={styles.playoffTitle}>🏆 Playoff Stage</Text>
          <Text style={styles.playoffText}>
            Semi-finals and Final matches will be scheduled based on league standings
          </Text>
        </View>
      )}
    </View>
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 15,
  },
  weekSelector: {
    flexDirection: "row",
  },
  weekButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  selectedWeekButton: {
    backgroundColor: COLORS.primary,
  },
  weekButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  selectedWeekButtonText: {
    color: COLORS.black,
  },
  matchesList: {
    padding: 20,
  },
  matchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  matchDate: {
    color: COLORS.gray,
    fontSize: 14,
  },
  matchContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
  },
  teamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  teamLabel: {
    color: COLORS.gray,
    fontSize: 12,
  },
  scoreSection: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  score: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: "bold",
  },
  scoreSeparator: {
    color: COLORS.black,
    fontSize: 20,
    marginHorizontal: 10,
  },
  timeContainer: {
    backgroundColor: COLORS.gray,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  matchTime: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  matchFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venue: {
    color: COLORS.gray,
    fontSize: 14,
  },
  liveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  liveButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  eventsSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
  },
  eventsTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  eventText: {
    color: COLORS.gray,
    fontSize: 12,
    marginBottom: 4,
  },
  playoffInfo: {
    backgroundColor: COLORS.background,
    padding: 20,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  playoffTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  playoffText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
  },
})

export default MatchesScreen

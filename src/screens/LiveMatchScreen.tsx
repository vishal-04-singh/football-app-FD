"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import type { MatchEvent } from "../types"
import { Ionicons } from "@expo/vector-icons"

const LiveMatchScreen: React.FC = () => {
  const { user } = useAuth()
  const { tournament, updateMatch } = useTournament()
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([])
  const [currentMinute, setCurrentMinute] = useState(0)

  const liveMatches = tournament?.matches.filter((match) => match.status === "live") || []
  const currentMatch = selectedMatch ? tournament?.matches.find((match) => match.id === selectedMatch) : liveMatches[0]

  const getTeamName = (teamId: string) => {
    return tournament?.teams.find((team) => team.id === teamId)?.name || "Unknown Team"
  }

  const addMatchEvent = (type: "goal" | "yellow_card" | "red_card" | "substitution", teamId: string) => {
    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can update match events")
      return
    }

    Alert.prompt("Add Event", `Enter player name for ${type.replace("_", " ")}:`, (playerName) => {
      if (playerName) {
        const newEvent: MatchEvent = {
          id: `event${Date.now()}`,
          type,
          playerId: `player${Date.now()}`,
          playerName,
          minute: currentMinute,
          description: `${playerName} - ${type.replace("_", " ")}`,
        }

        setMatchEvents((prev) => [...prev, newEvent])

        if (type === "goal") {
          if (teamId === currentMatch?.homeTeamId) {
            setHomeScore((prev) => prev + 1)
          } else {
            setAwayScore((prev) => prev + 1)
          }
        }
      }
    })
  }

  const updateMatchScore = () => {
    if (!currentMatch || user?.role !== "management") return

    updateMatch(currentMatch.id, homeScore, awayScore, matchEvents)
    Alert.alert("Success", "Match updated successfully!")
  }

  useEffect(() => {
    if (currentMatch) {
      setHomeScore(currentMatch.homeScore)
      setAwayScore(currentMatch.awayScore)
      setMatchEvents(currentMatch.events)
    }
  }, [currentMatch])

  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <View style={styles.noMatchContainer}>
          <Ionicons name="football-outline" size={80} color={COLORS.gray} />
          <Text style={styles.noMatchText}>No Live Matches</Text>
          <Text style={styles.noMatchSubtext}>Check back when matches are in progress</Text>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.matchHeader}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.matchTime}>{currentMinute}'</Text>
      </View>

      <View style={styles.scoreSection}>
        <View style={styles.teamSection}>
          <Text style={styles.teamName}>{getTeamName(currentMatch.homeTeamId)}</Text>
          <Text style={styles.teamLabel}>HOME</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{homeScore}</Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={styles.score}>{awayScore}</Text>
        </View>

        <View style={styles.teamSection}>
          <Text style={styles.teamName}>{getTeamName(currentMatch.awayTeamId)}</Text>
          <Text style={styles.teamLabel}>AWAY</Text>
        </View>
      </View>

      <View style={styles.matchInfo}>
        <Text style={styles.venue}>📍 {currentMatch.venue}</Text>
        <Text style={styles.date}>
          {currentMatch.date} • {currentMatch.time}
        </Text>
      </View>

      {user?.role === "management" && (
        <View style={styles.managementControls}>
          <Text style={styles.controlsTitle}>Match Controls</Text>

          <View style={styles.minuteControl}>
            <Text style={styles.minuteLabel}>Current Minute:</Text>
            <View style={styles.minuteButtons}>
              <TouchableOpacity
                style={styles.minuteButton}
                onPress={() => setCurrentMinute(Math.max(0, currentMinute - 1))}
              >
                <Text style={styles.minuteButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.minuteDisplay}>{currentMinute}</Text>
              <TouchableOpacity style={styles.minuteButton} onPress={() => setCurrentMinute(currentMinute + 1)}>
                <Text style={styles.minuteButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.eventButtons}>
            <TouchableOpacity
              style={[styles.eventButton, styles.goalButton]}
              onPress={() => addMatchEvent("goal", currentMatch.homeTeamId)}
            >
              <Ionicons name="football" size={20} color={COLORS.white} />
              <Text style={styles.eventButtonText}>Home Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.goalButton]}
              onPress={() => addMatchEvent("goal", currentMatch.awayTeamId)}
            >
              <Ionicons name="football" size={20} color={COLORS.white} />
              <Text style={styles.eventButtonText}>Away Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.cardButton]}
              onPress={() => addMatchEvent("yellow_card", currentMatch.homeTeamId)}
            >
              <View style={styles.yellowCard} />
              <Text style={styles.eventButtonText}>Yellow Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.redCardButton]}
              onPress={() => addMatchEvent("red_card", currentMatch.homeTeamId)}
            >
              <View style={styles.redCard} />
              <Text style={styles.eventButtonText}>Red Card</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.updateButton} onPress={updateMatchScore}>
            <Text style={styles.updateButtonText}>Update Match</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.eventsSection}>
        <Text style={styles.eventsTitle}>Match Events</Text>
        {matchEvents.length === 0 ? (
          <Text style={styles.noEventsText}>No events yet</Text>
        ) : (
          matchEvents.map((event, index) => (
            <View key={index} style={styles.eventItem}>
              <View style={styles.eventTime}>
                <Text style={styles.eventMinute}>{event.minute}'</Text>
              </View>
              <View style={styles.eventIcon}>
                {event.type === "goal" && <Ionicons name="football" size={16} color={COLORS.green} />}
                {event.type === "yellow_card" && <View style={styles.smallYellowCard} />}
                {event.type === "red_card" && <View style={styles.smallRedCard} />}
                {event.type === "substitution" && <Ionicons name="swap-horizontal" size={16} color={COLORS.blue} />}
              </View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventPlayer}>{event.playerName}</Text>
                <Text style={styles.eventType}>{event.type.replace("_", " ").toUpperCase()}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  noMatchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noMatchText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
  },
  noMatchSubtext: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 10,
    textAlign: "center",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    marginRight: 8,
  },
  liveText: {
    color: COLORS.red,
    fontSize: 16,
    fontWeight: "bold",
  },
  matchTime: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  scoreSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 30,
    backgroundColor: COLORS.background,
    marginTop: 1,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
  },
  teamName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  teamLabel: {
    color: COLORS.gray,
    fontSize: 12,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginHorizontal: 20,
  },
  score: {
    color: COLORS.black,
    fontSize: 36,
    fontWeight: "bold",
  },
  scoreSeparator: {
    color: COLORS.black,
    fontSize: 30,
    marginHorizontal: 15,
  },
  matchInfo: {
    alignItems: "center",
    padding: 15,
    backgroundColor: COLORS.background,
    marginTop: 1,
  },
  venue: {
    color: COLORS.gray,
    fontSize: 14,
  },
  date: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  managementControls: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 15,
  },
  controlsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  minuteControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  minuteLabel: {
    color: COLORS.white,
    fontSize: 16,
  },
  minuteButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  minuteButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  minuteButtonText: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: "bold",
  },
  minuteDisplay: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  eventButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  eventButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    minWidth: "45%",
    justifyContent: "center",
  },
  goalButton: {
    backgroundColor: COLORS.green,
  },
  cardButton: {
    backgroundColor: "#FFA500",
  },
  redCardButton: {
    backgroundColor: COLORS.red,
  },
  eventButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  yellowCard: {
    width: 12,
    height: 16,
    backgroundColor: "#FFD700",
    borderRadius: 2,
  },
  redCard: {
    width: 12,
    height: 16,
    backgroundColor: COLORS.red,
    borderRadius: 2,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  updateButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  eventsSection: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 15,
  },
  eventsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  noEventsText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  eventTime: {
    width: 40,
  },
  eventMinute: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  eventIcon: {
    width: 30,
    alignItems: "center",
  },
  smallYellowCard: {
    width: 8,
    height: 12,
    backgroundColor: "#FFD700",
    borderRadius: 1,
  },
  smallRedCard: {
    width: 8,
    height: 12,
    backgroundColor: COLORS.red,
    borderRadius: 1,
  },
  eventDetails: {
    flex: 1,
    marginLeft: 10,
  },
  eventPlayer: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  eventType: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
})

export default LiveMatchScreen

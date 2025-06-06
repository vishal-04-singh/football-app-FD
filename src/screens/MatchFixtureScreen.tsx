"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import { Ionicons } from "@expo/vector-icons"
import type { ScheduleMatchData } from "../types"
import CustomDateTimePicker from "../../components/DateTimePicker"

const ScheduleMatchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth()
  const { tournament, scheduleMatch, updateMatchStats } = useTournament()
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [selectedHomeTeam, setSelectedHomeTeam] = useState("")
  const [selectedAwayTeam, setSelectedAwayTeam] = useState("")
  const [matchDate, setMatchDate] = useState("")
  const [matchTime, setMatchTime] = useState("")
  const [venue, setVenue] = useState("Football Arena")
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Match stats states
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [matchMinute, setMatchMinute] = useState(0)
  const [possession, setPossession] = useState({ home: 50, away: 50 })
  const [shots, setShots] = useState({ home: 0, away: 0 })
  const [corners, setCorners] = useState({ home: 0, away: 0 })
  const [fouls, setFouls] = useState({ home: 0, away: 0 })

  // Date and time picker states
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(new Date())

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate)
    const formattedDate = selectedDate.toISOString().split("T")[0]
    setMatchDate(formattedDate)
  }

  const handleTimeChange = (selectedTime: Date) => {
    setTime(selectedTime)
    const hours = selectedTime.getHours().toString().padStart(2, "0")
    const minutes = selectedTime.getMinutes().toString().padStart(2, "0")
    setMatchTime(`${hours}:${minutes}`)
  }

  const handleScheduleMatch = () => {
    if (!selectedHomeTeam || !selectedAwayTeam || !matchDate || !matchTime) {
      Alert.alert("Error", "Please fill all fields")
      return
    }

    if (selectedHomeTeam === selectedAwayTeam) {
      Alert.alert("Error", "Home and away teams cannot be the same")
      return
    }

    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can schedule matches")
      return
    }

    const matchData: ScheduleMatchData = {
      homeTeamId: selectedHomeTeam,
      awayTeamId: selectedAwayTeam,
      date: matchDate,
      time: matchTime,
      venue,
      week: selectedWeek,
    }

    scheduleMatch(matchData)

    // Reset form
    setSelectedHomeTeam("")
    setSelectedAwayTeam("")
    setMatchDate("")
    setMatchTime("")
    setVenue("Football Arena")
    setShowScheduleModal(false)

    Alert.alert("Success", "Match scheduled successfully!")
  }

  const handleUpdateStats = () => {
    if (!selectedMatch) return

    const statsUpdate = {
      homeScore,
      awayScore,
      minute: matchMinute,
      possession,
      shots,
      corners,
      fouls,
    }

    updateMatchStats(selectedMatch.id, statsUpdate)
    setShowStatsModal(false)
    Alert.alert("Success", "Match stats updated successfully!")
  }

  const openStatsModal = (match: any) => {
    setSelectedMatch(match)
    setHomeScore(match.homeScore || 0)
    setAwayScore(match.awayScore || 0)
    setMatchMinute(match.minute || 0)
    setPossession(match.possession || { home: 50, away: 50 })
    setShots(match.shots || { home: 0, away: 0 })
    setCorners(match.corners || { home: 0, away: 0 })
    setFouls(match.fouls || { home: 0, away: 0 })
    setShowStatsModal(true)
  }

  const navigateToLiveMatch = (match: any) => {
    // Navigate directly to LiveMatch screen with match data
    navigation.navigate("LiveMatch", { matchId: match.id })
  }

  const getTeamName = (teamId: string) => {
    return tournament?.teams.find((team) => team.id === teamId)?.name || "Unknown Team"
  }

  const liveMatches = tournament?.matches.filter((match) => match.status === "live") || []

  const getMatchMinute = (match: any) => {
    const matchDateTime = new Date(`${match.date}T${match.time}:00`)
    const now = currentTime
    const timeDiff = now.getTime() - matchDateTime.getTime()
    const minutesDiff = Math.floor(timeDiff / (1000 * 60))
    return Math.max(0, Math.min(90, minutesDiff))
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Schedule Matches</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowScheduleModal(true)}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.rulesTitle}>Scheduling Rules</Text>
          </View>
          <Text style={styles.rulesText}>
            • Tournament runs for 4 weeks{"\n"}• Each team plays 7 matches (28 total){"\n"}• Week 4 is reserved for
            playoffs{"\n"}• All matches at Football Arena
          </Text>
        </View>

        <View style={styles.liveSection}>
          <Text style={styles.sectionTitle}>Live Matches ({liveMatches.length})</Text>
          {liveMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="football-outline" size={60} color={COLORS.gray} />
              <Text style={styles.emptyText}>No live matches</Text>
              <Text style={styles.emptySubtext}>Matches will appear here when they start</Text>
            </View>
          ) : (
            liveMatches.map((match) => (
              <TouchableOpacity key={match.id} style={styles.liveMatchCard} onPress={() => navigateToLiveMatch(match)}>
                <View style={styles.matchHeader}>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekText}>Week {match.week}</Text>
                  </View>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.matchDate}>
                    {new Date(match.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                <View style={styles.matchContent}>
                  <View style={styles.teamSection}>
                    <Text style={styles.teamName}>{getTeamName(match.homeTeamId)}</Text>
                  </View>

                  <View style={styles.scoreSection}>
                    <Text style={styles.score}>
                      {match.homeScore || 0} - {match.awayScore || 0}
                    </Text>
                    <Text style={styles.minute}>{getMatchMinute(match)}'</Text>
                  </View>

                  <View style={styles.teamSection}>
                    <Text style={styles.teamName}>{getTeamName(match.awayTeamId)}</Text>
                  </View>
                </View>

                <View style={styles.matchFooter}>
                  <View style={styles.venueInfo}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.venueText}>{match.venue}</Text>
                  </View>
                  <View style={styles.liveActions}>
                    <TouchableOpacity
                      style={styles.statsButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        openStatsModal(match)
                      }}
                    >
                      <Ionicons name="stats-chart" size={16} color={COLORS.white} />
                      <Text style={styles.statsButtonText}>Stats</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.liveButton}
                      onPress={(e) => {
                        e.stopPropagation()
                        navigateToLiveMatch(match)
                      }}
                    >
                      <Ionicons name="play-circle" size={16} color={COLORS.white} />
                      <Text style={styles.liveButtonText}>Live</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.quickStatsCard}>
          <Text style={styles.quickStatsTitle}>Tournament Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tournament?.teams.length || 0}</Text>
              <Text style={styles.statLabel}>Teams</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tournament?.matches.length || 0}</Text>
              <Text style={styles.statLabel}>Total Matches</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {tournament?.matches.filter((m) => m.status === "upcoming").length || 0}
              </Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{liveMatches.length}</Text>
              <Text style={styles.statLabel}>Live</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewMatchesButton}
          onPress={() => navigation.navigate("Main", { screen: "Matches" })}
        >
          <Ionicons name="football" size={24} color={COLORS.primary} />
          <Text style={styles.viewMatchesButtonText}>View All Matches</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Schedule Match Modal */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Schedule New Match</Text>

              <View style={styles.weekSelector}>
                <Text style={styles.inputLabel}>Tournament Week:</Text>
                <View style={styles.weekButtons}>
                  {[1, 2, 3].map((week) => (
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
                </View>
              </View>

              <View style={styles.teamSelection}>
                <Text style={styles.inputLabel}>Home Team:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamPicker}>
                  {tournament?.teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.teamPickerItem, selectedHomeTeam === team.id && styles.selectedTeamPickerItem]}
                      onPress={() => setSelectedHomeTeam(team.id)}
                    >
                      <Text
                        style={[styles.teamPickerText, selectedHomeTeam === team.id && styles.selectedTeamPickerText]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.teamSelection}>
                <Text style={styles.inputLabel}>Away Team:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamPicker}>
                  {tournament?.teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[styles.teamPickerItem, selectedAwayTeam === team.id && styles.selectedTeamPickerItem]}
                      onPress={() => setSelectedAwayTeam(team.id)}
                    >
                      <Text
                        style={[styles.teamPickerText, selectedAwayTeam === team.id && styles.selectedTeamPickerText]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.dateTimeSection}>
                <Text style={styles.inputLabel}>Match Date:</Text>
                <CustomDateTimePicker mode="date" value={date} onChange={handleDateChange} placeholder="Select Date" />
              </View>

              <View style={styles.dateTimeSection}>
                <Text style={styles.inputLabel}>Match Time:</Text>
                <CustomDateTimePicker mode="time" value={time} onChange={handleTimeChange} placeholder="Select Time" />
              </View>

              <View style={styles.dateTimeSection}>
                <Text style={styles.inputLabel}>Venue:</Text>
                <View style={styles.venueContainer}>
                  <Text style={styles.venueText}>Football Arena</Text>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowScheduleModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleScheduleMatch}>
                  <Text style={styles.confirmButtonText}>Schedule Match</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Match Stats Update Modal */}
      <Modal visible={showStatsModal} transparent animationType="slide" onRequestClose={() => setShowStatsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Update Match Stats</Text>
              {selectedMatch && (
                <Text style={styles.matchInfo}>
                  {getTeamName(selectedMatch.homeTeamId)} vs {getTeamName(selectedMatch.awayTeamId)}
                </Text>
              )}

              {/* Score Section */}
              <View style={styles.statsSection}>
                <Text style={styles.statsLabel}>Score</Text>
                <View style={styles.scoreControls}>
                  <View style={styles.scoreTeam}>
                    <Text style={styles.scoreTeamName}>{selectedMatch && getTeamName(selectedMatch.homeTeamId)}</Text>
                    <View style={styles.scoreButtons}>
                      <TouchableOpacity
                        style={styles.scoreButton}
                        onPress={() => setHomeScore(Math.max(0, homeScore - 1))}
                      >
                        <Text style={styles.scoreButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.scoreValue}>{homeScore}</Text>
                      <TouchableOpacity style={styles.scoreButton} onPress={() => setHomeScore(homeScore + 1)}>
                        <Text style={styles.scoreButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.scoreTeam}>
                    <Text style={styles.scoreTeamName}>{selectedMatch && getTeamName(selectedMatch.awayTeamId)}</Text>
                    <View style={styles.scoreButtons}>
                      <TouchableOpacity
                        style={styles.scoreButton}
                        onPress={() => setAwayScore(Math.max(0, awayScore - 1))}
                      >
                        <Text style={styles.scoreButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.scoreValue}>{awayScore}</Text>
                      <TouchableOpacity style={styles.scoreButton} onPress={() => setAwayScore(awayScore + 1)}>
                        <Text style={styles.scoreButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Match Minute */}
              <View style={styles.statsSection}>
                <Text style={styles.statsLabel}>Match Minute</Text>
                <View style={styles.minuteControls}>
                  <TouchableOpacity
                    style={styles.minuteButton}
                    onPress={() => setMatchMinute(Math.max(0, matchMinute - 1))}
                  >
                    <Text style={styles.minuteButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.minuteValue}>{matchMinute}'</Text>
                  <TouchableOpacity
                    style={styles.minuteButton}
                    onPress={() => setMatchMinute(Math.min(90, matchMinute + 1))}
                  >
                    <Text style={styles.minuteButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStatsSection}>
                <Text style={styles.statsLabel}>Quick Stats</Text>
                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Shots</Text>
                  <View style={styles.quickStatControls}>
                    <TouchableOpacity onPress={() => setShots({ ...shots, home: Math.max(0, shots.home - 1) })}>
                      <Text style={styles.quickStatButton}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quickStatValue}>{shots.home}</Text>
                    <TouchableOpacity onPress={() => setShots({ ...shots, home: shots.home + 1 })}>
                      <Text style={styles.quickStatButton}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quickStatControls}>
                    <TouchableOpacity onPress={() => setShots({ ...shots, away: Math.max(0, shots.away - 1) })}>
                      <Text style={styles.quickStatButton}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quickStatValue}>{shots.away}</Text>
                    <TouchableOpacity onPress={() => setShots({ ...shots, away: shots.away + 1 })}>
                      <Text style={styles.quickStatButton}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Corners</Text>
                  <View style={styles.quickStatControls}>
                    <TouchableOpacity onPress={() => setCorners({ ...corners, home: Math.max(0, corners.home - 1) })}>
                      <Text style={styles.quickStatButton}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quickStatValue}>{corners.home}</Text>
                    <TouchableOpacity onPress={() => setCorners({ ...corners, home: corners.home + 1 })}>
                      <Text style={styles.quickStatButton}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quickStatControls}>
                    <TouchableOpacity onPress={() => setCorners({ ...corners, away: Math.max(0, corners.away - 1) })}>
                      <Text style={styles.quickStatButton}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quickStatValue}>{corners.away}</Text>
                    <TouchableOpacity onPress={() => setCorners({ ...corners, away: corners.away + 1 })}>
                      <Text style={styles.quickStatButton}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowStatsModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdateStats}>
                  <Text style={styles.confirmButtonText}>Update Stats</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  addButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  rulesCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  rulesTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  rulesText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
  liveSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
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
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  weekBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  weekText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "bold",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.red,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginRight: 5,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  matchDate: {
    color: COLORS.gray,
    fontSize: 12,
  },
  matchContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  teamSection: {
    flex: 1,
  },
  teamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  scoreSection: {
    alignItems: "center",
    marginHorizontal: 20,
  },
  score: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  minute: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
  },
  matchFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venueInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  venueText: {
    color: COLORS.gray,
    fontSize: 14,
    marginLeft: 5,
  },
  liveActions: {
    flexDirection: "row",
    gap: 10,
  },
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statsButtonText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
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
  quickStatsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  quickStatsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    color: COLORS.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 5,
  },
  viewMatchesButton: {
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: 10,
  },
  viewMatchesButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    maxHeight: "85%",
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  matchInfo: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  weekSelector: {
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  weekButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  teamSelection: {
    marginBottom: 20,
  },
  teamPicker: {
    flexDirection: "row",
  },
  teamPickerItem: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  selectedTeamPickerItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  teamPickerText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  selectedTeamPickerText: {
    color: COLORS.black,
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.gray,
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  confirmButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  dateTimeSection: {
    marginBottom: 20,
  },
  venueContainer: {
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsSection: {
    marginBottom: 20,
  },
  statsLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  scoreControls: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  scoreTeam: {
    alignItems: "center",
    flex: 1,
  },
  scoreTeamName: {
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
  },
  scoreButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreButtonText: {
    color: COLORS.black,
    fontSize: 20,
    fontWeight: "bold",
  },
  scoreValue: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  minuteControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  minuteValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  quickStatsSection: {
    marginBottom: 20,
  },
  quickStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  quickStatLabel: {
    color: COLORS.white,
    fontSize: 14,
    flex: 1,
  },
  quickStatControls: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  quickStatButton: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 10,
  },
  quickStatValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
})

export default ScheduleMatchScreen

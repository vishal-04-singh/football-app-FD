"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { useTournament } from "../contexts/TournamentContext"
import { COLORS } from "../constants/colors"
import { Ionicons } from "@expo/vector-icons"
import type { ScheduleMatchData } from "../types"
import CustomDateTimePicker from "../../components/DateTimePicker"

const ScheduleMatchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth()
  const { tournament, scheduleMatch } = useTournament()
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedHomeTeam, setSelectedHomeTeam] = useState("")
  const [selectedAwayTeam, setSelectedAwayTeam] = useState("")
  const [matchDate, setMatchDate] = useState("")
  const [matchTime, setMatchTime] = useState("")
  const [venue, setVenue] = useState("Football Arena")
  const [selectedWeek, setSelectedWeek] = useState(1)

  // Date and time picker states
  const [date, setDate] = useState(new Date())
  const [time, setTime] = useState(new Date())

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate)
    // Format date as YYYY-MM-DD
    const formattedDate = selectedDate.toISOString().split("T")[0]
    setMatchDate(formattedDate)
  }

  const handleTimeChange = (selectedTime: Date) => {
    setTime(selectedTime)
    // Format time as HH:MM
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

  const getTeamName = (teamId: string) => {
    return tournament?.teams.find((team) => team.id === teamId)?.name || "Unknown Team"
  }

  const upcomingMatches = tournament?.matches.filter((match) => match.status === "upcoming") || []

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const navigateToMatchFixture = (matchId: string) => {
    navigation.navigate("MatchFixture", { matchId })
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

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📅 Scheduling Rules</Text>
          <Text style={styles.infoText}>
            • Tournament runs for 4 weeks{"\n"}• Each team plays 7 matches (28 total){"\n"}• Week 4 is reserved for
            playoffs{"\n"}• All matches at Football Arena
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Matches ({upcomingMatches.length})</Text>
          {upcomingMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color={COLORS.gray} />
              <Text style={styles.emptyText}>No matches scheduled yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to schedule a match</Text>
            </View>
          ) : (
            upcomingMatches.map((match) => (
              <View
                key={match.id}
                style={styles.matchCard}
                
              >
                <View style={styles.matchHeader}>
                  <Text style={styles.weekBadge}>Week {match.week}</Text>
                  <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
                </View>
                <View style={styles.matchTeams}>
                  <Text style={styles.teamName}>{getTeamName(match.homeTeamId)}</Text>
                  <Text style={styles.vs}>VS</Text>
                  <Text style={styles.teamName}>{getTeamName(match.awayTeamId)}</Text>
                </View>
                <View style={styles.matchDetails}>
                  <Text style={styles.matchTime}>🕐 {match.time}</Text>
                  <Text style={styles.matchVenue}>📍 {match.venue}</Text>
                </View>
              </View>
            ))
          )}
        </View>
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
                <Text style={styles.inputLabel}>A Team:</Text>
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
                <Text style={styles.inputLabel}>B Team:</Text>
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
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: COLORS.background,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    padding: 20,
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
  matchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  weekBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.black,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 12,
    fontWeight: "bold",
  },
  matchDate: {
    color: COLORS.gray,
    fontSize: 14,
  },
  matchTeams: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
    marginHorizontal: 15,
  },
  matchDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  matchTime: {
    color: COLORS.primary,
    fontSize: 14,
  },
  matchVenue: {
    color: COLORS.gray,
    fontSize: 14,
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
  venueText: {
    color: COLORS.white,
    fontSize: 16,
  },
})

export default ScheduleMatchScreen

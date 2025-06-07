"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTournament } from "../contexts/TournamentContext";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import type { ScheduleMatchData } from "../types";
import CustomDateTimePicker from "../../components/DateTimePicker";

const MATCH_STATUS = {
  UPCOMING: "upcoming",
  LIVE: "live",
  COMPLETED: "completed",
};

const ScheduleMatchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { tournament, scheduleMatch, teams, matches, getMatchStatus } =
    useTournament();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedHomeTeam, setSelectedHomeTeam] = useState("");
  const [selectedAwayTeam, setSelectedAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venue, setVenue] = useState("Football Arena");
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Date and time picker states
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate);
    // Format date as YYYY-MM-DD
    const formattedDate = selectedDate.toISOString().split("T")[0];
    setMatchDate(formattedDate);
  };

  const handleTimeChange = (selectedTime: Date) => {
    setTime(selectedTime);
    // Format time as HH:MM
    const hours = selectedTime.getHours().toString().padStart(2, "0");
    const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
    setMatchTime(`${hours}:${minutes}`);
  };

  const handleScheduleMatch = () => {
    if (!selectedHomeTeam || !selectedAwayTeam || !matchDate || !matchTime) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (selectedHomeTeam === selectedAwayTeam) {
      Alert.alert("Error", "Home and away teams cannot be the same");
      return;
    }

    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can schedule matches");
      return;
    }

    const matchData: ScheduleMatchData = {
      homeTeamId: selectedHomeTeam,
      awayTeamId: selectedAwayTeam,
      date: matchDate,
      time: matchTime,
      venue,
      week: selectedWeek,
    };

    scheduleMatch(matchData);

    // Reset form
    setSelectedHomeTeam("");
    setSelectedAwayTeam("");
    setMatchDate("");
    setMatchTime("");
    setVenue("Football Arena");
    setShowScheduleModal(false);

    Alert.alert("Success", "Match scheduled successfully!");
  };

  const getTeamInfo = (teamId: string) => {
    // Check for various ID formats (_id or id)
    const team = teams.find(
      (t) =>
        t.id === teamId ||
        t._id === teamId ||
        String(t.id) === String(teamId) ||
        String(t._id) === String(teamId)
    );

    if (!team) {
      console.log(`Team not found for ID: ${teamId}`);
      return {
        name: "Unknown Team",
        logo: null,
      };
    }

    return {
      name: team.name,
      logo: team.logo,
    };
  };

  // Add debugging to see the actual team data
  useEffect(() => {
    console.log("Available teams:", teams);
    console.log("Match data:", matches);
  }, [teams, matches]);

  // Group matches by status
  const liveMatches = matches.filter(
    (match) => match.status === MATCH_STATUS.LIVE
  );
  const upcomingMatches = matches.filter(
    (match) => match.status === MATCH_STATUS.UPCOMING
  );
  const completedMatches = matches.filter(
    (match) => match.status === MATCH_STATUS.COMPLETED
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const navigateToMatchFixture = (matchId: string) => {
    navigation.navigate("MatchFixture", { matchId });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case MATCH_STATUS.LIVE:
        return styles.liveBadge;
      case MATCH_STATUS.COMPLETED:
        return styles.completedBadge;
      default:
        return styles.upcomingBadge;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case MATCH_STATUS.LIVE:
        return "LIVE";
      case MATCH_STATUS.COMPLETED:
        return "COMPLETED";
      default:
        return "UPCOMING";
    }
  };

  const renderMatchCard = (match: { id: React.Key | null | undefined; homeTeamId: string; awayTeamId: string; week: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; status: string; date: string; time: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; venue: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => {
  // Debug the team IDs
  console.log(`Rendering match ${match.id}: Home=${match.homeTeamId}, Away=${match.awayTeamId}`);
  
  const homeTeam = getTeamInfo(match.homeTeamId);
  const awayTeam = getTeamInfo(match.awayTeamId);
  
  // Debug the retrieved team info
  console.log(`Home team: ${JSON.stringify(homeTeam)}`);
  console.log(`Away team: ${JSON.stringify(awayTeam)}`);

  return (
    <TouchableOpacity 
      key={match.id} 
      style={styles.matchCard}
      onPress={() => match.id && navigateToMatchFixture(String(match.id))}
    >
      <View style={styles.matchHeader}>
        <Text style={styles.weekBadge}>Week {match.week}</Text>
        <View style={[styles.statusBadge, getStatusBadgeStyle(match.status)]}>
          <Text style={styles.statusBadgeText}>{getStatusText(match.status)}</Text>
        </View>
      </View>
      <Text style={styles.matchDate}>{formatDate(match.date)}</Text>
      <View style={styles.matchTeams}>
        <View style={styles.teamContainer}>
          {homeTeam.logo ? (
            <Image 
              source={{ uri: homeTeam.logo }} 
              style={styles.teamLogo}
              onError={(e) => {
                console.log("Error loading home team logo:", e.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamLogoPlaceholderText}>
                {(homeTeam.name && homeTeam.name !== "Unknown Team") 
                  ? homeTeam.name.charAt(0) 
                  : "U"}
              </Text>
            </View>
          )}
          <Text style={styles.teamName}>{homeTeam.name}</Text>
        </View>
        <Text style={styles.vs}>VS</Text>
        <View style={styles.teamContainer}>
          {awayTeam.logo ? (
            <Image 
              source={{ uri: awayTeam.logo }} 
              style={styles.teamLogo}
              onError={(e) => {
                console.log("Error loading away team logo:", e.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamLogoPlaceholderText}>
                {(awayTeam.name && awayTeam.name !== "Unknown Team") 
                  ? awayTeam.name.charAt(0) 
                  : "U"}
              </Text>
            </View>
          )}
          <Text style={styles.teamName}>{awayTeam.name}</Text>
        </View>
      </View>
      <View style={styles.matchDetails}>
        <Text style={styles.matchTime}>🕐 {match.time}</Text>
        <Text style={styles.matchVenue}>📍 {match.venue}</Text>
      </View>
    </TouchableOpacity>
  );
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Schedule Matches</Text>
        {user?.role === "management" && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowScheduleModal(true)}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📅 Scheduling Rules</Text>
          <Text style={styles.infoText}>
            • Tournament runs for 4 weeks{"\n"}• Each team plays 7 matches (28
            total){"\n"}• Week 4 is reserved for playoffs{"\n"}• All matches at
            Football Arena
          </Text>
        </View>

        {/* Live Matches Section */}
        {liveMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.liveTitle]}>
              Live Matches ({liveMatches.length})
            </Text>
            {liveMatches.map(renderMatchCard)}
          </View>
        )}

        {/* Upcoming Matches Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Upcoming Matches ({upcomingMatches.length})
          </Text>
          {upcomingMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color={COLORS.gray} />
              <Text style={styles.emptyText}>No upcoming matches</Text>
              {user?.role === "management" && (
                <Text style={styles.emptySubtext}>
                  Tap the + button to schedule a match
                </Text>
              )}
            </View>
          ) : (
            upcomingMatches.map(renderMatchCard)
          )}
        </View>

        {/* Completed Matches Section */}
        {completedMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Completed Matches ({completedMatches.length})
            </Text>
            {completedMatches.map(renderMatchCard)}
          </View>
        )}
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
                      style={[
                        styles.weekButton,
                        selectedWeek === week && styles.selectedWeekButton,
                      ]}
                      onPress={() => setSelectedWeek(week)}
                    >
                      <Text
                        style={[
                          styles.weekButtonText,
                          selectedWeek === week &&
                            styles.selectedWeekButtonText,
                        ]}
                      >
                        Week {week}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.teamSelection}>
                <Text style={styles.inputLabel}>Home Team:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.teamPicker}
                >
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamPickerItem,
                        selectedHomeTeam === team.id &&
                          styles.selectedTeamPickerItem,
                      ]}
                      onPress={() => setSelectedHomeTeam(team.id)}
                    >
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamPickerLogo}
                        />
                      ) : (
                        <View style={styles.teamPickerLogoPlaceholder}>
                          <Text style={styles.teamPickerLogoPlaceholderText}>
                            {team.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.teamPickerText,
                          selectedHomeTeam === team.id &&
                            styles.selectedTeamPickerText,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.teamSelection}>
                <Text style={styles.inputLabel}>Away Team:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.teamPicker}
                >
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamPickerItem,
                        selectedAwayTeam === team.id &&
                          styles.selectedTeamPickerItem,
                      ]}
                      onPress={() => setSelectedAwayTeam(team.id)}
                    >
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamPickerLogo}
                        />
                      ) : (
                        <View style={styles.teamPickerLogoPlaceholder}>
                          <Text style={styles.teamPickerLogoPlaceholderText}>
                            {team.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.teamPickerText,
                          selectedAwayTeam === team.id &&
                            styles.selectedTeamPickerText,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.dateTimeSection}>
                <Text style={styles.inputLabel}>Match Date:</Text>
                <CustomDateTimePicker
                  mode="date"
                  value={date}
                  onChange={handleDateChange}
                  placeholder="Select Date"
                />
              </View>

              <View style={styles.dateTimeSection}>
                <Text style={styles.inputLabel}>Match Time:</Text>
                <CustomDateTimePicker
                  mode="time"
                  value={time}
                  onChange={handleTimeChange}
                  placeholder="Select Time"
                />
              </View>

              <View style={styles.dateTimeSection}>
                <Text style={styles.inputLabel}>Venue (Fixed)</Text>
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

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleScheduleMatch}
                >
                  <Text style={styles.confirmButtonText}>Schedule Match</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
  liveTitle: {
    color: "#ff4500", // Bright orange for live matches
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
    marginBottom: 10,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  upcomingBadge: {
    backgroundColor: COLORS.primary,
  },
  liveBadge: {
    backgroundColor: "#ff4500", // Bright orange for live
  },
  completedBadge: {
    backgroundColor: "#4CAF50", // Green for completed
  },
  statusBadgeText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "bold",
  },
  matchDate: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 10,
  },
  matchTeams: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  teamContainer: {
    flex: 1,
    alignItems: "center",
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 5,
  },
  teamLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  teamLogoPlaceholderText: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "bold",
  },
  teamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
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
    flexDirection: "row",
    alignItems: "center",
  },
  teamPickerLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  teamPickerLogoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },
  teamPickerLogoPlaceholderText: {
    color: COLORS.black,
    fontSize: 10,
    fontWeight: "bold",
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
    color: COLORS.gray,
    fontSize: 16,
  },
});

export default ScheduleMatchScreen;

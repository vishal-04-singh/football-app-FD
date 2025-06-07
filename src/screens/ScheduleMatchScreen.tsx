"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Animated,
  Easing,
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

// Current timestamp from requirements
// Current Date and Time (UTC): 2025-06-07 20:14:33
// Current User's Login: vishal-04-singh
const CURRENT_TIMESTAMP = "2025-06-07 20:14:33";
const CURRENT_USERNAME = "vishal-04-singh";

// Convert to Indian time (UTC+5:30)
const getIndianTime = (date) => {
  const utcDate = new Date(date);
  const indianOffset = 5.5 * 60 * 60 * 1000; // 5 hours and 30 minutes in milliseconds
  return new Date(utcDate.getTime() + indianOffset);
};

// Format for Indian time display
const formatIndianTime = (date) => {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true
  });
};

const ScheduleMatchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { tournament, scheduleMatch, teams, matches, refreshData } =
    useTournament();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedHomeTeam, setSelectedHomeTeam] = useState("");
  const [selectedAwayTeam, setSelectedAwayTeam] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [venue, setVenue] = useState("Football Arena");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [currentMatches, setCurrentMatches] = useState(matches);
  const [currentDateTime, setCurrentDateTime] = useState(new Date(CURRENT_TIMESTAMP));
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Date and time picker states
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  // Debug states to help diagnose issues
  const [debugInfo, setDebugInfo] = useState({
    currentTime: "",
    matchTimes: [],
    statusCalculations: []
  });

  // Start pulsing animation for live indicators
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Update match statuses based on current time
  useEffect(() => {
    if (matches && matches.length > 0) {
      updateMatchStatuses();
    }
  }, [matches, currentDateTime]);

  // Update the current datetime every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      // In a real app, this would just be:
      // setCurrentDateTime(new Date());

      // For our demo, we'll manually update
      const newDateTime = new Date(currentDateTime);
      newDateTime.setSeconds(newDateTime.getSeconds() + 10); // Update faster for demo
      setCurrentDateTime(newDateTime);
    }, 10000); // Update every 10 seconds for demo

    return () => clearInterval(intervalId);
  }, [currentDateTime]);

  // Function to determine match status based on date and time
  const getMatchStatus = (match) => {
    if (!match || !match.date || !match.time) {
      return MATCH_STATUS.UPCOMING;
    }

    try {
      // Parse date (YYYY-MM-DD) and time (HH:MM) into a proper Date object
      const [year, month, day] = match.date.split("-").map(Number);
      const [hours, minutes] = match.time.split(":").map(Number);
      
      // Create match date object (months are 0-indexed in JS Date)
      const matchDateTime = new Date(year, month - 1, day, hours, minutes);
      
      // Calculate match end time (90 minutes after start)
      const matchEndTime = new Date(matchDateTime);
      matchEndTime.setMinutes(matchEndTime.getMinutes() + 90);
      
      // Get status
      let status = MATCH_STATUS.UPCOMING;
      
      if (currentDateTime >= matchDateTime && currentDateTime < matchEndTime) {
        status = MATCH_STATUS.LIVE;
      } else if (currentDateTime >= matchEndTime) {
        status = MATCH_STATUS.COMPLETED;
      }
      
      // Save information for debugging
      setDebugInfo(prev => ({
        ...prev,
        currentTime: currentDateTime.toString(),
        matchTimes: [...prev.matchTimes, matchDateTime.toString()],
        statusCalculations: [...prev.statusCalculations, {
          matchDate: match.date,
          matchTime: match.time,
          matchDateTime: matchDateTime.toString(),
          currentDateTime: currentDateTime.toString(),
          matchEndTime: matchEndTime.toString(),
          status,
          isAfterStart: currentDateTime >= matchDateTime,
          isBeforeEnd: currentDateTime < matchEndTime
        }]
      }));
      
      return status;
    } catch (error) {
      console.error("Error calculating match status:", error, match);
      return MATCH_STATUS.UPCOMING; // Default to upcoming on error
    }
  };

  // Update match statuses
  const updateMatchStatuses = () => {
    if (!matches) return;
    
    const updatedMatches = matches.map((match) => {
      const calculatedStatus = getMatchStatus(match);

      // Only update if the calculated status differs from current status
      // But don't override if a match is already manually marked as completed
      if (match.status !== calculatedStatus && match.status ) {
        return { ...match, status: calculatedStatus };
      }
      return match;
    });

    setCurrentMatches(updatedMatches);
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      updateMatchStatuses();
      
      // Clear debug info on refresh
      setDebugInfo({
        currentTime: currentDateTime.toString(),
        matchTimes: [],
        statusCalculations: []
      });
      
      Alert.alert("Success", "Match data refreshed!");
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

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

    // Determine initial status
    const matchData: ScheduleMatchData = {
      homeTeamId: selectedHomeTeam,
      awayTeamId: selectedAwayTeam,
      date: matchDate,
      time: matchTime,
      venue,
      week: selectedWeek,
      status: MATCH_STATUS.UPCOMING, // Default to upcoming, will be updated by status calculation
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
    const team = teams?.find(
      (t) =>
        t.id === teamId ||
        t._id === teamId ||
        String(t.id) === String(teamId) ||
        String(t._id) === String(teamId)
    );

    if (!team) {
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

  // Group matches by status
  const liveMatches = currentMatches?.filter(
    (match) => match.status === MATCH_STATUS.LIVE
  ) || [];
  
  const upcomingMatches = currentMatches?.filter(
    (match) => match.status === MATCH_STATUS.UPCOMING
  ) || [];
  
  const completedMatches = currentMatches?.filter(
    (match) => match.status === MATCH_STATUS.COMPLETED
  ) || [];

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
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

  // Function to calculate elapsed time for live matches
  const calculateElapsedTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return "0'";

    try {
      // Parse date and time into proper format
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hours, minutes] = timeStr.split(":").map(Number);
      
      // Create match date object (months are 0-indexed in JS Date)
      const matchDateTime = new Date(year, month - 1, day, hours, minutes);

      // Calculate elapsed minutes
      const elapsedMs = currentDateTime.getTime() - matchDateTime.getTime();
      const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

      // Format for display
      if (elapsedMinutes <= 45) {
        return `${elapsedMinutes}'`;
      } else if (elapsedMinutes <= 60) {
        return "HT";
      } else {
        return `${Math.min(elapsedMinutes - 15, 90)}'`; // Subtract 15 min for half-time
      }
    } catch (error) {
      console.error("Error calculating elapsed time:", error);
      return "0'";
    }
  };

  // Debug view to help diagnose issues
  const renderDebugView = () => {
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>Debug Info</Text>
        <Text style={styles.debugText}>Current Time: {debugInfo.currentTime}</Text>
        
        {debugInfo.statusCalculations.slice(-3).map((calc, index) => (
          <View key={index} style={styles.debugItem}>
            <Text style={styles.debugText}>Match: {calc.matchDate} {calc.matchTime}</Text>
            <Text style={styles.debugText}>Status: {calc.status}</Text>
            <Text style={styles.debugText}>Is After Start: {String(calc.isAfterStart)}</Text>
            <Text style={styles.debugText}>Is Before End: {String(calc.isBeforeEnd)}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Updated renderMatchCard function
  const renderMatchCard = (match) => {
    const homeTeam = getTeamInfo(match.homeTeamId);
    const awayTeam = getTeamInfo(match.awayTeamId);
    const isLive = match.status === MATCH_STATUS.LIVE;

    return (
      <TouchableOpacity
        key={match.id || `match-${Math.random()}`}
        style={[styles.matchCard, isLive && styles.liveMatchCard]}
        onPress={() => match.id && navigateToMatchFixture(String(match.id))}
      >
        {isLive && (
          <View style={styles.liveOverlayContainer}>
            <View style={styles.liveOverlay}>
              <Animated.View 
                style={[
                  styles.pulseDot, 
                  { transform: [{ scale: pulseAnim }] }
                ]} 
              />
              <Text style={styles.liveOverlayText}>LIVE NOW</Text>
            </View>
          </View>
        )}

        <View style={styles.matchHeader}>
          <Text style={styles.weekBadge}>Week {match.week || 1}</Text>
          <View style={[styles.statusBadge, getStatusBadgeStyle(match.status)]}>
            <Text style={styles.statusBadgeText}>
              {getStatusText(match.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.matchDate}>{formatDate(match.date)}</Text>

        <View style={styles.matchTeams}>
          <View style={styles.teamContainer}>
            {/* Home Team Logo */}
            {homeTeam.logo ? (
              <Image
                source={{ uri: homeTeam.logo }}
                style={[styles.teamLogo, isLive && styles.liveTeamLogo]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.teamLogoPlaceholder,
                  isLive && styles.liveTeamLogoPlaceholder,
                ]}
              >
                <Text
                  style={[
                    styles.teamLogoPlaceholderText,
                    isLive && { fontSize: 22 },
                  ]}
                >
                  {homeTeam.name && homeTeam.name !== "Unknown Team"
                    ? homeTeam.name.charAt(0)
                    : "U"}
                </Text>
              </View>
            )}
            <Text style={[styles.teamName, isLive && styles.liveTeamName]}>
              {homeTeam.name}
            </Text>
          </View>

          {isLive ? (
            <View style={styles.liveScoreContainer}>
              <Text style={styles.liveTime}>
                {calculateElapsedTime(match.date, match.time)}
              </Text>
              <View style={styles.liveScoreDisplay}>
                <Text style={styles.liveScoreText}>{match.homeScore || 0}</Text>
                <Text style={styles.liveScoreSeparator}>-</Text>
                <Text style={styles.liveScoreText}>{match.awayScore || 0}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.vs}>VS</Text>
          )}

          <View style={styles.teamContainer}>
            {/* Away Team Logo */}
            {awayTeam.logo ? (
              <Image
                source={{ uri: awayTeam.logo }}
                style={[styles.teamLogo, isLive && styles.liveTeamLogo]}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.teamLogoPlaceholder,
                  isLive && styles.liveTeamLogoPlaceholder,
                ]}
              >
                <Text
                  style={[
                    styles.teamLogoPlaceholderText,
                    isLive && { fontSize: 22 },
                  ]}
                >
                  {awayTeam.name && awayTeam.name !== "Unknown Team"
                    ? awayTeam.name.charAt(0)
                    : "U"}
                </Text>
              </View>
            )}
            <Text style={[styles.teamName, isLive && styles.liveTeamName]}>
              {awayTeam.name}
            </Text>
          </View>
        </View>

        <View style={styles.matchDetails}>
          <Text style={styles.matchTime}>🕐 {match.time}</Text>
          <Text style={styles.matchVenue}>📍 {match.venue}</Text>
        </View>

        {isLive && (
          <TouchableOpacity 
            style={styles.watchLiveButton}
            onPress={() => match.id && navigateToMatchFixture(String(match.id))}
          >
            <Ionicons name="football-outline" size={16} color={COLORS.white} />
            <Text style={styles.watchLiveButtonText}>WATCH MATCH DETAILS</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {/* Debug section - only show for matches that should be live */}
        {match.date === '2025-06-08' && match.time === '01:39' && (
          <View style={styles.matchDebug}>
            <Text style={styles.debugText}>
              Match Date: {match.date} {match.time}{'\n'}
              Current: {currentDateTime.toISOString()}{'\n'}
              Status: {match.status}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Get Indian time for display
  const indianTime = getIndianTime(currentDateTime);
  const indianTimeFormatted = formatIndianTime(indianTime);

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

      {/* Current time display - Now with Indian time */}
      <View style={styles.currentTimeBar}>
        <View style={styles.currentTimeDisplay}>
          <Ionicons name="time-outline" size={16} color={COLORS.white} />
          <Text style={styles.currentTimeText}>
            {indianTimeFormatted} (IST)
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={16} color={COLORS.white} />
          <Text style={styles.refreshButtonText}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* User info bar with username */}
      <View style={styles.userInfoBar}>
        <Text style={styles.usernameText}>@{CURRENT_USERNAME}</Text>
        <Text style={styles.currentDateText}>{CURRENT_TIMESTAMP}</Text>
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

        {/* User welcome message */}
        {user && (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.welcomeTitle}>
                Welcome, {user.name || CURRENT_USERNAME}
              </Text>
            </View>
            <Text style={styles.welcomeText}>
              {liveMatches.length > 0
                ? `There are ${liveMatches.length} live matches happening now!`
                : "No live matches at the moment. Check back later!"}
            </Text>
          </View>
        )}

        {/* Display debugging info in development mode */}
        {/* {__DEV__ && renderDebugView()} */}

        {/* Live Matches Section */}
        {liveMatches.length > 0 && (
          <View style={styles.liveSection}>
            <View style={styles.liveSectionHeader}>
              <Animated.View
                style={[
                  styles.liveSectionDot,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <Text style={styles.liveSectionTitle}>
                Live Matches ({liveMatches.length})
              </Text>
            </View>
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
                  {teams?.map((team) => (
                    <TouchableOpacity
                      key={team.id || team._id || `team-${Math.random()}`}
                      style={[
                        styles.teamPickerItem,
                        (selectedHomeTeam === team.id || selectedHomeTeam === team._id) &&
                          styles.selectedTeamPickerItem,
                      ]}
                      onPress={() => setSelectedHomeTeam(team.id || team._id)}
                    >
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamPickerLogo}
                          resizeMode="cover"
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
                          (selectedHomeTeam === team.id || selectedHomeTeam === team._id) &&
                            styles.selectedTeamPickerText,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {(!teams || teams.length === 0) && (
                    <Text style={styles.noTeamsText}>No teams available</Text>
                  )}
                </ScrollView>
              </View>

              <View style={styles.teamSelection}>
                <Text style={styles.inputLabel}>Away Team:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.teamPicker}
                >
                  {teams?.map((team) => (
                    <TouchableOpacity
                      key={team.id || team._id || `team-away-${Math.random()}`}
                      style={[
                        styles.teamPickerItem,
                        (selectedAwayTeam === team.id || selectedAwayTeam === team._id) &&
                          styles.selectedTeamPickerItem,
                      ]}
                      onPress={() => setSelectedAwayTeam(team.id || team._id)}
                    >
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamPickerLogo}
                          resizeMode="cover"
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
                          (selectedAwayTeam === team.id || selectedAwayTeam === team._id) &&
                            styles.selectedTeamPickerText,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {(!teams || teams.length === 0) && (
                    <Text style={styles.noTeamsText}>No teams available</Text>
                  )}
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
  currentTimeBar: {
    backgroundColor: COLORS.blue,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentTimeDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentTimeText: {
    color: COLORS.white,
    fontSize: 14,
    marginLeft: 5,
    fontWeight: "bold",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  refreshButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 5,
  },
  content: {
    flex: 1,
  },
  userInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
  },
  usernameText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  currentDateText: {
    color: COLORS.gray,
    fontSize: 12,
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
  welcomeCard: {
    backgroundColor: COLORS.background,
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  welcomeTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  welcomeText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  section: {
    padding: 20,
  },
  liveSection: {
    padding: 20,
    backgroundColor: "rgba(255,69,0,0.08)",
    marginHorizontal: 20,
    borderRadius: 15,
  },
  liveSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  liveSectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff4500",
    marginRight: 10,
  },
  liveSectionTitle: {
    color: "#ff4500", // Bright orange for live matches
    fontSize: 18,
    fontWeight: "bold",
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
  noTeamsText: {
    color: COLORS.gray,
    fontSize: 14,
    fontStyle: "italic",
    padding: 10,
  },
  matchCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    position: "relative", // For absolute positioned overlay
  },
  liveMatchCard: {
    borderWidth: 2,
    borderColor: "#ff4500",
  },
  liveOverlayContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
  },
  liveOverlay: {
    backgroundColor: "#ff4500",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
  },
  liveOverlayText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 5,
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
    backgroundColor: COLORS.background, // Add background to ensure visibility
  },
  liveTeamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#ff4500",
    marginBottom: 10,
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
  liveTeamLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ff4500",
    marginBottom: 10,
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
  liveTeamName: {
    fontSize: 18,
  },
  vs: {
    color: COLORS.gray,
    fontSize: 14,
    marginHorizontal: 15,
  },
  liveScoreContainer: {
    alignItems: "center",
    padding: 10,
  },
  liveTime: {
    color: "#ff4500",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  liveScoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff4500",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveScoreText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 5,
  },
  liveScoreSeparator: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
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
  watchLiveButton: {
    marginTop: 15,
    backgroundColor: "#ff4500",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  watchLiveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
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
  // Debug styles
  debugContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'red',
  },
  debugTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugText: {
    color: COLORS.white,
    fontSize: 12,
  },
  debugItem: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 5,
  },
  matchDebug: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,0,0.1)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 5,
  }
});

export default ScheduleMatchScreen;
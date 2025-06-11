"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTournament } from "../contexts/TournamentContext";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import type { MatchEvent } from "../types";
import { useMatchStats } from "../../hooks/useMatchStats";
import MatchStatsPanel from "../../components/MatchStatsPanel";
import LiveMatchTimer from "../../components/LiveMatchTimer";

// Current time from user: 2025-06-11 10:52:15
const CURRENT_TIME = new Date("2025-06-11T10:52:15Z");

const EnhancedLiveMatchScreen: React.FC<{ navigation?: any }> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const {
    tournament,
    matches,
    teams,
    updateMatch,
    updateMatchStatus,
    updateMatchStats,
  } = useTournament();

  // Match selection and data
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<any[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<any[]>([]);

  // Match events and scores
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // Timer states
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [matchStartTime, setMatchStartTime] = useState<Date | null>(null);

  // UI states
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [showStatsView, setShowStatsView] = useState(false);
  const [eventType, setEventType] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // User info
  const [username, setUsername] = useState("vishal-04-singh");

  // Get live matches
  const liveMatches = matches?.filter((match) => match.status === "live") || [];

  // Get current match
  const currentMatch = selectedMatchId
    ? matches?.find((match) => match.id === selectedMatchId)
    : liveMatches[0];

  // Initialize match statistics hook
  const {
    stats,
    updateStat,
    lockStats,
    unlockStats,
    resetStats,
    isLocked: statsLocked,
    lastUpdate,
  } = useMatchStats(currentMatch?.id || null, {
    homeScore,
    awayScore,
    minute: currentMinute,
  });

  // Set up current match logic
  useEffect(() => {
    if (!selectedMatchId && liveMatches.length > 0) {
      setSelectedMatchId(liveMatches[0].id);
    } else if (
      selectedMatchId &&
      !liveMatches.find((m) => m.id === selectedMatchId)
    ) {
      setSelectedMatchId(liveMatches.length > 0 ? liveMatches[0].id : null);
    }
  }, [liveMatches, selectedMatchId]);

  // Load match data and initialize scores
  useEffect(() => {
    if (currentMatch) {
      // Calculate scores from events
      let homeGoals = 0;
      let awayGoals = 0;

      (currentMatch.events || []).forEach((event) => {
        if (event.type === "goal") {
          if (event.team === currentMatch.homeTeamId) {
            homeGoals++;
          } else {
            awayGoals++;
          }
        }
      });

      // Set scores based on events
      setHomeScore(homeGoals);
      setAwayScore(awayGoals);
      setMatchEvents(currentMatch.events || []);

      // Update stats
      updateStat({
        statType: "homeScore",
        team: "home",
        value: homeGoals,
        increment: false,
      });
      updateStat({
        statType: "awayScore",
        team: "away",
        value: awayGoals,
        increment: false,
      });

      // Find teams
      const home = teams?.find(
        (team) =>
          team.id === currentMatch.homeTeamId ||
          team._id === currentMatch.homeTeamId ||
          String(team.id) === String(currentMatch.homeTeamId)
      );

      const away = teams?.find(
        (team) =>
          team.id === currentMatch.awayTeamId ||
          team._id === currentMatch.awayTeamId ||
          String(team.id) === String(currentMatch.awayTeamId)
      );

      setHomeTeam(home);
      setAwayTeam(away);

      // Get players for both teams
      if (home) {
        setHomeTeamPlayers(home.players || []);
      }

      if (away) {
        setAwayTeamPlayers(away.players || []);
      }

      // Set up match timer
      if (currentMatch.date && currentMatch.time) {
        const matchDateTime = new Date(
          `${currentMatch.date}T${currentMatch.time}`
        );
        setMatchStartTime(matchDateTime);
      }

      // Lock stats if match is completed
      if (currentMatch.status === "completed") {
        lockStats();
      } else {
        unlockStats();
      }
    }
  }, [currentMatch, teams, lockStats, unlockStats]);

  // Get username from current user
  useEffect(() => {
    if (user?.name) {
      setUsername(user.name);
    }
  }, [user]);

  // Handle match completion
  useEffect(() => {
    if (currentMatch && currentMatch.status === "completed") {
      lockStats();
    }
  }, [currentMatch?.status, lockStats]);

  // Handle timer updates
  const handleTimeUpdate = (minute: number, seconds: number) => {
    setCurrentMinute(minute);
    setCurrentSeconds(seconds);

    // Update stats minute
    updateStat({
      statType: "minute",
      team: "home", // Not used for minute
      value: minute,
      increment: false,
    });

    // Auto-complete match at 72 minutes as per business requirements
    if (minute >= 72 && currentMatch && currentMatch.status === "live") {
      Alert.alert(
        "Match Time Limit Reached",
        "The match has reached 72 minutes and will be automatically completed. No further updates will be allowed.",
        [
          {
            text: "Complete Match",
            onPress: async () => {
              try {
                await completeMatch();
                Alert.alert(
                  "Match Completed",
                  "The match has been completed successfully. Live updates are now disabled."
                );
              } catch (error) {
                console.error("Error completing match:", error);
                Alert.alert(
                  "Error",
                  "Failed to complete the match. Please try again."
                );
              }
            },
            style: "default",
          },
        ],
        { cancelable: false } // User must acknowledge
      );
    }

    // Show warning when approaching the 72-minute limit
    if (minute === 70 && currentMatch?.status === "live") {
      Alert.alert(
        "Time Warning",
        "Match will automatically complete in 2 minutes. Please finish any pending updates.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  // Toggle half-time
  const handleToggleHalfTime = () => {
    setIsHalfTime(!isHalfTime);
  };

  // Complete match
  const completeMatch = async () => {
    if (!currentMatch || user?.role !== "management") return;

    try {
      await updateMatchStatus(currentMatch.id, "completed", currentMinute);
      lockStats();

      // Close any open modals
      setShowPlayerModal(false);
      setShowSubstitutionModal(false);

      // Show completion message and force navigation back
      Alert.alert(
        "Match Completed",
        "Match completed successfully! No further updates are allowed.",
        [
          {
            text: "OK",
            onPress: () => {
              // Reset all states and navigate back
              setShowPlayerModal(false);
              setShowSubstitutionModal(false);
              setEventType("");
              setSelectedTeam("");
              // Navigate back to previous screen
              navigation?.navigate("LiveMatch");
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error completing match:", error);
      Alert.alert("Error", "Failed to complete match. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  // Handle player selection for events
  const handleSelectPlayerForEvent = (type: string, teamId: string) => {
    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can update match events");
      return;
    }

    // Optional: Check if match is still live
    if (currentMatch?.status !== "live") {
      Alert.alert(
        "Match Ended",
        "You can't update events after the match ends."
      );
      return;
    }

    setEventType(type);
    setSelectedTeam(teamId);
    setShowPlayerModal(true);
  };

  // Handle substitution
  const handleSubstitution = (teamId: string) => {
    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can update match events");
      return;
    }

    // Check if match is still within 72-minute window
    if (currentMinute >= 72) {
      Alert.alert(
        "Match Time Exceeded",
        "Cannot make substitutions after 72 minutes. The match is now completed.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    setSelectedTeam(teamId);
    setShowSubstitutionModal(true);
  };

  // Handle successful event completion and navigation
  const handleEventCompletion = async (eventType: "match" | "substitution") => {
    try {
      // Update match status before completion
      if (currentMatch && updateMatchStatus) {
        await updateMatchStatus(currentMatch.id, "live", currentMinute);
      }

      // Show completion message and handle navigation
      const message =
        eventType === "substitution"
          ? "Substitution added successfully!"
          : "Match event added successfully!";
      Alert.alert("Success", message, [
        {
          text: "OK",
          onPress: () => {
            // Reset state and navigate back
            setShowPlayerModal(false);
            setShowSubstitutionModal(false);
            setEventType("");
            setSelectedTeam("");
            navigation?.navigate("LiveMatch");
          },
        },
      ]);
    } catch (error) {
      console.error("Error completing event:", error);
      Alert.alert("Error", "Failed to complete the action");
    }
  };

  // Track navigation state
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [eventMessage, setEventMessage] = useState("");

  // Handle navigation effect
  useEffect(() => {
    if (shouldNavigate) {
      // Reset navigation state
      setShouldNavigate(false);

      // Show success message and navigate
      Alert.alert(
        "Success",
        eventMessage,
        [
          {
            text: "OK",
            onPress: () => {
              // Ensure we're on the main thread for navigation
              requestAnimationFrame(() => {
                if (navigation?.canGoBack()) {
                  navigation.goBack();
                }
              });
            },
          },
        ],
        { cancelable: false }
      );
    }
  }, [shouldNavigate, eventMessage, navigation]);

  // Add a useEffect to auto-close modals if match exceeds 72 minutes
  useEffect(() => {
    if (currentMinute >= 72) {
      setShowPlayerModal(false);
      setShowSubstitutionModal(false);
    }
  }, [currentMinute]);

  // Process player event (goal, card)
  // Process player event (goal, card)
  const handlePlayerEvent = async (player: any) => {
    if (!currentMatch || !eventType || !selectedTeam) {
        setShowPlayerModal(false);
        return;
    }

    // Check if match is still within 72-minute window
    if (currentMinute >= 72) {
        Alert.alert(
            "Match Time Exceeded",
            "Cannot add events after 72 minutes. The match is now completed.",
            [{ text: "OK", style: "default" }]
        );
        setShowPlayerModal(false);
        return;
    }

    try {
        // Close modal first
        setShowPlayerModal(false);
        setEventType("");
        setSelectedTeam("");

        // Determine which team this event belongs to
        const isHomeTeam =
            selectedTeam === currentMatch.homeTeamId ||
            String(selectedTeam) === String(currentMatch.homeTeamId);

        const isAwayTeam =
            selectedTeam === currentMatch.awayTeamId ||
            String(selectedTeam) === String(currentMatch.awayTeamId);

        // Get the correct team name for the event
        let eventTeamName = "";
        if (isHomeTeam) {
            eventTeamName = homeTeam?.name || "Home Team";
        } else if (isAwayTeam) {
            eventTeamName = awayTeam?.name || "Away Team";
        } else {
            console.error("Team not recognized");
            return;
        }

        const newEvent = {
            id: `event${Date.now()}`,
            type: eventType as
                | "goal"
                | "yellow_card"
                | "red_card"
                | "substitution"
                | "assist",
            playerId: player.id,
            playerName: player.name,
            minute: currentMinute,
            team: selectedTeam, // Store team ID
            teamName: eventTeamName, // Store team name for display
            description: `${player.name} - ${eventType.replace("_", " ")}`,
        };

        // Update local state
        setMatchEvents((prev) => [...prev, newEvent]);

        // Handle goal scoring
        if (eventType === "goal") {
            try {
                let updatedHomeScore = homeScore;
                let updatedAwayScore = awayScore;

                if (isHomeTeam) {
                    updatedHomeScore += 1;
                } else if (isAwayTeam) {
                    updatedAwayScore += 1;
                }

                // Update backend first
                await updateMatch(
                    currentMatch.id,
                    updatedHomeScore,
                    updatedAwayScore,
                    [...matchEvents, newEvent]
                );

                // Update local state
                setHomeScore(updatedHomeScore);
                setAwayScore(updatedAwayScore);

                // Update match status and stats
                await Promise.all([
                    updateMatchStatus(currentMatch.id, "live", currentMinute),
                    updateStat({
                        statType: isHomeTeam ? "homeScore" : "awayScore",
                        team: isHomeTeam ? "home" : "away",
                        value: 1,
                        increment: true,
                    }),
                ]);
            } catch (error) {
                console.error("Error updating score:", error);
                Alert.alert("Error", "Failed to update score. Please try again.");
                setHomeScore(homeScore);
                setAwayScore(awayScore);
                setMatchEvents((prev) => prev.slice(0, -1));
            }
        }

        // Update card statistics
        if (eventType === "yellow_card") {
            updateStat({
                statType: "yellowCards",
                team: isHomeTeam ? "home" : "away",
                value: 1,
                increment: true,
            });
        }

        if (eventType === "red_card") {
            updateStat({
                statType: "redCards",
                team: isHomeTeam ? "home" : "away",
                value: 1,
                increment: true,
            });
        }

        // Update match status for non-goal events
        if (eventType !== "goal") {
            await updateMatchStatus(
                currentMatch.id,
                "live",
                currentMinute,
                newEvent
            );
        }

        // Update statistics in backend
        if (updateMatchStats) {
            await updateMatchStats(currentMatch.id, stats);
        }

        await handleEventCompletion("match");
    } catch (error) {
        console.error("Error adding match event:", error);
        Alert.alert("Error", "Failed to add match event");
    }
};

  // Process substitution
  // Process substitution
  const handleProcessSubstitution = async (outPlayer: any, inPlayer: any) => {
    if (!currentMatch || !selectedTeam) {
      setShowSubstitutionModal(false);
      return;
    }

    try {
      // Normalize IDs to string for comparison to avoid type mismatch
      const selectedTeamId = String(selectedTeam);
      const homeTeamId = String(currentMatch.homeTeamId);
      const awayTeamId = String(currentMatch.awayTeamId);

      // Determine which team this substitution belongs to
      const isHomeTeam = selectedTeamId === homeTeamId;

      // Get the correct team name for the event
      const eventTeamName = isHomeTeam
        ? homeTeam?.name || homeTeamInfo.name || "Home Team"
        : awayTeam?.name || awayTeamInfo.name || "Away Team";

      // Create new substitution event
      const newEvent = {
        id: `event${Date.now()}`,
        type: "substitution" as const,
        playerId: inPlayer.id,
        outPlayerId: outPlayer.id,
        playerName: `${outPlayer.name} → ${inPlayer.name}`,
        minute: currentMinute,
        description: `${outPlayer.name} is replaced by ${inPlayer.name}`,
        team: selectedTeamId,
        teamName: eventTeamName,
      };

      // Debug logs for verification
      console.log("Selected team ID:", selectedTeamId);
      console.log("Home team ID:", homeTeamId);
      console.log("Away team ID:", awayTeamId);
      console.log("Is home team?", isHomeTeam);
      console.log("New Event:", newEvent);

      // Update local state
      setMatchEvents((prev) => [...prev, newEvent]);

      // Update substitution statistics
      updateStat({
        statType: "substitutions",
        team: isHomeTeam ? "home" : "away",
        value: 1,
        increment: true,
      });

      // Update match in backend
      await updateMatchStatus(currentMatch.id, "live", currentMinute, newEvent);

      // Update statistics in backend if applicable
      if (updateMatchStats) {
        await updateMatchStats(currentMatch.id, stats);
      }

      // Success message and navigation
      Alert.alert(
        "Success",
        "Substitution added successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              setShowSubstitutionModal(false);
              setSelectedTeam("");
              navigation?.navigate("LiveMatch");
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Error processing substitution:", error);
      Alert.alert("Error", "Failed to process substitution");
    }
  };

  // Handle statistics updates
  const handleStatsUpdate = (update: any) => {
    const success = updateStat(update);

    if (success && currentMatch && updateMatchStats) {
      // Update backend asynchronously without blocking the UI
      updateMatchStats(currentMatch.id, stats).catch((error) => {
        console.error("Error updating match statistics:", error);
        Alert.alert("Error", "Failed to update statistics in backend");
      });
    }

    return success;
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh tournament data
      if (tournament) {
        // Add refresh logic here
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Get team info
  const getTeamInfo = (teamId: string) => {
    const team = teams?.find(
      (t) =>
        t.id === teamId || t._id === teamId || String(t.id) === String(teamId)
    );

    return {
      name: team?.name || "Unknown Team",
      logo: team?.logo || null,
    };
  };

  // Render player item for selection
  const renderPlayerItem = ({ item: player }: { item: any }) => (
    <TouchableOpacity
      style={styles.playerItem}
      onPress={() => handlePlayerEvent(player)}
    >
      <View style={styles.playerAvatar}>
        {player.photo ? (
          <Image source={{ uri: player.photo }} style={styles.playerPhoto} />
        ) : (
          <Text style={styles.playerNumber}>{player.jerseyNumber}</Text>
        )}
      </View>
      <View style={styles.playerDetails}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.playerPosition}>{player.position}</Text>
      </View>
    </TouchableOpacity>
  );

  // No live matches
  if (!currentMatch) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.dateTime}>
            {CURRENT_TIME.toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            })}
          </Text>
        </View>
        <View style={styles.noMatchContainer}>
          <Ionicons name="football-outline" size={80} color={COLORS.gray} />
          <Text style={styles.noMatchText}>No Live Matches</Text>
          <Text style={styles.noMatchSubtext}>
            Check back when matches are in progress
          </Text>

          {user?.role === "management" && (
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => navigation?.navigate("ScheduleMatch")}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={COLORS.white}
              />
              <Text style={styles.scheduleButtonText}>Schedule Match</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  // Get team info
  const homeTeamInfo = homeTeam
    ? {
        name: homeTeam.name,
        logo: homeTeam.logo,
      }
    : getTeamInfo(currentMatch.homeTeamId);

  const awayTeamInfo = awayTeam
    ? {
        name: awayTeam.name,
        logo: awayTeam.logo,
      }
    : getTeamInfo(currentMatch.awayTeamId);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.userInfo}>
        <Text style={styles.username}>@{username}</Text>
        <Text style={styles.dateTime}>
          {CURRENT_TIME.toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </Text>
      </View>

      {/* Match selector for multiple live matches */}
      {liveMatches.length > 1 && (
        <View style={styles.matchSelector}>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowMatchSelector(!showMatchSelector)}
          >
            <Text style={styles.selectorButtonText}>
              {currentMatch
                ? `${homeTeamInfo.name} vs ${awayTeamInfo.name}`
                : "Select Match"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.white} />
          </TouchableOpacity>

          {showMatchSelector && (
            <View style={styles.matchesList}>
              {liveMatches.map((match) => {
                const home = getTeamInfo(match.homeTeamId);
                const away = getTeamInfo(match.awayTeamId);
                return (
                  <TouchableOpacity
                    key={match.id}
                    style={[
                      styles.matchOption,
                      currentMatch?.id === match.id &&
                        styles.selectedMatchOption,
                    ]}
                    onPress={() => {
                      setSelectedMatchId(match.id);
                      setShowMatchSelector(false);
                    }}
                  >
                    <Text style={styles.matchOptionText}>
                      {home.name} vs {away.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Live Match Timer */}
      <LiveMatchTimer
        matchStartTime={matchStartTime}
        isHalfTime={isHalfTime}
        onTimeUpdate={handleTimeUpdate}
        onToggleHalfTime={handleToggleHalfTime}
        isManagement={user?.role === "management"}
        matchStatus={currentMatch.status}
      />

      {/* Team scores and logos */}
      <View style={styles.scoreSection}>
        <View style={styles.teamSection}>
          {homeTeamInfo.logo ? (
            <Image
              source={{ uri: homeTeamInfo.logo }}
              style={styles.teamLogo}
            />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamLogoText}>
                {homeTeamInfo.name.charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.teamName}>{homeTeamInfo.name}</Text>
          <Text style={styles.teamLabel}>HOME</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{homeScore}</Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={styles.score}>{awayScore}</Text>
        </View>

        <View style={styles.teamSection}>
          {awayTeamInfo.logo ? (
            <Image
              source={{ uri: awayTeamInfo.logo }}
              style={styles.teamLogo}
            />
          ) : (
            <View style={styles.teamLogoPlaceholder}>
              <Text style={styles.teamLogoText}>
                {awayTeamInfo.name.charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.teamName}>{awayTeamInfo.name}</Text>
          <Text style={styles.teamLabel}>AWAY</Text>
        </View>
      </View>

      {/* Match info */}
      <View style={styles.matchInfo}>
        <Text style={styles.venue}>
          📍 {currentMatch.venue || "Football Arena"}
        </Text>
        <Text style={styles.date}>
          {currentMatch.date || "2025-06-11"} • {currentMatch.time || "10:52"}
        </Text>
        {lastUpdate && (
          <Text style={styles.lastUpdate}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* View Toggle Buttons */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !showStatsView && styles.activeToggleButton,
          ]}
          onPress={() => setShowStatsView(false)}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={!showStatsView ? COLORS.black : COLORS.white}
          />
          <Text
            style={[
              styles.toggleButtonText,
              !showStatsView && styles.activeToggleButtonText,
            ]}
          >
            Events
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            showStatsView && styles.activeToggleButton,
          ]}
          onPress={() => setShowStatsView(true)}
        >
          <Ionicons
            name="stats-chart-outline"
            size={20}
            color={showStatsView ? COLORS.black : COLORS.white}
          />
          <Text
            style={[
              styles.toggleButtonText,
              showStatsView && styles.activeToggleButtonText,
            ]}
          >
            Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Statistics or Events View */}
      {showStatsView ? (
        <MatchStatsPanel
          stats={stats}
          onUpdateStat={handleStatsUpdate}
          isLocked={statsLocked}
          isManagement={user?.role === "management"}
        />
      ) : (
        <View>
          {/* Management controls with time remaining indicator */}
          {user?.role === "management" && currentMatch?.status === "live" && (
            <View style={styles.managementControls}>
              <View style={styles.controlsHeader}>
                <Text style={styles.controlsTitle}>Match Controls</Text>
                <View style={styles.timeRemainingContainer}>
                  <Text style={styles.timeRemainingLabel}>Time Remaining:</Text>
                  <Text
                    style={[
                      styles.timeRemainingValue,
                      currentMinute >= 70 && styles.timeRemainingWarning,
                    ]}
                  >
                    {Math.max(0, 72 - currentMinute)}m {60 - currentSeconds}s
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${Math.min(100, (currentMinute / 72) * 100)}%` },
                    currentMinute >= 70 && styles.progressBarWarning,
                  ]}
                />
                <Text style={styles.progressText}>
                  {currentMinute >= 72
                    ? "Match Completed"
                    : `${Math.floor((currentMinute / 72) * 100)}% Complete`}
                </Text>
              </View>

              {/* Event buttons section */}
              <Text style={styles.controlSubtitle}>Home Team Events</Text>
              <View style={styles.eventButtons}>
                <TouchableOpacity
                  style={[styles.eventButton, styles.goalButton]}
                  onPress={() =>
                    handleSelectPlayerForEvent("goal", currentMatch.homeTeamId)
                  }
                >
                  <Ionicons name="football" size={20} color={COLORS.white} />
                  <Text style={styles.eventButtonText}>Goal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.cardButton]}
                  onPress={() =>
                    handleSelectPlayerForEvent(
                      "yellow_card",
                      currentMatch.homeTeamId
                    )
                  }
                >
                  <View style={styles.yellowCard} />
                  <Text style={styles.eventButtonText}>Yellow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.redCardButton]}
                  onPress={() =>
                    handleSelectPlayerForEvent(
                      "red_card",
                      currentMatch.homeTeamId
                    )
                  }
                >
                  <View style={styles.redCard} />
                  <Text style={styles.eventButtonText}>Red</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.subButton]}
                  onPress={() => handleSubstitution(currentMatch.homeTeamId)}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.eventButtonText}>Sub</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.controlSubtitle}>Away Team Events</Text>
              <View style={styles.eventButtons}>
                <TouchableOpacity
                  style={[styles.eventButton, styles.goalButton]}
                  onPress={() =>
                    handleSelectPlayerForEvent("goal", currentMatch.awayTeamId)
                  }
                >
                  <Ionicons name="football" size={20} color={COLORS.white} />
                  <Text style={styles.eventButtonText}>Goal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.cardButton]}
                  onPress={() =>
                    handleSelectPlayerForEvent(
                      "yellow_card",
                      currentMatch.awayTeamId
                    )
                  }
                >
                  <View style={styles.yellowCard} />
                  <Text style={styles.eventButtonText}>Yellow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.redCardButton]}
                  onPress={() =>
                    handleSelectPlayerForEvent(
                      "red_card",
                      currentMatch.awayTeamId
                    )
                  }
                >
                  <View style={styles.redCard} />
                  <Text style={styles.eventButtonText}>Red</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.subButton]}
                  onPress={() => handleSubstitution(currentMatch.awayTeamId)}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.eventButtonText}>Sub</Text>
                </TouchableOpacity>
              </View>

              {/* Match completion button */}
              {currentMatch.status === "live" && (
                <TouchableOpacity
                  style={styles.completeMatchButton}
                  onPress={completeMatch}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.completeMatchButtonText}>
                    Complete Match
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Match events */}
          <View style={styles.eventsSection}>
            <View style={styles.eventsSectionHeader}>
              <Text style={styles.eventsTitle}>Match Events</Text>
              <View style={styles.eventCount}>
                <Text style={styles.eventCountText}>
                  {matchEvents ? matchEvents.length : 0}
                </Text>
              </View>
            </View>

            {!matchEvents || matchEvents.length === 0 ? (
              <Text style={styles.noEventsText}>No events yet</Text>
            ) : (
              matchEvents.map((event, index) => (
                <View key={index} style={styles.eventItem}>
                  <View style={styles.eventTime}>
                    <Text style={styles.eventMinute}>{event.minute}'</Text>
                  </View>
                  <View style={styles.eventIcon}>
                    {event.type === "goal" && (
                      <Ionicons
                        name="football"
                        size={16}
                        color={COLORS.green}
                      />
                    )}
                    {event.type === "yellow_card" && (
                      <View style={styles.smallYellowCard} />
                    )}
                    {event.type === "red_card" && (
                      <View style={styles.smallRedCard} />
                    )}
                    {event.type === "substitution" && (
                      <Ionicons
                        name="swap-horizontal"
                        size={16}
                        color={COLORS.blue}
                      />
                    )}
                  </View>
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventPlayer}>{event.playerName}</Text>
                    <Text style={styles.eventType}>
                      {event.type.replace("_", " ").toUpperCase()}
                    </Text>
                    <Text style={styles.eventTeam}>
                      {event.teamName ||
                        (event.team === currentMatch.homeTeamId
                          ? homeTeamInfo.name
                          : awayTeamInfo.name)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* Player Selection Modal */}
      <Modal
        visible={showPlayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlayerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Select Player for{" "}
              {eventType === "goal"
                ? "Goal"
                : eventType === "yellow_card"
                ? "Yellow Card"
                : "Red Card"}
            </Text>

            <FlatList
              data={
                selectedTeam === currentMatch?.homeTeamId
                  ? homeTeamPlayers
                  : awayTeamPlayers
              }
              renderItem={renderPlayerItem}
              keyExtractor={(item) => item.id}
              style={styles.playerList}
              ListEmptyComponent={
                <Text style={styles.noPlayersText}>No players available</Text>
              }
            />

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowPlayerModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Substitution Modal */}
      <Modal
        visible={showSubstitutionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubstitutionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Player to Substitute</Text>

            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>Players On Field</Text>
              <FlatList
                data={(selectedTeam === currentMatch?.homeTeamId
                  ? homeTeamPlayers
                  : awayTeamPlayers
                ).filter((p) => !p.isSubstitute)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playerItem}
                    onPress={() => {
                      const outPlayer = item;
                      const substitutes = (
                        selectedTeam === currentMatch?.homeTeamId
                          ? homeTeamPlayers
                          : awayTeamPlayers
                      ).filter((p) => p.isSubstitute);

                      Alert.alert(
                        "Select Substitute",
                        `Select player to replace ${outPlayer.name}`,
                        [
                          ...substitutes.map((sub) => ({
                            text: `${sub.jerseyNumber} - ${sub.name}`,
                            onPress: () =>
                              handleProcessSubstitution(outPlayer, sub),
                          })),
                          { text: "Cancel", style: "cancel" },
                        ]
                      );
                    }}
                  >
                    <View style={styles.playerAvatar}>
                      {item.photo ? (
                        <Image
                          source={{ uri: item.photo }}
                          style={styles.playerPhoto}
                        />
                      ) : (
                        <Text style={styles.playerNumber}>
                          {item.jerseyNumber}
                        </Text>
                      )}
                    </View>
                    <View style={styles.playerDetails}>
                      <Text style={styles.playerName}>{item.name}</Text>
                      <Text style={styles.playerPosition}>{item.position}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                style={styles.playerList}
                ListEmptyComponent={
                  <Text style={styles.noPlayersText}>No players available</Text>
                }
              />
            </View>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowSubstitutionModal(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  userInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.background,
  },
  username: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  dateTime: {
    color: COLORS.gray,
    fontSize: 12,
  },
  matchSelector: {
    position: "relative",
    zIndex: 100,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: COLORS.background,
    marginVertical: 1,
  },
  selectorButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  matchesList: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  matchOption: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  selectedMatchOption: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  matchOptionText: {
    color: COLORS.white,
    fontSize: 14,
  },
  noMatchContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 400,
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
  scheduleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  scheduleButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
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
  teamLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  teamLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  teamLogoText: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: "bold",
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
  lastUpdate: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 5,
    fontStyle: "italic",
  },
  viewToggle: {
    flexDirection: "row",
    margin: 20,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
  },
  activeToggleButton: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  activeToggleButtonText: {
    color: COLORS.black,
  },
  managementControls: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 15,
  },
  controlsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  controlsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  timeRemainingContainer: {
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  timeRemainingLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginRight: 6,
  },
  timeRemainingValue: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
  timeRemainingWarning: {
    color: "#ff4500",
  },
  progressBarContainer: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    height: 20,
    overflow: "hidden",
    position: "relative",
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    backgroundColor: COLORS.primary,
    transition: "width 0.3s ease",
  },
  progressBarWarning: {
    backgroundColor: "#ff4500",
  },
  progressText: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 20,
  },
  controlSubtitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
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
    minWidth: "22%",
    justifyContent: "center",
  },
  goalButton: {
    backgroundColor: "#4CAF50",
  },
  cardButton: {
    backgroundColor: "#FFA500",
  },
  redCardButton: {
    backgroundColor: COLORS.red,
  },
  subButton: {
    backgroundColor: "#2196F3",
  },
  eventButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
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
  completeMatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  completeMatchButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  eventsSection: {
    margin: 20,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 15,
  },
  eventsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  eventsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  eventCount: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  eventCountText: {
    color: COLORS.black,
    fontWeight: "bold",
  },
  noEventsText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    padding: 20,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
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
  eventTeam: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 2,
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
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  playerList: {
    maxHeight: 400,
  },
  playerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.black,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  playerNumber: {
    color: COLORS.black,
    fontWeight: "bold",
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  playerPosition: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 2,
  },
  noPlayersText: {
    color: COLORS.gray,
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    padding: 20,
  },
  cancelModalButton: {
    backgroundColor: COLORS.gray,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginTop: 10,
  },
  cancelModalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  subSection: {
    marginBottom: 15,
  },
  subSectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
});

export default EnhancedLiveMatchScreen;

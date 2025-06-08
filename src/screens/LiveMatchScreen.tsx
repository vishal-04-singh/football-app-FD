"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTournament } from "../contexts/TournamentContext";
import { COLORS } from "../constants/colors";
import type { MatchEvent } from "../types";
import { Ionicons } from "@expo/vector-icons";

// Use dynamic current time instead of hardcoded
const getCurrentUTCDateTime = () => new Date();
const CURRENT_USERNAME = "vishal-04-singh";

// Get Indian time using your method
const getIndianTime = (date: Date) => {
  const indianOffset = 5.5 * 60 * 60 * 1000; // 5 hours and 30 minutes in milliseconds
  return new Date(date.getTime() + indianOffset);
};

// Format for Indian time display
const formatIndianTime = (date: Date) => {
  const indianTime = getIndianTime(date);
  return indianTime.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });
};

// Match timing configuration (45+15+45 format for realistic football)
const FIRST_HALF_DURATION = 45 * 60 * 1000; // 45 minutes in milliseconds
const HALF_TIME_DURATION = 15 * 60 * 1000; // 15 minutes halftime
const SECOND_HALF_DURATION = 45 * 60 * 1000; // 45 minutes in milliseconds
const EXTRA_TIME_BUFFER = 10 * 60 * 1000; // 10 minutes potential extra time
const TOTAL_MATCH_DURATION =
  FIRST_HALF_DURATION + HALF_TIME_DURATION + SECOND_HALF_DURATION;

const LiveMatchScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { tournament, matches, teams, updateMatch, updateMatchStatus } =
    useTournament();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [matchStatus, setMatchStatus] = useState("not_started");
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [eventType, setEventType] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [homeTeam, setHomeTeam] = useState(null);
  const [awayTeam, setAwayTeam] = useState(null);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState([]);
  const [username, setUsername] = useState(CURRENT_USERNAME);
  const [currentTime, setCurrentTime] = useState(getCurrentUTCDateTime());
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Timer refs
  const timerInterval = useRef(null);
  const matchStartTime = useRef(null);
  const halfTimeStartTime = useRef(null);
  const currentTimeRef = useRef(getCurrentUTCDateTime());
  const isExtraTime = useRef(false);
  const lastMatchId = useRef(null);
  const isComponentMounted = useRef(true);

  // Focus listener to prevent disappearing when coming back
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      console.log('Screen focused - refreshing match data');
      setHasInitialized(false); // Force re-initialization
      if (selectedMatchId) {
        lastMatchId.current = null; // Reset to force reload
      }
    });

    return unsubscribe;
  }, [navigation, selectedMatchId]);

  // Update current time every second
  useEffect(() => {
    const timeUpdateInterval = setInterval(() => {
      if (isComponentMounted.current) {
        const newTime = getCurrentUTCDateTime();
        setCurrentTime(newTime);
        currentTimeRef.current = newTime;
      }
    }, 1000);

    return () => {
      clearInterval(timeUpdateInterval);
      isComponentMounted.current = false;
    };
  }, []);

  // Get live matches with better filtering and persistence
  const liveMatches = useCallback(() => {
    if (!matches) return [];
    
    return matches.filter((match) => {
      // Always include matches with "live" status
      if (match.status === "live") return true;
      
      // Include matches that were recently live or should be live
      if (match.date && match.time && match.status !== "completed") {
        const [year, month, day] = match.date.split("-").map(Number);
        const [hours, minutes] = match.time.split(":").map(Number);
        const matchDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        const now = getCurrentUTCDateTime();
        const timeDiff = now.getTime() - matchDateTime.getTime();
        
        // Include matches that started in the last 4 hours (extended for persistence)
        return timeDiff >= 0 && timeDiff <= (4 * 60 * 60 * 1000);
      }
      
      // Include the currently selected match if it exists (prevent disappearing)
      if (selectedMatchId && match.id === selectedMatchId) {
        return match.status !== "completed";
      }
      
      return false;
    });
  }, [matches, selectedMatchId])();

  // Enhanced match selection logic with persistence
  useEffect(() => {
    if (!hasInitialized && matches) {
      console.log('Initializing match selection');
      
      // If we have a selected match, check if it still exists and is valid
      if (selectedMatchId) {
        const currentSelected = matches.find(m => m.id === selectedMatchId);
        if (currentSelected && currentSelected.status !== "completed") {
          console.log('Keeping current match:', selectedMatchId);
          setHasInitialized(true);
          return;
        }
      }
      
      // Find the best match to select
      if (liveMatches.length > 0) {
        const bestMatch = liveMatches.find(m => m.status === "live") || liveMatches[0];
        console.log('Selecting new match:', bestMatch.id);
        setSelectedMatchId(bestMatch.id);
      } else {
        console.log('No live matches found');
        setSelectedMatchId(null);
      }
      
      setHasInitialized(true);
    }
  }, [matches, liveMatches, selectedMatchId, hasInitialized]);

  // Get current match with fallback
  const currentMatch = useCallback(() => {
    if (!selectedMatchId || !matches) return null;
    
    const match = matches.find((match) => match.id === selectedMatchId);
    if (!match) {
      // If selected match not found, try to get from live matches
      return liveMatches[0] || null;
    }
    
    return match;
  }, [selectedMatchId, matches, liveMatches])();

  // Load match data - enhanced with better state management
  useEffect(() => {
    if (currentMatch && currentMatch.id !== lastMatchId.current && !isUpdating && hasInitialized) {
      console.log("Loading match data for:", currentMatch.id);
      lastMatchId.current = currentMatch.id;
      
      setHomeScore(currentMatch.homeScore || 0);
      setAwayScore(currentMatch.awayScore || 0);
      setMatchEvents(currentMatch.events || []);

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

      if (home) setHomeTeamPlayers(home.players || []);
      if (away) setAwayTeamPlayers(away.players || []);

      // Set up match timer
      if (currentMatch.date && currentMatch.time) {
        const [year, month, day] = currentMatch.date.split("-").map(Number);
        const [hours, minutes] = currentMatch.time.split(":").map(Number);
        const matchDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        matchStartTime.current = matchDateTime;

        // Determine initial match status
        const now = getCurrentUTCDateTime();
        const timeDiff = now.getTime() - matchDateTime.getTime();
        
        if (currentMatch.status === "completed") {
          setMatchStatus("completed");
        } else if (timeDiff < 0) {
          setMatchStatus("not_started");
        } else if (currentMatch.status === "live" || timeDiff >= 0) {
          setMatchStatus("live");
          startTimer();
        }
      }
    }
  }, [currentMatch?.id, teams, isUpdating, hasInitialized]);

  // Sync with updated match data from context - but don't reload everything
  useEffect(() => {
    if (currentMatch && !isUpdating && currentMatch.id === lastMatchId.current && hasInitialized) {
      // Only update if values have actually changed
      if (currentMatch.homeScore !== homeScore) {
        setHomeScore(currentMatch.homeScore || 0);
      }
      if (currentMatch.awayScore !== awayScore) {
        setAwayScore(currentMatch.awayScore || 0);
      }
      if (JSON.stringify(currentMatch.events) !== JSON.stringify(matchEvents)) {
        setMatchEvents(currentMatch.events || []);
      }
    }
  }, [currentMatch?.homeScore, currentMatch?.awayScore, currentMatch?.events, isUpdating, hasInitialized]);

  // Get username from current user
  useEffect(() => {
    if (user?.name) {
      setUsername(user.name);
    } else {
      setUsername(CURRENT_USERNAME);
    }
  }, [user]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  // Start the match timer
  const startTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    timerInterval.current = setInterval(() => {
      if (isComponentMounted.current) {
        updateMatchTime();
      }
    }, 1000);
  };

  // Update match time display
  const updateMatchTime = () => {
    if (!matchStartTime.current) return;

    const now = currentTimeRef.current;
    let elapsedMs = now.getTime() - matchStartTime.current.getTime();

    // If match hasn't started yet, show countdown or waiting
    if (elapsedMs < 0) {
      setCurrentMinute(0);
      setCurrentSeconds(0);
      setMatchStatus("not_started");
      return;
    }

    // Match has started
    if (matchStatus === "not_started") {
      setMatchStatus("live");
    }

    // Check for half time (between 45 and 60 minutes)
    if (
      elapsedMs >= FIRST_HALF_DURATION &&
      elapsedMs < FIRST_HALF_DURATION + HALF_TIME_DURATION
    ) {
      if (!isHalfTime) {
        setIsHalfTime(true);
        setMatchStatus("half_time");
        halfTimeStartTime.current = new Date(
          matchStartTime.current.getTime() + FIRST_HALF_DURATION
        );
      }
      setCurrentMinute(45);
      setCurrentSeconds(0);
      return;
    }

    // If we're past half time, subtract the half time duration
    if (elapsedMs >= FIRST_HALF_DURATION + HALF_TIME_DURATION) {
      elapsedMs -= HALF_TIME_DURATION;
      if (isHalfTime) {
        setIsHalfTime(false);
        setMatchStatus("live");
      }
    }

    // Calculate minutes and seconds
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Check if we're in extra time (after 90 minutes)
    const totalMatchMs = FIRST_HALF_DURATION + SECOND_HALF_DURATION;
    if (elapsedMs > totalMatchMs) {
      isExtraTime.current = true;
      const extraTimeMs = elapsedMs - totalMatchMs;
      const extraTimeMinutes = Math.floor(extraTimeMs / 1000 / 60);
      const extraTimeSeconds = Math.floor((extraTimeMs / 1000) % 60);

      setCurrentMinute(90 + extraTimeMinutes);
      setCurrentSeconds(extraTimeSeconds);

      // Auto-complete match after extra time buffer
      if (extraTimeMs > EXTRA_TIME_BUFFER && matchStatus === "live") {
        setMatchStatus("completed");
        if (timerInterval.current) {
          clearInterval(timerInterval.current);
        }
      }
    } else if (minutes < 45) {
      // First half
      setCurrentMinute(minutes);
      setCurrentSeconds(seconds);
    } else {
      // Second half
      setCurrentMinute(45 + (minutes - 45));
      setCurrentSeconds(seconds);
    }
  };

  // Get team name and logo
  const getTeamInfo = (teamId) => {
    const team = teams?.find(
      (t) =>
        t.id === teamId || t._id === teamId || String(t.id) === String(teamId)
    );

    return {
      name: team?.name || "Unknown Team",
      logo: team?.logo || null,
    };
  };

  // Handle player selection for events
  const handleSelectPlayerForEvent = (type, teamId) => {
    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can update match events");
      return;
    }

    setEventType(type);
    setSelectedTeam(teamId);
    setShowPlayerModal(true);
  };

  // Handle substitution
  const handleSubstitution = (teamId) => {
    if (user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can update match events");
      return;
    }

    setSelectedTeam(teamId);
    setShowSubstitutionModal(true);
  };

  // Process player event (goal, card) - IMPROVED VERSION
  const handlePlayerEvent = async (player) => {
    if (!currentMatch || !eventType || !selectedTeam) {
      setShowPlayerModal(false);
      return;
    }

    console.log("Adding event:", eventType, "for player:", player.name);
    
    // Set updating state to prevent unwanted re-renders
    setIsUpdating(true);

    try {
      const newEvent = {
        id: `event${Date.now()}`,
        type: eventType,
        playerId: player.id,
        playerName: player.name,
        minute: currentMinute,
        description: `${player.name} - ${eventType.replace("_", " ")}`,
      };

      // Close modal immediately for better UX
      setShowPlayerModal(false);
      setEventType("");
      setSelectedTeam("");

      // Update local state first for immediate UI feedback
      const updatedEvents = [...matchEvents, newEvent];
      setMatchEvents(updatedEvents);

      // Update score for goals
      let updatedHomeScore = homeScore;
      let updatedAwayScore = awayScore;

      if (eventType === "goal") {
        if (selectedTeam === currentMatch.homeTeamId) {
          updatedHomeScore += 1;
          setHomeScore(updatedHomeScore);
        } else {
          updatedAwayScore += 1;
          setAwayScore(updatedAwayScore);
        }
      }

      // Update match in backend
      try {
        if (eventType === "goal") {
          await updateMatch(currentMatch.id, updatedHomeScore, updatedAwayScore, updatedEvents);
        } else {
          // For cards, use updateMatchStatus but ensure status remains "live"
          await updateMatchStatus(currentMatch.id, "live", currentMinute, newEvent);
        }

        console.log("Match updated successfully");
        
        // Show success message with shorter duration
        Alert.alert(
          "Success!", 
          `${eventType === "goal" ? "Goal" : eventType.replace("_", " ")} added successfully!`,
          [{ text: "OK", onPress: () => console.log("Alert dismissed") }],
          { cancelable: true }
        );

      } catch (updateError) {
        console.error("Error updating match:", updateError);
        // Revert local changes if backend update fails
        setMatchEvents(matchEvents);
        if (eventType === "goal") {
          setHomeScore(homeScore);
          setAwayScore(awayScore);
        }
        Alert.alert("Error", "Failed to update match. Changes reverted.");
      }
    } catch (error) {
      console.error("Error adding match event:", error);
      Alert.alert("Error", "Failed to add match event");
    } finally {
      // Always reset updating state after a short delay
      setTimeout(() => {
        if (isComponentMounted.current) {
          setIsUpdating(false);
          console.log("Update state reset");
        }
      }, 1000);
    }
  };

  // Process substitution - IMPROVED VERSION
  const handleProcessSubstitution = async (outPlayer, inPlayer) => {
    if (!currentMatch || !selectedTeam) {
      setShowSubstitutionModal(false);
      return;
    }

    setIsUpdating(true);

    try {
      const newEvent = {
        id: `event${Date.now()}`,
        type: "substitution",
        playerId: inPlayer.id,
        outPlayerId: outPlayer.id,
        playerName: `${outPlayer.name} → ${inPlayer.name}`,
        minute: currentMinute,
        description: `${outPlayer.name} is replaced by ${inPlayer.name}`,
        team: selectedTeam,
      };

      setShowSubstitutionModal(false);
      setSelectedTeam("");

      const updatedEvents = [...matchEvents, newEvent];
      setMatchEvents(updatedEvents);

      // Update match - explicitly keep it live
      await updateMatchStatus(currentMatch.id, "live", currentMinute, newEvent);

      Alert.alert("Success", "Substitution added successfully!");
    } catch (error) {
      console.error("Error processing substitution:", error);
      // Revert local changes
      setMatchEvents(matchEvents);
      Alert.alert("Error", "Failed to process substitution. Changes reverted.");
    } finally {
      setTimeout(() => {
        if (isComponentMounted.current) {
          setIsUpdating(false);
        }
      }, 1000);
    }
  };

  // Complete/finish the match
  const completeMatch = async () => {
    if (!currentMatch || user?.role !== "management") {
      Alert.alert("Access Denied", "Only management can complete matches");
      return;
    }

    Alert.alert("Complete Match", "Are you sure you want to end this match?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Match",
        style: "destructive",
        onPress: async () => {
          setIsUpdating(true);
          try {
            await updateMatchStatus(currentMatch.id, "completed", currentMinute, null);
            setMatchStatus("completed");
            if (timerInterval.current) {
              clearInterval(timerInterval.current);
            }
            Alert.alert("Success", "Match completed!");
            // Don't navigate back immediately, let user see the completed state
            setTimeout(() => {
              navigation?.goBack();
            }, 2000);
          } catch (error) {
            console.error("Error completing match:", error);
            Alert.alert("Error", "Failed to complete the match");
          } finally {
            setIsUpdating(false);
          }
        },
      },
    ]);
  };

  // Format time display with minutes and seconds
  const formatTime = () => {
    if (matchStatus === "not_started") {
      return "00:00";
    }
    
    if (isHalfTime || matchStatus === "half_time") {
      return "HT";
    }

    if (matchStatus === "completed") {
      return "FT";
    }

    if (isExtraTime.current) {
      return `${currentMinute}'+${currentSeconds.toString().padStart(2, "0")}`;
    } else {
      return `${currentMinute}:${currentSeconds.toString().padStart(2, "0")}`;
    }
  };

  // Get live status text
  const getLiveStatusText = () => {
    switch (matchStatus) {
      case "not_started":
        return "STARTING SOON";
      case "half_time":
        return "HALF TIME";
      case "completed":
        return "FULL TIME";
      default:
        return "LIVE";
    }
  };

  // Get live status color
  const getLiveStatusColor = () => {
    switch (matchStatus) {
      case "not_started":
        return "#FFA500"; // Orange
      case "half_time":
        return "#9C27B0"; // Purple
      case "completed":
        return "#4CAF50"; // Green
      default:
        return COLORS.red; // Red for live
    }
  };

  // Toggle half-time manually
  const toggleHalfTime = () => {
    if (!isHalfTime) {
      setIsHalfTime(true);
      setMatchStatus("half_time");
      halfTimeStartTime.current = currentTimeRef.current;
    } else {
      setIsHalfTime(false);
      setMatchStatus("live");
      if (halfTimeStartTime.current) {
        const halfTimeElapsed =
          currentTimeRef.current.getTime() - halfTimeStartTime.current.getTime();
        matchStartTime.current = new Date(
          matchStartTime.current.getTime() - (halfTimeElapsed - HALF_TIME_DURATION)
        );
      }
    }
  };

  // Start match manually
  const startMatch = () => {
    if (matchStatus === "not_started") {
      matchStartTime.current = getCurrentUTCDateTime();
      setMatchStatus("live");
      startTimer();
      Alert.alert("Match Started", "The match has been started manually");
    }
  };

  // Render player item for selection
  const renderPlayerItem = ({ item: player }) => (
    <TouchableOpacity
      style={styles.playerItem}
      onPress={() => handlePlayerEvent(player)}
      disabled={isUpdating}
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

  // Loading Overlay Component
  const LoadingOverlay = () => {
    if (!isUpdating) return null;
    
    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Updating match...</Text>
        </View>
      </View>
    );
  };

  // Don't render anything until initialization is complete
  if (!hasInitialized) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // No live matches
  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.dateTime}>
            {formatIndianTime(currentTime)} (IST)
          </Text>
        </View>
        <View style={styles.noMatchContainer}>
          <Ionicons name="football-outline" size={80} color={COLORS.gray} />
          <Text style={styles.noMatchText}>No Live Matches</Text>
          <Text style={styles.noMatchSubtext}>
            Check back when matches are in progress
          </Text>
        </View>
      </View>
    );
  }

  // Get team info
  const homeTeamInfo = homeTeam
    ? { name: homeTeam.name, logo: homeTeam.logo }
    : getTeamInfo(currentMatch.homeTeamId);

  const awayTeamInfo = awayTeam
    ? { name: awayTeam.name, logo: awayTeam.logo }
    : getTeamInfo(currentMatch.awayTeamId);

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.userInfo}>
          <Text style={styles.username}>@{username}</Text>
          <Text style={styles.dateTime}>{formatIndianTime(currentTime)} (IST)</Text>
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
                        currentMatch?.id === match.id && styles.selectedMatchOption,
                      ]}
                      onPress={() => {
                        setSelectedMatchId(match.id);
                        setShowMatchSelector(false);
                        if (timerInterval.current) {
                          clearInterval(timerInterval.current);
                        }
                        matchStartTime.current = null;
                        halfTimeStartTime.current = null;
                        setIsHalfTime(false);
                        isExtraTime.current = false;
                        lastMatchId.current = null; // Reset to force reload
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

        {/* Match header with live status */}
        <View style={styles.matchHeader}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: getLiveStatusColor() }]} />
            <Text style={[styles.liveText, { color: getLiveStatusColor() }]}>
              {getLiveStatusText()}
            </Text>
          </View>
          <Text style={styles.matchTime}>{formatTime()}</Text>
        </View>

        {/* Team scores and logos */}
        <View style={styles.scoreSection}>
          <View style={styles.teamSection}>
            {homeTeamInfo.logo ? (
              <Image source={{ uri: homeTeamInfo.logo }} style={styles.teamLogo} />
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
              <Image source={{ uri: awayTeamInfo.logo }} style={styles.teamLogo} />
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
            {currentMatch.date || "2025-06-08"} • {currentMatch.time || "21:01"}
          </Text>
        </View>

        {/* Status banners */}
        {matchStatus === "not_started" && (
          <View style={styles.notStartedBanner}>
            <Ionicons name="time-outline" size={20} color={COLORS.white} />
            <Text style={styles.bannerText}>MATCH STARTING SOON</Text>
          </View>
        )}

        {(isHalfTime || matchStatus === "half_time") && (
          <View style={styles.halfTimeBanner}>
            <Ionicons name="time-outline" size={20} color={COLORS.white} />
            <Text style={styles.halfTimeText}>HALF-TIME BREAK</Text>
          </View>
        )}

        {isExtraTime.current && matchStatus === "live" && !isHalfTime && (
          <View style={styles.extraTimeBanner}>
            <Ionicons name="alarm-outline" size={20} color={COLORS.white} />
            <Text style={styles.extraTimeText}>EXTRA TIME</Text>
          </View>
        )}

        {/* Management controls */}
        {user?.role === "management" && (
          <View style={styles.managementControls}>
            <Text style={styles.controlsTitle}>Match Controls</Text>

            {/* Match start button */}
            {matchStatus === "not_started" && (
              <TouchableOpacity style={styles.startMatchButton} onPress={startMatch}>
                <Ionicons name="play" size={20} color={COLORS.white} />
                <Text style={styles.startMatchButtonText}>Start Match</Text>
              </TouchableOpacity>
            )}

            {/* Time controls - only show when match is live */}
            {(matchStatus === "live" || matchStatus === "half_time") && (
              <>
                <View style={styles.minuteControl}>
                  <Text style={styles.minuteLabel}>Current Time:</Text>
                  <View style={styles.minuteButtons}>
                    <TouchableOpacity
                      style={styles.minuteButton}
                      onPress={() => setCurrentMinute(Math.max(0, currentMinute - 1))}
                    >
                      <Text style={styles.minuteButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.minuteDisplay}>
                      {currentMinute}:{currentSeconds.toString().padStart(2, "0")}
                    </Text>
                    <TouchableOpacity
                      style={styles.minuteButton}
                      onPress={() => {
                        setCurrentMinute(currentMinute + 1);
                        if (currentMinute >= 90) {
                          isExtraTime.current = true;
                        }
                      }}
                    >
                      <Text style={styles.minuteButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Half-time toggle */}
                <TouchableOpacity
                  style={[
                    styles.halfTimeButton,
                    (isHalfTime || matchStatus === "half_time") && styles.activeHalfTimeButton,
                  ]}
                  onPress={toggleHalfTime}
                >
                  <Ionicons
                    name={isHalfTime ? "play" : "pause"}
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.halfTimeButtonText}>
                    {isHalfTime ? "Resume Match" : "Half-Time Break"}
                  </Text>
                </TouchableOpacity>

                {/* Event buttons - only show when match is live (not during half-time) */}
                {matchStatus === "live" && (
                  <>
                    <Text style={styles.controlSubtitle}>Home Team Events</Text>
                    <View style={styles.eventButtons}>
                      <TouchableOpacity
                        style={[styles.eventButton, styles.goalButton]}
                        onPress={() =>
                          handleSelectPlayerForEvent("goal", currentMatch.homeTeamId)
                        }
                        disabled={isUpdating}
                      >
                        <Ionicons name="football" size={20} color={COLORS.white} />
                        <Text style={styles.eventButtonText}>Goal</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.eventButton, styles.cardButton]}
                        onPress={() =>
                          handleSelectPlayerForEvent("yellow_card", currentMatch.homeTeamId)
                        }
                        disabled={isUpdating}
                      >
                        <View style={styles.yellowCard} />
                        <Text style={styles.eventButtonText}>Yellow Card</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.eventButton, styles.redCardButton]}
                        onPress={() =>
                          handleSelectPlayerForEvent("red_card", currentMatch.homeTeamId)
                        }
                        disabled={isUpdating}
                      >
                        <View style={styles.redCard} />
                        <Text style={styles.eventButtonText}>Red Card</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.eventButton, styles.subButton]}
                        onPress={() => handleSubstitution(currentMatch.homeTeamId)}
                        disabled={isUpdating}
                      >
                        <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
                        <Text style={styles.eventButtonText}>Substitution</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.controlSubtitle}>Away Team Events</Text>
                    <View style={styles.eventButtons}>
                      <TouchableOpacity
                        style={[styles.eventButton, styles.goalButton]}
                        onPress={() =>
                          handleSelectPlayerForEvent("goal", currentMatch.awayTeamId)
                        }
                        disabled={isUpdating}
                      >
                        <Ionicons name="football" size={20} color={COLORS.white} />
                        <Text style={styles.eventButtonText}>Goal</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.eventButton, styles.cardButton]}
                        onPress={() =>
                          handleSelectPlayerForEvent("yellow_card", currentMatch.awayTeamId)
                        }
                        disabled={isUpdating}
                      >
                        <View style={styles.yellowCard} />
                        <Text style={styles.eventButtonText}>Yellow Card</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.eventButton, styles.redCardButton]}
                        onPress={() =>
                          handleSelectPlayerForEvent("red_card", currentMatch.awayTeamId)
                        }
                        disabled={isUpdating}
                      >
                        <View style={styles.redCard} />
                        <Text style={styles.eventButtonText}>Red Card</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.eventButton, styles.subButton]}
                        onPress={() => handleSubstitution(currentMatch.awayTeamId)}
                        disabled={isUpdating}
                      >
                        <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
                        <Text style={styles.eventButtonText}>Substitution</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Action buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={completeMatch}
                    disabled={isUpdating}
                  >
                    <Text style={styles.completeButtonText}>Complete Match</Text>
                  </TouchableOpacity>
                </View>
              </>
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
              <View key={event.id || index} style={styles.eventItem}>
                <View style={styles.eventTime}>
                  <Text style={styles.eventMinute}>{event.minute}'</Text>
                </View>
                <View style={styles.eventIcon}>
                  {event.type === "goal" && (
                    <Ionicons name="football" size={16} color={COLORS.green} />
                  )}
                  {event.type === "yellow_card" && (
                    <View style={styles.smallYellowCard} />
                  )}
                  {event.type === "red_card" && (
                    <View style={styles.smallRedCard} />
                  )}
                  {event.type === "substitution" && (
                    <Ionicons name="swap-horizontal" size={16} color={COLORS.blue} />
                  )}
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventPlayer}>{event.playerName}</Text>
                  <Text style={styles.eventType}>
                    {event.type.replace("_", " ").toUpperCase()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

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
                          substitutes
                            .map((sub) => ({
                              text: `${sub.jerseyNumber} - ${sub.name}`,
                              onPress: () => handleProcessSubstitution(outPlayer, sub),
                            }))
                            .concat([{ text: "Cancel", style: "cancel" }])
                        );
                      }}
                      disabled={isUpdating}
                    >
                      <View style={styles.playerAvatar}>
                        {item.photo ? (
                          <Image source={{ uri: item.photo }} style={styles.playerPhoto} />
                        ) : (
                          <Text style={styles.playerNumber}>{item.jerseyNumber}</Text>
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
      
      {/* Loading Overlay */}
      <LoadingOverlay />
    </>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: COLORS.background,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
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
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  liveText: {
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
  notStartedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFA500", // Orange
    padding: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  bannerText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  halfTimeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9C27B0", // Purple
    padding: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  halfTimeText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  extraTimeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5722", // Deep Orange
    padding: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 10,
  },
  extraTimeText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
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
  startMatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50", // Green
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  startMatchButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  controlSubtitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10,
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
    minWidth: 60,
    textAlign: "center",
  },
  halfTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3F51B5", // Indigo
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  activeHalfTimeButton: {
    backgroundColor: "#9C27B0", // Purple
  },
  halfTimeButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
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
    backgroundColor: "#4CAF50", // Green
  },
  cardButton: {
    backgroundColor: "#FFA500", // Orange
  },
  redCardButton: {
    backgroundColor: COLORS.red,
  },
  subButton: {
    backgroundColor: "#2196F3", // Blue
  },
  eventButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
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
  actionButtons: {
    marginTop: 10,
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  updateButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  completeButton: {
    backgroundColor: "#4CAF50", // Green
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
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
export default LiveMatchScreen;
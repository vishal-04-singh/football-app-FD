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
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTournament } from "../contexts/TournamentContext";
import { COLORS } from "../constants/colors";
import type { MatchEvent } from "../types";
import { Ionicons } from "@expo/vector-icons";

// Current time from user: 2025-06-07 19:15:21
const CURRENT_TIME = new Date("2025-06-07T19:15:21Z");

const LiveMatchScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { tournament, matches, teams, updateMatch, updateMatchStatus } = useTournament();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [eventType, setEventType] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [homeTeam, setHomeTeam] = useState(null);
  const [awayTeam, setAwayTeam] = useState(null);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState([]);
  const [username, setUsername] = useState('vishal-04-singh');

  // Timer refs
  const timerInterval = useRef(null);
  const matchStartTime = useRef(null);
  const halfTimeStartTime = useRef(null);
  const currentTimeRef = useRef(CURRENT_TIME);
  const halfTimeDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

  // Get live matches
  const liveMatches = matches?.filter((match) => match.status === "live") || [];
  
  // Set up current match logic
  useEffect(() => {
    // If no match is selected but live matches exist, select the first one
    if (!selectedMatchId && liveMatches.length > 0) {
      setSelectedMatchId(liveMatches[0].id);
    }
    // If selected match is not in live matches anymore, reset selection
    else if (selectedMatchId && !liveMatches.find(m => m.id === selectedMatchId)) {
      setSelectedMatchId(liveMatches.length > 0 ? liveMatches[0].id : null);
    }
  }, [liveMatches, selectedMatchId]);

  // Get current match
  const currentMatch = selectedMatchId 
    ? matches?.find((match) => match.id === selectedMatchId)
    : liveMatches[0];

  // Load match data
  useEffect(() => {
    if (currentMatch) {
      setHomeScore(currentMatch.homeScore || 0);
      setAwayScore(currentMatch.awayScore || 0);
      setMatchEvents(currentMatch.events || []);
      
      // Find teams
      const home = teams?.find((team) => 
        team.id === currentMatch.homeTeamId || 
        team._id === currentMatch.homeTeamId ||
        String(team.id) === String(currentMatch.homeTeamId)
      );
      
      const away = teams?.find((team) => 
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
        const matchDateTime = new Date(`${currentMatch.date}T${currentMatch.time}`);
        matchStartTime.current = matchDateTime;
        
        // Start timer
        startTimer();
        
        // Check if match is in half-time
        checkHalfTime();
      }
    }
  }, [currentMatch, teams]);
  
  // Get username from current user
  useEffect(() => {
    if (user?.name) {
      setUsername(user.name);
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
      // Update current time
      currentTimeRef.current = new Date(currentTimeRef.current.getTime() + 1000);
      
      // Update match time display
      updateMatchTime();
    }, 1000);
  };
  
  // Check if match is in half-time period
  const checkHalfTime = () => {
    if (!matchStartTime.current) return;
    
    const elapsedMs = currentTimeRef.current.getTime() - matchStartTime.current.getTime();
    
    // Check for half time (between 45 and 60 minutes)
    if (elapsedMs >= 30 * 60 * 1000 && elapsedMs < (30 * 60 * 1000) + halfTimeDuration) {
      setIsHalfTime(true);
      if (!halfTimeStartTime.current) {
        halfTimeStartTime.current = new Date(matchStartTime.current.getTime() + 30 * 60 * 1000);
      }
    } else if (elapsedMs >= (30 * 60 * 1000) + halfTimeDuration) {
      setIsHalfTime(false);
    }
  };
  
  // Update match time display
  const updateMatchTime = () => {
    if (!matchStartTime.current) return;
    
    let elapsedMs = currentTimeRef.current.getTime() - matchStartTime.current.getTime();
    
    // Check for half time
    if (elapsedMs >= 45 * 60 * 1000 && elapsedMs < (45 * 60 * 1000) + halfTimeDuration) {
      if (!isHalfTime) {
        setIsHalfTime(true);
        halfTimeStartTime.current = new Date(matchStartTime.current.getTime() + 45 * 60 * 1000);
      }
      setCurrentMinute(45);
      setCurrentSeconds(0);
      return;
    }
    
    // If we're past half time, subtract the half time duration
    if (elapsedMs >= (45 * 60 * 1000) + halfTimeDuration) {
      elapsedMs -= halfTimeDuration;
      if (isHalfTime) {
        setIsHalfTime(false);
      }
    }
    
    // Calculate minutes and seconds
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Update state for display
    setCurrentMinute(Math.min(minutes, 90));
    setCurrentSeconds(seconds);
  };

  // Get team name and logo
  const getTeamInfo = (teamId) => {
    const team = teams?.find((t) => 
      t.id === teamId || 
      t._id === teamId || 
      String(t.id) === String(teamId)
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
  
  // Process player event (goal, card)
  const handlePlayerEvent = async (player) => {
    if (!currentMatch || !eventType || !selectedTeam) {
      setShowPlayerModal(false);
      return;
    }
    
    try {
      const newEvent = {
        id: `event${Date.now()}`,
        type: eventType,
        playerId: player.id,
        playerName: player.name,
        minute: currentMinute,
        description: `${player.name} - ${eventType.replace("_", " ")}`,
      };
      
      // Update local state
      setMatchEvents((prev) => [...prev, newEvent]);
      
      // Update score for goals
      if (eventType === "goal") {
        if (selectedTeam === currentMatch.homeTeamId) {
          setHomeScore((prev) => prev + 1);
        } else {
          setAwayScore((prev) => prev + 1);
        }
      }
      
      // Update match in backend
      if (eventType === "goal") {
        let updatedHomeScore = homeScore;
        let updatedAwayScore = awayScore;
        
        if (selectedTeam === currentMatch.homeTeamId) {
          updatedHomeScore += 1;
        } else {
          updatedAwayScore += 1;
        }
        
        await updateMatch(
          currentMatch.id,
          updatedHomeScore,
          updatedAwayScore,
          [...matchEvents, newEvent]
        );
      } else {
        await updateMatchStatus(
          currentMatch.id,
          "live",
          currentMinute,
          newEvent
        );
      }
      
      setShowPlayerModal(false);
      setEventType("");
      setSelectedTeam("");
      
      Alert.alert("Success", "Match event added successfully!");
    } catch (error) {
      console.error("Error adding match event:", error);
      Alert.alert("Error", "Failed to add match event");
    }
  };
  
  // Process substitution
  const handleProcessSubstitution = async (outPlayer, inPlayer) => {
    if (!currentMatch || !selectedTeam) {
      setShowSubstitutionModal(false);
      return;
    }
    
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
      
      // Update local state
      setMatchEvents((prev) => [...prev, newEvent]);
      
      // Update match in backend
      await updateMatchStatus(
        currentMatch.id,
        "live",
        currentMinute,
        newEvent
      );
      
      setShowSubstitutionModal(false);
      setSelectedTeam("");
      
      Alert.alert("Success", "Substitution added successfully!");
    } catch (error) {
      console.error("Error processing substitution:", error);
      Alert.alert("Error", "Failed to process substitution");
    }
  };

  // Update match score and events
  const updateMatchScore = async () => {
    if (!currentMatch || user?.role !== "management") return;

    try {
      await updateMatch(currentMatch.id, homeScore, awayScore, matchEvents);
      Alert.alert("Success", "Match updated successfully!");
    } catch (error) {
      console.error("Error updating match:", error);
      Alert.alert("Error", "Failed to update match");
    }
  };
  
  // Format time display with minutes and seconds
  const formatTime = () => {
    if (isHalfTime) return "HT";
    return `${currentMinute}:${currentSeconds.toString().padStart(2, '0')}`;
  };
  
  // Toggle half-time manually
  const toggleHalfTime = () => {
    if (!isHalfTime) {
      // Start half-time
      setIsHalfTime(true);
      halfTimeStartTime.current = new Date();
    } else {
      // End half-time
      setIsHalfTime(false);
      if (halfTimeStartTime.current) {
        // Calculate actual half-time duration
        const halfTimeElapsed = currentTimeRef.current.getTime() - halfTimeStartTime.current.getTime();
        // Adjust match start time to account for the half-time
        matchStartTime.current = new Date(matchStartTime.current.getTime() - (halfTimeElapsed - halfTimeDuration));
      }
    }
  };

  // Render player item for selection
  const renderPlayerItem = ({ item: player }) => (
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
      <View style={styles.container}>
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
          <Text style={styles.noMatchSubtext}>Check back when matches are in progress</Text>
        </View>
      </View>
    );
  }
  
  // Get team info
  const homeTeamInfo = homeTeam ? {
    name: homeTeam.name,
    logo: homeTeam.logo
  } : getTeamInfo(currentMatch.homeTeamId);
  
  const awayTeamInfo = awayTeam ? {
    name: awayTeam.name,
    logo: awayTeam.logo
  } : getTeamInfo(currentMatch.awayTeamId);

  return (
    <ScrollView style={styles.container}>
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
              {currentMatch ? `${homeTeamInfo.name} vs ${awayTeamInfo.name}` : "Select Match"}
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
                      // Reset timer and half-time status
                      if (timerInterval.current) {
                        clearInterval(timerInterval.current);
                      }
                      matchStartTime.current = null;
                      halfTimeStartTime.current = null;
                      setIsHalfTime(false);
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
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
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
              <Text style={styles.teamLogoText}>{homeTeamInfo.name.charAt(0)}</Text>
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
              <Text style={styles.teamLogoText}>{awayTeamInfo.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.teamName}>{awayTeamInfo.name}</Text>
          <Text style={styles.teamLabel}>AWAY</Text>
        </View>
      </View>

      {/* Match info */}
      <View style={styles.matchInfo}>
        <Text style={styles.venue}>📍 {currentMatch.venue || "Football Arena"}</Text>
        <Text style={styles.date}>
          {currentMatch.date || "2025-06-07"} • {currentMatch.time || "19:15"}
        </Text>
      </View>

      {/* Half-time banner */}
      {isHalfTime && (
        <View style={styles.halfTimeBanner}>
          <Ionicons name="time-outline" size={20} color={COLORS.white} />
          <Text style={styles.halfTimeText}>HALF-TIME BREAK</Text>
        </View>
      )}

      {/* Management controls */}
      {user?.role === "management" && (
        <View style={styles.managementControls}>
          <Text style={styles.controlsTitle}>Match Controls</Text>

          {/* Time controls */}
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
                {currentMinute}:{currentSeconds.toString().padStart(2, '0')}
              </Text>
              <TouchableOpacity 
                style={styles.minuteButton} 
                onPress={() => setCurrentMinute(Math.min(90, currentMinute + 1))}
              >
                <Text style={styles.minuteButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Half-time toggle */}
          <TouchableOpacity
            style={[styles.halfTimeButton, isHalfTime && styles.activeHalfTimeButton]}
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

          {/* Event buttons section */}
          <Text style={styles.controlSubtitle}>Home Team Events</Text>
          <View style={styles.eventButtons}>
            <TouchableOpacity
              style={[styles.eventButton, styles.goalButton]}
              onPress={() => handleSelectPlayerForEvent("goal", currentMatch.homeTeamId)}
            >
              <Ionicons name="football" size={20} color={COLORS.white} />
              <Text style={styles.eventButtonText}>Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.cardButton]}
              onPress={() => handleSelectPlayerForEvent("yellow_card", currentMatch.homeTeamId)}
            >
              <View style={styles.yellowCard} />
              <Text style={styles.eventButtonText}>Yellow Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.redCardButton]}
              onPress={() => handleSelectPlayerForEvent("red_card", currentMatch.homeTeamId)}
            >
              <View style={styles.redCard} />
              <Text style={styles.eventButtonText}>Red Card</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.eventButton, styles.subButton]}
              onPress={() => handleSubstitution(currentMatch.homeTeamId)}
            >
              <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
              <Text style={styles.eventButtonText}>Substitution</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.controlSubtitle}>Away Team Events</Text>
          <View style={styles.eventButtons}>
            <TouchableOpacity
              style={[styles.eventButton, styles.goalButton]}
              onPress={() => handleSelectPlayerForEvent("goal", currentMatch.awayTeamId)}
            >
              <Ionicons name="football" size={20} color={COLORS.white} />
              <Text style={styles.eventButtonText}>Goal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.cardButton]}
              onPress={() => handleSelectPlayerForEvent("yellow_card", currentMatch.awayTeamId)}
            >
              <View style={styles.yellowCard} />
              <Text style={styles.eventButtonText}>Yellow Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.eventButton, styles.redCardButton]}
              onPress={() => handleSelectPlayerForEvent("red_card", currentMatch.awayTeamId)}
            >
              <View style={styles.redCard} />
              <Text style={styles.eventButtonText}>Red Card</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.eventButton, styles.subButton]}
              onPress={() => handleSubstitution(currentMatch.awayTeamId)}
            >
              <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
              <Text style={styles.eventButtonText}>Substitution</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.updateButton} 
            onPress={updateMatchScore}
          >
            <Text style={styles.updateButtonText}>Update Match</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Match events */}
      <View style={styles.eventsSection}>
        <View style={styles.eventsSectionHeader}>
          <Text style={styles.eventsTitle}>Match Events</Text>
          <View style={styles.eventCount}>
            <Text style={styles.eventCountText}>{matchEvents ? matchEvents.length : 0}</Text>
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
              Select Player for {eventType === "goal" ? "Goal" : 
                eventType === "yellow_card" ? "Yellow Card" : "Red Card"}
            </Text>
            
            <FlatList
              data={selectedTeam === currentMatch?.homeTeamId ? homeTeamPlayers : awayTeamPlayers}
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
                data={(selectedTeam === currentMatch?.homeTeamId ? homeTeamPlayers : awayTeamPlayers)
                  .filter(p => !p.isSubstitute)}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.playerItem}
                    onPress={() => {
                      // Store the outgoing player and show subs
                      const outPlayer = item;
                      const substitutes = (selectedTeam === currentMatch?.homeTeamId ? homeTeamPlayers : awayTeamPlayers)
                        .filter(p => p.isSubstitute);
                      
                      // Show another modal for selecting the incoming player
                      Alert.alert(
                        "Select Substitute",
                        `Select player to replace ${outPlayer.name}`,
                        substitutes.map(sub => ({
                          text: `${sub.jerseyNumber} - ${sub.name}`,
                          onPress: () => handleProcessSubstitution(outPlayer, sub)
                        })).concat([
                          { text: "Cancel", style: "cancel" }
                        ])
                      );
                    }}
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
  updateButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
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
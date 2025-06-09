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

// Current time from user: 2025-06-09 09:21:40
const CURRENT_TIME = new Date("2025-06-09T09:21:40Z");

const EnhancedLiveMatchScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { tournament, matches, teams, updateMatch, updateMatchStatus, updateMatchStats } = useTournament();
  
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
  const [username, setUsername] = useState('vishal-04-singh');

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
    lastUpdate
  } = useMatchStats(currentMatch?.id || null, {
    homeScore,
    awayScore,
    minute: currentMinute,
  });

  // Set up current match logic
  useEffect(() => {
    if (!selectedMatchId && liveMatches.length > 0) {
      setSelectedMatchId(liveMatches[0].id);
    }
    else if (selectedMatchId && !liveMatches.find(m => m.id === selectedMatchId)) {
      setSelectedMatchId(liveMatches.length > 0 ? liveMatches[0].id : null);
    }
  }, [liveMatches, selectedMatchId]);

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
        setMatchStartTime(matchDateTime);
      }

      // Lock stats if match is completed
      if (currentMatch.status === 'completed') {
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
    if (currentMatch && currentMatch.status === 'completed') {
      lockStats();
    }
  }, [currentMatch?.status, lockStats]);

  // Handle timer updates
  const handleTimeUpdate = (minute: number, seconds: number) => {
    setCurrentMinute(minute);
    setCurrentSeconds(seconds);
    
    // Update stats minute
    updateStat({
      statType: 'minute',
      team: 'home', // Not used for minute
      value: minute,
      increment: false
    });

    // Auto-complete match at 90+ minutes (can be overridden by management)
    if (minute >= 95 && currentMatch && currentMatch.status === 'live') {
      Alert.alert(
        "Match Time",
        "Match has reached 95+ minutes. Complete the match?",
        [
          { text: "Continue", style: "cancel" },
          { 
            text: "Complete Match", 
            onPress: () => completeMatch(),
            style: "destructive" 
          }
        ]
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
      Alert.alert("Success", "Match completed successfully!");
    } catch (error) {
      console.error("Error completing match:", error);
      Alert.alert("Error", "Failed to complete match");
    }
  };

  // Handle player selection for events
  const handleSelectPlayerForEvent = (type: string, teamId: string) => {
  if (user?.role !== "management") {
    Alert.alert("Access Denied", "Only management can update match events");
    return;
  }

  // Optional: Check if match is still live
  if (currentMatch?.status !== 'live') {
    Alert.alert("Match Ended", "You can't update events after the match ends.");
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
    
    setSelectedTeam(teamId);
    setShowSubstitutionModal(true);
  };
  
  // Process player event (goal, card)
  const handlePlayerEvent = async (player: any) => {
    if (!currentMatch || !eventType || !selectedTeam) {
      setShowPlayerModal(false);
      return;
    }
    
    try {
      const newEvent = {
        id: `event${Date.now()}`,
        type: eventType as "goal" | "yellow_card" | "red_card" | "substitution" | "assist",
        playerId: player.id,
        playerName: player.name,
        minute: currentMinute,
        description: `${player.name} - ${eventType.replace("_", " ")}`,
      };
      
      // Update local state
      setMatchEvents((prev) => [...prev, newEvent]);
      
      // Update scores and statistics
      if (eventType === "goal") {
        if (selectedTeam === currentMatch.homeTeamId) {
          const newHomeScore = homeScore + 1;
          setHomeScore(newHomeScore);
          updateStat({
            statType: 'homeScore',
            team: 'home',
            value: newHomeScore,
            increment: false
          });
        } else {
          const newAwayScore = awayScore + 1;
          setAwayScore(newAwayScore);
          updateStat({
            statType: 'awayScore',
            team: 'away',
            value: newAwayScore,
            increment: false
          });
        }
      }

      // Update card statistics
      if (eventType === "yellow_card") {
        updateStat({
          statType: 'yellowCards',
          team: selectedTeam === currentMatch.homeTeamId ? 'home' : 'away',
          value: 1,
          increment: true
        });
      }

      if (eventType === "red_card") {
        updateStat({
          statType: 'redCards',
          team: selectedTeam === currentMatch.homeTeamId ? 'home' : 'away',
          value: 1,
          increment: true
        });
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

      // Update statistics in backend
      if (updateMatchStats) {
        await updateMatchStats(currentMatch.id, stats);
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
  const handleProcessSubstitution = async (outPlayer: any, inPlayer: any) => {
    if (!currentMatch || !selectedTeam) {
      setShowSubstitutionModal(false);
      return;
    }
    
    try {
      const newEvent = {
        id: `event${Date.now()}`,
        type: "substitution" as const,
        playerId: inPlayer.id,
        outPlayerId: outPlayer.id,
        playerName: `${outPlayer.name} → ${inPlayer.name}`,
        minute: currentMinute,
        description: `${outPlayer.name} is replaced by ${inPlayer.name}`,
        team: selectedTeam,
      };
      
      // Update local state
      setMatchEvents((prev) => [...prev, newEvent]);

      // Update substitution statistics
      updateStat({
        statType: 'substitutions',
        team: selectedTeam === currentMatch.homeTeamId ? 'home' : 'away',
        value: 1,
        increment: true
      });
      
      // Update match in backend
      await updateMatchStatus(
        currentMatch.id,
        "live",
        currentMinute,
        newEvent
      );

      // Update statistics in backend
      if (updateMatchStats) {
        await updateMatchStats(currentMatch.id, stats);
      }
      
      setShowSubstitutionModal(false);
      setSelectedTeam("");
      
      Alert.alert("Success", "Substitution added successfully!");
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
      updateMatchStats(currentMatch.id, stats).catch(error => {
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
          <Text style={styles.noMatchSubtext}>Check back when matches are in progress</Text>
          
          {user?.role === "management" && (
            <TouchableOpacity 
              style={styles.scheduleButton}
              onPress={() => navigation?.navigate("ScheduleMatch")}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
              <Text style={styles.scheduleButtonText}>Schedule Match</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
          {currentMatch.date || "2025-06-09"} • {currentMatch.time || "09:21"}
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
          style={[styles.toggleButton, !showStatsView && styles.activeToggleButton]}
          onPress={() => setShowStatsView(false)}
        >
          <Ionicons name="list-outline" size={20} color={!showStatsView ? COLORS.black : COLORS.white} />
          <Text style={[styles.toggleButtonText, !showStatsView && styles.activeToggleButtonText]}>
            Events
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toggleButton, showStatsView && styles.activeToggleButton]}
          onPress={() => setShowStatsView(true)}
        >
          <Ionicons name="stats-chart-outline" size={20} color={showStatsView ? COLORS.black : COLORS.white} />
          <Text style={[styles.toggleButtonText, showStatsView && styles.activeToggleButtonText]}>
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
          {/* Management controls */}
          {user?.role === "management" && (
            <View style={styles.managementControls}>
              <Text style={styles.controlsTitle}>Match Controls</Text>

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
                  <Text style={styles.eventButtonText}>Yellow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.redCardButton]}
                  onPress={() => handleSelectPlayerForEvent("red_card", currentMatch.homeTeamId)}
                >
                  <View style={styles.redCard} />
                  <Text style={styles.eventButtonText}>Red</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.eventButton, styles.subButton]}
                  onPress={() => handleSubstitution(currentMatch.homeTeamId)}
                >
                  <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
                  <Text style={styles.eventButtonText}>Sub</Text>
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
                  <Text style={styles.eventButtonText}>Yellow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.eventButton, styles.redCardButton]}
                  onPress={() => handleSelectPlayerForEvent("red_card", currentMatch.awayTeamId)}
                >
                  <View style={styles.redCard} />
                  <Text style={styles.eventButtonText}>Red</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.eventButton, styles.subButton]}
                  onPress={() => handleSubstitution(currentMatch.awayTeamId)}
                >
                  <Ionicons name="swap-horizontal" size={20} color={COLORS.white} />
                  <Text style={styles.eventButtonText}>Sub</Text>
                </TouchableOpacity>
              </View>

              {/* Match completion button */}
              {currentMatch.status === 'live' && (
                <TouchableOpacity 
                  style={styles.completeMatchButton} 
                  onPress={completeMatch}
                >
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.completeMatchButtonText}>Complete Match</Text>
                </TouchableOpacity>
              )}
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
                      const outPlayer = item;
                      const substitutes = (selectedTeam === currentMatch?.homeTeamId ? homeTeamPlayers : awayTeamPlayers)
                        .filter(p => p.isSubstitute);
                      
                      Alert.alert(
                        "Select Substitute",
                        `Select player to replace ${outPlayer.name}`,
                        [
                          ...substitutes.map(sub => ({
                            text: `${sub.jerseyNumber} - ${sub.name}`,
                            onPress: () => handleProcessSubstitution(outPlayer, sub)
                          })),
                          { text: "Cancel", style: "cancel" }
                        ]
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
    fontStyle: 'italic',
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
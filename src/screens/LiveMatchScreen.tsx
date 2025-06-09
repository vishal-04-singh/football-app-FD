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
  Animated,
  Easing,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTournament } from "../contexts/TournamentContext";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";

const LiveMatchScreen: React.FC<{ navigation: any; route?: any }> = ({ 
  navigation, 
  route 
}) => {
  // Safe parameter extraction with fallback
  const matchId = route?.params?.matchId;
  
  const { user } = useAuth();
  const { matches, teams, updateMatchScore, completeMatch, refreshData } = useTournament();
  
  // Find the current match
  const [currentMatch, setCurrentMatch] = useState(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchTime, setMatchTime] = useState(0); // in minutes
  const [isMatchActive, setIsMatchActive] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Animation for live indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Timer for match time
  const intervalRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log("LiveMatchScreen - Route params:", route?.params);
    console.log("LiveMatchScreen - Match ID:", matchId);
    console.log("LiveMatchScreen - Available matches:", matches?.length);
  }, [route, matchId, matches]);

  useEffect(() => {
    // Check if matchId exists
    if (!matchId) {
      console.error("No matchId provided in route params");
      setLoading(false);
      return;
    }

    // Find the match by ID
    if (matches && matches.length > 0) {
      const match = matches.find(m => {
        const id1 = String(m.id || m._id);
        const id2 = String(matchId);
        console.log("Comparing match IDs:", id1, "vs", id2);
        return id1 === id2;
      });
      
      console.log("Found match:", match);
      
      if (match) {
        setCurrentMatch(match);
        setHomeScore(match.homeScore || 0);
        setAwayScore(match.awayScore || 0);
        
        // Calculate elapsed time if match has started
        if (match.startTime) {
          const elapsed = Math.floor((Date.now() - new Date(match.startTime).getTime()) / (1000 * 60));
          setMatchTime(elapsed);
        }
        
        // Check if match is still active
        setIsMatchActive(match.status === "live");
      } else {
        console.log("Match not found with ID:", matchId);
        console.log("Available match IDs:", matches.map(m => ({ id: m.id, _id: m._id })));
      }
      setLoading(false);
    }
  }, [matchId, matches]);

  useEffect(() => {
    // Start live indicator animation
    if (isMatchActive) {
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
    }
  }, [isMatchActive]);

  useEffect(() => {
    // Start match timer
    if (isMatchActive) {
      intervalRef.current = setInterval(() => {
        setMatchTime(prev => prev + 1);
      }, 60000); // Update every minute
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isMatchActive]);

  const getTeamInfo = (teamId: string) => {
    if (!teamId || !teams) return { name: "Unknown Team", logo: null };
    
    const team = teams.find(t => 
      t.id === teamId || 
      t._id === teamId || 
      String(t.id) === String(teamId) || 
      String(t._id) === String(teamId)
    );

    return team ? { name: team.name, logo: team.logo } : { name: "Unknown Team", logo: null };
  };

  const updateScore = (team: 'home' | 'away', increment: number) => {
    if (!currentMatch || !isMatchActive) return;
    
    if (team === 'home') {
      const newScore = Math.max(0, homeScore + increment);
      setHomeScore(newScore);
      // Call context function if it exists
      if (updateMatchScore) {
        updateMatchScore(matchId, newScore, awayScore);
      }
    } else {
      const newScore = Math.max(0, awayScore + increment);
      setAwayScore(newScore);
      // Call context function if it exists
      if (updateMatchScore) {
        updateMatchScore(matchId, homeScore, newScore);
      }
    }
  };

  const handleCompleteMatch = () => {
    Alert.alert(
      "Complete Match",
      "Are you sure you want to complete this match?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "destructive",
          onPress: () => {
            setIsMatchActive(false);
            // Call context function if it exists
            if (completeMatch) {
              completeMatch(matchId, homeScore, awayScore);
            }
            Alert.alert("Success", "Match completed successfully!", [
              { text: "OK", onPress: () => navigation.goBack() }
            ]);
          }
        }
      ]
    );
  };

  const formatTime = (minutes: number) => {
    if (minutes <= 45) {
      return `${minutes}'`;
    } else if (minutes <= 60) {
      return "HT";
    } else if (minutes <= 105) {
      return `${minutes - 15}'`; // Account for halftime
    } else {
      return `${minutes}'`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Loading Match...</Text>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="football-outline" size={60} color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading match details...</Text>
        </View>
      </View>
    );
  }

  // No match ID provided
  if (!matchId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Error</Text>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.red} />
          <Text style={styles.errorText}>No match ID provided</Text>
          <Text style={styles.errorSubtext}>
            Please go back and select a match to view
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Match not found
  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Match Not Found</Text>
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.gray} />
          <Text style={styles.errorText}>Match not found</Text>
          <Text style={styles.errorSubtext}>
            Match ID: {matchId}
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={async () => {
              await refreshData();
              navigation.goBack();
            }}
          >
            <Text style={styles.errorButtonText}>Refresh & Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const homeTeam = getTeamInfo(currentMatch.homeTeamId);
  const awayTeam = getTeamInfo(currentMatch.awayTeamId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Live Match</Text>
        <View style={styles.headerRight}>
          {isMatchActive && (
            <Animated.View
              style={[
                styles.liveIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Match Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusText}>
              {isMatchActive ? "LIVE" : "COMPLETED"}
            </Text>
            <Text style={styles.timeText}>
              {isMatchActive ? formatTime(matchTime) : "FT"}
            </Text>
          </View>
          <Text style={styles.venueText}>📍 {currentMatch.venue}</Text>
          <Text style={styles.dateText}>
            {new Date(currentMatch.date).toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric", 
              month: "long",
              day: "numeric"
            })}
          </Text>
        </View>

        {/* Score Display */}
        <View style={styles.scoreCard}>
          {/* Home Team */}
          <View style={styles.teamSection}>
            {homeTeam.logo ? (
              <Image
                source={{ uri: homeTeam.logo }}
                style={styles.teamLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.teamLogoPlaceholder}>
                <Text style={styles.teamLogoText}>
                  {homeTeam.name.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={styles.teamName}>{homeTeam.name}</Text>
            <Text style={styles.teamLabel}>HOME</Text>
          </View>

          {/* Score */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreText}>{homeScore}</Text>
              <Text style={styles.scoreSeparator}>-</Text>
              <Text style={styles.scoreText}>{awayScore}</Text>
            </View>
          </View>

          {/* Away Team */}
          <View style={styles.teamSection}>
            {awayTeam.logo ? (
              <Image
                source={{ uri: awayTeam.logo }}
                style={styles.teamLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.teamLogoPlaceholder}>
                <Text style={styles.teamLogoText}>
                  {awayTeam.name.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={styles.teamName}>{awayTeam.name}</Text>
            <Text style={styles.teamLabel}>AWAY</Text>
          </View>
        </View>

        {/* Score Controls - Only for Management */}
        {user?.role === "management" && isMatchActive && (
          <View style={styles.controlsCard}>
            <Text style={styles.controlsTitle}>Score Controls</Text>
            
            {/* Home Team Controls */}
            <View style={styles.teamControls}>
              <Text style={styles.controlsTeamName}>{homeTeam.name}</Text>
              <View style={styles.scoreControls}>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateScore('home', -1)}
                >
                  <Ionicons name="remove" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.controlsScore}>{homeScore}</Text>
                <TouchableOpacity
                  style={[styles.scoreButton, styles.addButton]}
                  onPress={() => updateScore('home', 1)}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Away Team Controls */}
            <View style={styles.teamControls}>
              <Text style={styles.controlsTeamName}>{awayTeam.name}</Text>
              <View style={styles.scoreControls}>
                <TouchableOpacity
                  style={styles.scoreButton}
                  onPress={() => updateScore('away', -1)}
                >
                  <Ionicons name="remove" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.controlsScore}>{awayScore}</Text>
                <TouchableOpacity
                  style={[styles.scoreButton, styles.addButton]}
                  onPress={() => updateScore('away', 1)}
                >
                  <Ionicons name="add" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Complete Match Button */}
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleCompleteMatch}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.completeButtonText}>Complete Match</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Match Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Match Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Match ID:</Text>
            <Text style={styles.infoValue}>{matchId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Week:</Text>
            <Text style={styles.infoValue}>Week {currentMatch.week}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue:</Text>
            <Text style={styles.infoValue}>{currentMatch.venue}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled Time:</Text>
            <Text style={styles.infoValue}>{currentMatch.time}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[
              styles.infoValue,
              { color: isMatchActive ? "#ff4500" : "#4CAF50" }
            ]}>
              {isMatchActive ? "LIVE" : "COMPLETED"}
            </Text>
          </View>
        </View>

        {/* Debug Info - Remove in production */}
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>🐛 Debug Info</Text>
          <Text style={styles.debugText}>
            Route Params: {JSON.stringify(route?.params, null, 2)}{"\n"}
            Match ID: {matchId}{"\n"}
            Current Match: {currentMatch ? "Found" : "Not Found"}{"\n"}
            Matches Count: {matches?.length || 0}
          </Text>
        </View>
      </ScrollView>
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
    marginTop: 20,
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
  headerRight: {
    width: 30,
    alignItems: "flex-end",
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff4500",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 10,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 18,
    marginTop: 10,
    textAlign: "center",
  },
  errorSubtext: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  errorButtonText: {
    color: COLORS.black,
    fontSize: 16,
    fontWeight: "bold",
  },
  statusCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#ff4500",
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusText: {
    color: "#ff4500",
    fontSize: 18,
    fontWeight: "bold",
  },
  timeText: {
    color: "#ff4500",
    fontSize: 16,
    fontWeight: "bold",
  },
  venueText: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 5,
  },
  dateText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  scoreCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 30,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flex: 1,
    alignItems: "center",
  },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff4500",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
  },
  scoreText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "bold",
    minWidth: 50,
    textAlign: "center",
  },
  scoreSeparator: {
    color: COLORS.white,
    fontSize: 24,
    marginHorizontal: 10,
  },
  controlsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  controlsTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  teamControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  controlsTeamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  scoreControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreButton: {
    backgroundColor: COLORS.gray,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "#4CAF50",
  },
  controlsScore: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: "center",
  },
  completeButton: {
    backgroundColor: "#ff4500",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    color: COLORS.gray,
    fontSize: 14,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
  debugCard: {
    backgroundColor: "rgba(255,255,0,0.1)",
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  debugTitle: {
    color: "#FFD700",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  debugText: {
    color: "#FFD700",
    fontSize: 12,
    fontFamily: "monospace",
  },
});

export default LiveMatchScreen;
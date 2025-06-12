"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTournament } from "../contexts/TournamentContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import type { Match, MatchEvent } from "../types";
import { Ionicons } from "@expo/vector-icons";
// Import the reusable component
import MatchEventsTimeline from "../../components/MatchEventsTimeline";
import MatchStatistics from "../../components/MatchStatistics"


const MatchDetailScreen: React.FC = () => {
  const { tournament } = useTournament();
  const navigation = useNavigation();
  const route = useRoute();
  // @ts-ignore - ignore type issues with route params
  const { matchId } = route.params || {};

  const [match, setMatch] = useState<Match | null>(null);
  const [sortedEvents, setSortedEvents] = useState<MatchEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"events" | "stats">("events");

  useEffect(() => {
    if (tournament?.matches && matchId) {
      const foundMatch = tournament.matches.find(
        (m) =>
          m.id === matchId ||
          m._id === matchId ||
          String(m.id) === String(matchId)
      );

      if (foundMatch) {
        setMatch(foundMatch);

        // Sort events by minute
        if (foundMatch.events && foundMatch.events.length > 0) {
          // Clone events array and add teamId if not present
          const eventsWithTeamIds = foundMatch.events.map((event) => {
            // If event doesn't have teamId, attempt to infer it
            if (!event.teamId && !event.team) {
              // Try to determine team from player data or other logic
              // For now, we'll use a placeholder - you may need to implement proper logic
              const isHomeTeamPlayer = true; // Replace with actual logic based on your data
              return {
                ...event,
                teamId: isHomeTeamPlayer
                  ? foundMatch.homeTeamId
                  : foundMatch.awayTeamId,
                team: isHomeTeamPlayer
                  ? foundMatch.homeTeamId
                  : foundMatch.awayTeamId,
              };
            }
            // Ensure both team and teamId are present for compatibility
            return {
              ...event,
              team: event.team || event.teamId,
              teamId: event.teamId || event.team,
            };
          });

          // Sort events by minute
          const events = [...eventsWithTeamIds].sort(
            (a, b) => a.minute - b.minute
          );
          setSortedEvents(events);
        }
      }
    }
  }, [tournament, matchId]);

  const getTeamInfo = (teamId: string) => {
    const team = tournament?.teams.find(
      (team) =>
        team.id === teamId ||
        team._id === teamId ||
        String(team.id) === String(teamId) ||
        String(team._id) === String(teamId)
    );

    if (!team) {
      return { name: "Unknown Team", logo: null };
    }

    return {
      name: team.name,
      logo: team.logo,
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading match details...</Text>
      </View>
    );
  }

  const homeTeam = getTeamInfo(match.homeTeamId);
  const awayTeam = getTeamInfo(match.awayTeamId);

  // Count stats for statistics tab
  const homeStats = {
    goals:
      sortedEvents.filter(
        (e) =>
          e.type === "goal" &&
          (e.teamId === match.homeTeamId || e.team === match.homeTeamId)
      ).length || 0,
    yellowCards:
      sortedEvents.filter(
        (e) =>
          e.type === "yellow_card" &&
          (e.teamId === match.homeTeamId || e.team === match.homeTeamId)
      ).length || 0,
    redCards:
      sortedEvents.filter(
        (e) =>
          e.type === "red_card" &&
          (e.teamId === match.homeTeamId || e.team === match.homeTeamId)
      ).length || 0,
    substitutions:
      sortedEvents.filter(
        (e) =>
          e.type === "substitution" &&
          (e.teamId === match.homeTeamId || e.team === match.homeTeamId)
      ).length || 0,
  };

  const awayStats = {
    goals:
      sortedEvents.filter(
        (e) =>
          e.type === "goal" &&
          (e.teamId === match.awayTeamId || e.team === match.awayTeamId)
      ).length || 0,
    yellowCards:
      sortedEvents.filter(
        (e) =>
          e.type === "yellow_card" &&
          (e.teamId === match.awayTeamId || e.team === match.awayTeamId)
      ).length || 0,
    redCards:
      sortedEvents.filter(
        (e) =>
          e.type === "red_card" &&
          (e.teamId === match.awayTeamId || e.team === match.awayTeamId)
      ).length || 0,
    substitutions:
      sortedEvents.filter(
        (e) =>
          e.type === "substitution" &&
          (e.teamId === match.awayTeamId || e.team === match.awayTeamId)
      ).length || 0,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.container}>
        {/* Match Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.matchDate}>
            <Text style={styles.dateText}>{formatDate(match.date)}</Text>
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>COMPLETED</Text>
            </View>
          </View>

          <View style={styles.scoreContainer}>
            <View style={styles.teamSection}>
              {homeTeam.logo ? (
                <Image
                  source={{ uri: homeTeam.logo }}
                  style={styles.teamLogo}
                />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoPlaceholderText}>
                    {homeTeam.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.teamName}>{homeTeam.name}</Text>
            </View>

            <View style={styles.scoreSection}>
              <View style={styles.scoreBox}>
                <Text style={styles.score}>{match.homeScore}</Text>
                <Text style={styles.scoreSeparator}>-</Text>
                <Text style={styles.score}>{match.awayScore}</Text>
              </View>
            </View>

            <View style={styles.teamSection}>
              {awayTeam.logo ? (
                <Image
                  source={{ uri: awayTeam.logo }}
                  style={styles.teamLogo}
                />
              ) : (
                <View style={styles.teamLogoPlaceholder}>
                  <Text style={styles.teamLogoPlaceholderText}>
                    {awayTeam.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.teamName}>{awayTeam.name}</Text>
            </View>
          </View>

          <View style={styles.venueContainer}>
            <Text style={styles.venue}>📍 {match.venue}</Text>
            <Text style={styles.time}>{match.time}</Text>
          </View>
        </View>

        {/* Tab navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "events" && styles.activeTab]}
            onPress={() => setActiveTab("events")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "events" && styles.activeTabText,
              ]}
            >
              TIMELINE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "stats" && styles.activeTab]}
            onPress={() => setActiveTab("stats")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "stats" && styles.activeTabText,
              ]}
            >
              STATISTICS
            </Text>
          </TouchableOpacity>
        </View>

        {/* REPLACED: Match Events Timeline with reusable component */}
        {activeTab === "events" && (
          <MatchEventsTimeline
            matchEvents={sortedEvents}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            teams={tournament?.teams}
          />
        )}

        {activeTab === "stats" && (
          <MatchStatistics
            matchEvents={sortedEvents}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
            homeTeamName={homeTeam.name}
            awayTeamName={awayTeam.name}
            homeScore={match.homeScore}
            awayScore={match.awayScore}
            teams={tournament?.teams}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// REMOVED: All timeline-related styles since they're now in the MatchEventsTimeline component
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
  },

  // Score card styles
  scoreCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    margin: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  matchDate: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  completedBadge: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  completedText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  teamSection: {
    flex: 1,
    alignItems: "center",
  },
  teamLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  teamLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  teamLogoPlaceholderText: {
    color: COLORS.black,
    fontSize: 24,
    fontWeight: "bold",
  },
  teamName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  scoreSection: {
    marginHorizontal: 16,
  },
  scoreBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  score: {
    color: COLORS.black,
    fontSize: 28,
    fontWeight: "bold",
  },
  scoreSeparator: {
    color: COLORS.black,
    fontSize: 24,
    marginHorizontal: 10,
  },
  venueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venue: {
    color: COLORS.gray,
    fontSize: 14,
  },
  time: {
    color: COLORS.gray,
    fontSize: 14,
  },

  // Tab navigation styles
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: "bold",
  },
  activeTabText: {
    color: COLORS.black,
  },

  // Stats styles
  statsContainer: {
    margin: 16,
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 16,
  },
  statHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 12,
    marginBottom: 16,
  },
  statTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  teamStatValue: {
    width: 60,
    alignItems: "center",
  },
  statValueText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  statType: {
    flex: 1,
    alignItems: "center",
  },
  statTypeText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  cardIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  yellowCardIndicator: {
    width: 10,
    height: 14,
    backgroundColor: "#FFD700",
    marginRight: 8,
    borderRadius: 1,
  },
  redCardIndicator: {
    width: 10,
    height: 14,
    backgroundColor: COLORS.red,
    marginRight: 8,
    borderRadius: 1,
  },
  subIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  statTeamName: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default MatchDetailScreen;

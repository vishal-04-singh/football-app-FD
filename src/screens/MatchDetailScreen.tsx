"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useTournament } from "../contexts/TournamentContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import type { Match, MatchEvent } from "../types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
// Import the reusable components
import MatchEventsTimeline from "../../components/MatchEventsTimeline";
import MatchStatistics from "../../components/MatchStatistics";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useScrollRefresh } from "../../hooks/useScrollRefresh";

interface PlayerSquad {
  id: string;
  name: string;
  position: string;
  jerseyNumber: number;
  photo?: string;
  isSubstitute: boolean;
}

interface MatchSquads {
  homeTeam: {
    main: PlayerSquad[];
    substitutes: PlayerSquad[];
  };
  awayTeam: {
    main: PlayerSquad[];
    substitutes: PlayerSquad[];
  };
}

const MatchDetailScreen: React.FC = () => {
  const { tournament, refreshData } = useTournament();
  const navigation = useNavigation();
  const route = useRoute();
  // @ts-ignore - ignore type issues with route params
  const { matchId } = route.params || {};

  const [match, setMatch] = useState<Match | null>(null);
  const [sortedEvents, setSortedEvents] = useState<MatchEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"events" | "stats" | "squads">("events");
  const [matchSquads, setMatchSquads] = useState<MatchSquads | null>(null);
  const [loadingSquads, setLoadingSquads] = useState(false);

  // Custom refresh hook
  const { refreshing, onRefresh } = useScrollRefresh({
    onRefresh: async () => {
      // Refresh tournament data
      if (refreshData) {
        await refreshData();
      }
      
      // Refresh match squads if they're loaded
      if (match && matchSquads) {
        await fetchMatchSquads(match);
      }
    },
    successMessage: "Match details refreshed successfully!",
    errorMessage: "Failed to refresh match details. Please try again.",
    showSuccessAlert: false, // Don't show success alert for match detail refresh
    showErrorAlert: true
  });

  // In your MatchDetailScreen.tsx, in the useEffect where you process events:
  useEffect(() => {
    if (tournament?.matches && matchId) {
      const foundMatch = tournament.matches.find(m => 
        m.id === matchId || m._id === matchId || String(m.id) === String(matchId)
      )
      
      if (foundMatch) {
        setMatch(foundMatch)
        
        // IMPORTANT: Process events the SAME WAY as your live screen
        if (foundMatch.events && foundMatch.events.length > 0) {
          const eventsWithTeamIds = foundMatch.events.map(event => {
            // ENHANCED team detection - try multiple approaches
            let eventTeamId = event.team || event.teamId;
            
            if (!eventTeamId) {
              // Try to determine from player data
              if (event.playerId && tournament?.teams) {
                const playerTeam = tournament.teams.find(team => 
                  team.players?.some(player => 
                    String(player.id) === String(event.playerId) || 
                    String(player._id) === String(event.playerId)
                  )
                );
                
                if (playerTeam) {
                  eventTeamId = playerTeam.id || playerTeam._id;
                }
              }
              
              // Fallback: try to guess from match structure
              if (!eventTeamId) {
                // This is a simplified assumption - you may need more logic here
                eventTeamId = foundMatch.homeTeamId; // Default to home team
              }
            }
            
            return {
              ...event,
              team: eventTeamId,
              teamId: eventTeamId,
              // Ensure we have required fields
              id: event.id || `event-${Date.now()}-${Math.random()}`,
              playerName: event.playerName || 'Unknown Player',
              minute: event.minute || 0,
              type: event.type || 'goal'
            };
          });
          
          // Sort events by minute
          const events = [...eventsWithTeamIds].sort((a, b) => a.minute - b.minute);
          setSortedEvents(events);
          
          console.log('MatchDetailScreen - Processed events:', events);
        }
        
        // Auto-fetch squads when match loads
        if (foundMatch.status === "completed") {
          fetchMatchSquads(foundMatch);
        }
      }
    }
  }, [tournament, matchId]);

  const fetchMatchSquads = async (matchData: Match) => {
    setLoadingSquads(true);
    try {
      // Fetch squads for both teams
      const [homeTeamResponse, awayTeamResponse] = await Promise.all([
        fetch(`http://localhost:3000/api/teams/${matchData.homeTeamId}/players`),
        fetch(`http://localhost:3000/api/teams/${matchData.awayTeamId}/players`)
      ]);

      if (!homeTeamResponse.ok || !awayTeamResponse.ok) {
        throw new Error('Failed to fetch team squads');
      }

      const homeTeamPlayers = await homeTeamResponse.json();
      const awayTeamPlayers = await awayTeamResponse.json();

      // Separate main squad (7 players) and substitutes (4 players)
      const homeMainPlayers = homeTeamPlayers.filter((player: any) => !player.isSubstitute).slice(0, 7);
      const homeSubstitutes = homeTeamPlayers.filter((player: any) => player.isSubstitute).slice(0, 4);
      
      const awayMainPlayers = awayTeamPlayers.filter((player: any) => !player.isSubstitute).slice(0, 7);
      const awaySubstitutes = awayTeamPlayers.filter((player: any) => player.isSubstitute).slice(0, 4);

      setMatchSquads({
        homeTeam: {
          main: homeMainPlayers.map((player: any) => ({
            id: player._id || player.id,
            name: player.name,
            position: player.position,
            jerseyNumber: player.jerseyNumber,
            photo: player.photo,
            isSubstitute: false
          })),
          substitutes: homeSubstitutes.map((player: any) => ({
            id: player._id || player.id,
            name: player.name,
            position: player.position,
            jerseyNumber: player.jerseyNumber,
            photo: player.photo,
            isSubstitute: true
          }))
        },
        awayTeam: {
          main: awayMainPlayers.map((player: any) => ({
            id: player._id || player.id,
            name: player.name,
            position: player.position,
            jerseyNumber: player.jerseyNumber,
            photo: player.photo,
            isSubstitute: false
          })),
          substitutes: awaySubstitutes.map((player: any) => ({
            id: player._id || player.id,
            name: player.name,
            position: player.position,
            jerseyNumber: player.jerseyNumber,
            photo: player.photo,
            isSubstitute: true
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching match squads:', error);
      // Fallback to getting players from tournament context
      if (tournament?.teams) {
        const homeTeam = tournament.teams.find(t => t.id === matchData.homeTeamId || t._id === matchData.homeTeamId);
        const awayTeam = tournament.teams.find(t => t.id === matchData.awayTeamId || t._id === matchData.awayTeamId);
        
        if (homeTeam?.players && awayTeam?.players) {
          const homeMainPlayers = homeTeam.players.filter(p => !p.isSubstitute).slice(0, 7);
          const homeSubstitutes = homeTeam.players.filter(p => p.isSubstitute).slice(0, 4);
          const awayMainPlayers = awayTeam.players.filter(p => !p.isSubstitute).slice(0, 7);
          const awaySubstitutes = awayTeam.players.filter(p => p.isSubstitute).slice(0, 4);

          setMatchSquads({
            homeTeam: {
              main: homeMainPlayers,
              substitutes: homeSubstitutes
            },
            awayTeam: {
              main: awayMainPlayers,
              substitutes: awaySubstitutes
            }
          });
        }
      }
    } finally {
      setLoadingSquads(false);
    }
  };

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

  const renderPlayerCard = (player: PlayerSquad, isSubstitute: boolean = false) => {
    return (
      <View key={player.id} style={[styles.playerCard, isSubstitute && styles.substituteCard]}>
        <View style={styles.playerJersey}>
          <Text style={styles.jerseyNumber}>{player.jerseyNumber}</Text>
        </View>
        
        <View style={styles.playerPhotoContainer}>
          {player.photo ? (
            <Image source={{ uri: player.photo }} style={styles.playerPhoto} />
          ) : (
            <LinearGradient
              colors={[COLORS.primary + '40', COLORS.primary + '20']}
              style={styles.playerPhotoPlaceholder}
            >
              <Text style={styles.playerInitials}>
                {player.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </Text>
            </LinearGradient>
          )}
        </View>
        
        <View style={styles.playerInfo}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.playerPosition}>
            {player.position}
          </Text>
          {isSubstitute && (
            <Text style={styles.substituteLabel}>SUB</Text>
          )}
        </View>
      </View>
    );
  };

  const renderSquadsTab = () => {
    if (loadingSquads) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading squads...</Text>
        </View>
      );
    }

    if (!matchSquads) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={60} color={COLORS.gray} />
          <Text style={styles.emptyText}>No squad data available</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => match && fetchMatchSquads(match)}
          >
            <Text style={styles.retryButtonText}>Retry Loading Squads</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const homeTeam = getTeamInfo(match!.homeTeamId);
    const awayTeam = getTeamInfo(match!.awayTeamId);

    return (
      <RefreshableScrollView 
        style={styles.squadsContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {/* Home Team Squad */}
        <View style={styles.teamSquadSection}>
          <View style={styles.teamSquadHeader}>
            <Text style={styles.teamSquadTitle}>{homeTeam.name}</Text>
            <Text style={styles.squadCount}>
              {matchSquads.homeTeam.main.length + matchSquads.homeTeam.substitutes.length} Players
            </Text>
          </View>
          
          {/* Main Squad */}
          <View style={styles.squadSection}>
            <Text style={styles.squadSectionTitle}>Starting XI (7 Players)</Text>
            <View style={styles.playersGrid}>
              {matchSquads.homeTeam.main.map(player => renderPlayerCard(player, false))}
            </View>
          </View>
          
          {/* Substitutes */}
          {matchSquads.homeTeam.substitutes.length > 0 && (
            <View style={styles.squadSection}>
              <Text style={styles.squadSectionTitle}>Substitutes ({matchSquads.homeTeam.substitutes.length})</Text>
              <View style={styles.playersGrid}>
                {matchSquads.homeTeam.substitutes.map(player => renderPlayerCard(player, true))}
              </View>
            </View>
          )}
        </View>

        {/* Away Team Squad */}
        <View style={styles.teamSquadSection}>
          <View style={styles.teamSquadHeader}>
            <Text style={styles.teamSquadTitle}>{awayTeam.name}</Text>
            <Text style={styles.squadCount}>
              {matchSquads.awayTeam.main.length + matchSquads.awayTeam.substitutes.length} Players
            </Text>
          </View>
          
          {/* Main Squad */}
          <View style={styles.squadSection}>
            <Text style={styles.squadSectionTitle}>Starting XI (7 Players)</Text>
            <View style={styles.playersGrid}>
              {matchSquads.awayTeam.main.map(player => renderPlayerCard(player, false))}
            </View>
          </View>
          
          {/* Substitutes */}
          {matchSquads.awayTeam.substitutes.length > 0 && (
            <View style={styles.squadSection}>
              <Text style={styles.squadSectionTitle}>Substitutes ({matchSquads.awayTeam.substitutes.length})</Text>
              <View style={styles.playersGrid}>
                {matchSquads.awayTeam.substitutes.map(player => renderPlayerCard(player, true))}
              </View>
            </View>
          )}
        </View>
      </RefreshableScrollView>
    );
  };

  if (!match) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading match details...</Text>
      </View>
    );
  }

  const homeTeam = getTeamInfo(match.homeTeamId);
  const awayTeam = getTeamInfo(match.awayTeamId);

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
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons 
            name={refreshing ? "sync" : "refresh"} 
            size={20} 
            color={COLORS.primary} 
          />
        </TouchableOpacity>
      </View>

      <RefreshableScrollView 
        style={styles.container}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
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
          <TouchableOpacity
            style={[styles.tab, activeTab === "squads" && styles.activeTab]}
            onPress={() => {
              setActiveTab("squads");
              // Load squads when tab is selected if not already loaded
              if (!matchSquads && !loadingSquads) {
                fetchMatchSquads(match);
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "squads" && styles.activeTabText,
              ]}
            >
              SQUADS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
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

        {activeTab === "squads" && renderSquadsTab()}
      </RefreshableScrollView>
    </SafeAreaView>
  );
};

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
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
    padding: 20,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: 10,
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

  // Squads styles
  squadsContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  teamSquadSection: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
  },
  teamSquadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray + '30',
    paddingBottom: 12,
  },
  teamSquadTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  squadCount: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  squadSection: {
    marginBottom: 20,
  },
  squadSectionTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: '48%',
    backgroundColor: COLORS.gray + '20',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  substituteCard: {
    borderColor: COLORS.orange,
    borderWidth: 1,
  },
  playerJersey: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  jerseyNumber: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerPhotoContainer: {
    marginRight: 8,
  },
  playerPhoto: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  playerPhotoPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInitials: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerPosition: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 2,
  },
  substituteLabel: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  retryButtonText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default MatchDetailScreen;
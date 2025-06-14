import type React from "react";
import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useTournament } from "../contexts/TournamentContext";
import { useAuth } from "../contexts/AuthContext";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useScrollRefresh } from "../../hooks/useScrollRefresh";

// Current Date and Time (UTC - YYYY-MM-DD HH:MM:SS formatted): 2025-06-14 07:57:19
// Current User's Login: vishal-04-singh

const PointsTableScreen: React.FC = () => {
  const { user } = useAuth();
  const { tournament, matches, refreshData } = useTournament();
  const [calculatedTeams, setCalculatedTeams] = useState([]);

  // Get current date and time
  const getCurrentDateTime = () => {
    const now = new Date()
    return {
      date: now.toISOString().split('T')[0], // YYYY-MM-DD format
      time: now.toTimeString().split(' ')[0], // HH:MM:SS format
      fullDateTime: now.toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:MM:SS
      userFriendlyDate: now.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }),
      userFriendlyTime: now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      })
    }
  }

  const currentDateTime = getCurrentDateTime()

  // Custom refresh hook
  const { refreshing, onRefresh } = useScrollRefresh({
    onRefresh: async () => {
      // Refresh tournament data
      if (refreshData) {
        await refreshData();
      }
    },
    successMessage: "Points table updated successfully!",
    errorMessage: "Failed to refresh points table. Please try again.",
    showSuccessAlert: false, // Don't show success alert for points table refresh
    showErrorAlert: true
  });

  // Calculate team statistics including points from match results
  useEffect(() => {
    if (!tournament?.teams || !matches) return;

    // Create a deep copy of teams to work with
    const teamsData = JSON.parse(JSON.stringify(tournament.teams));
    
    // Initialize stats for each team
    const teamsWithStats = teamsData.map(team => ({
      ...team,
      points: 0,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0
    }));
    
    // Calculate statistics from completed matches
    const completedMatches = matches.filter(match => match.status === "completed");
    
    completedMatches.forEach(match => {
      const homeTeam = teamsWithStats.find(t => t.id === match.homeTeamId || t._id === match.homeTeamId);
      const awayTeam = teamsWithStats.find(t => t.id === match.awayTeamId || t._id === match.awayTeamId);
      
      if (!homeTeam || !awayTeam) return;
      
      const homeScore = match.homeScore || 0;
      const awayScore = match.awayScore || 0;
      
      // Update matches played
      homeTeam.matchesPlayed += 1;
      awayTeam.matchesPlayed += 1;
      
      // Update goals
      homeTeam.goalsFor += homeScore;
      homeTeam.goalsAgainst += awayScore;
      awayTeam.goalsFor += awayScore;
      awayTeam.goalsAgainst += homeScore;
      
      // Update results and points
      if (homeScore > awayScore) {
        // Home team wins
        homeTeam.wins += 1;
        homeTeam.points += 3;
        awayTeam.losses += 1;
      } else if (awayScore > homeScore) {
        // Away team wins
        awayTeam.wins += 1;
        awayTeam.points += 3;
        homeTeam.losses += 1;
      } else {
        // Draw
        homeTeam.draws += 1;
        awayTeam.draws += 1;
        homeTeam.points += 1;
        awayTeam.points += 1;
      }
    });
    
    // Sort teams by points, goal difference, then goals for
    const sortedTeams = teamsWithStats.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
      
      return b.goalsFor - a.goalsFor;
    });
    
    setCalculatedTeams(sortedTeams);
  }, [tournament?.teams, matches]);

  return (
    <RefreshableScrollView 
      style={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Current Date/Time and User Info Bar */}
      

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Points Table</Text>
          <Text style={styles.subtitle}>League Standings</Text>
        </View>
        
        {/* Manual refresh button */}
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

      {calculatedTeams.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyText}>No Teams Yet</Text>
          <Text style={styles.emptySubtext}>
            Teams will appear here once they are added to the tournament
          </Text>
          
          {/* Add refresh button in empty state */}
          <TouchableOpacity
            style={styles.emptyRefreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name={refreshing ? "sync" : "refresh"} 
              size={20} 
              color={COLORS.primary} 
            />
            <Text style={styles.emptyRefreshText}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <View style={styles.positionHeader}>
              <Text style={styles.headerText}>#</Text>
            </View>
            <View style={styles.teamHeader}>
              <Text style={styles.headerText}>Team</Text>
            </View>
            <View style={styles.statsHeader}>
              <Text style={styles.headerText}>P</Text>
              <Text style={styles.headerText}>W</Text>
              <Text style={styles.headerText}>D</Text>
              <Text style={styles.headerText}>L</Text>
              <Text style={styles.headerText}>GF</Text>
              <Text style={styles.headerText}>GA</Text>
              <Text style={styles.headerText}>GD</Text>
              <Text style={styles.headerTextPoints}>Pts</Text>
            </View>
          </View>

          <View style={styles.teamsContainer}>
            {calculatedTeams.map((team, index) => {
              const position = index + 1;
              const goalDifference = team.goalsFor - team.goalsAgainst;
              const getPositionColor = (position: number) => {
                if (position <= 4) return COLORS.green; // Playoff qualification
                return COLORS.gray; // Lower positions
              };

              return (
                <View
                  key={team.id || team._id || `team-${index}`}
                  style={[styles.teamRow, position % 2 === 0 && styles.evenRow]}
                >
                  <View style={styles.positionContainer}>
                    <View
                      style={[
                        styles.positionBadge,
                        { backgroundColor: getPositionColor(position) },
                      ]}
                    >
                      <Text style={styles.positionText}>{position}</Text>
                    </View>
                  </View>

                  <View style={styles.teamContainer}>
                    <View style={styles.teamLogo}>
                      {team.logo ? (
                        <Image
                          source={{ uri: team.logo }}
                          style={styles.teamLogoImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.teamLogoText}>
                          {team.name
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.teamName} numberOfLines={1}>
                      {team.name}
                    </Text>
                  </View>

                  <View style={styles.statsContainer}>
                    <Text style={styles.statText}>{team.matchesPlayed}</Text>
                    <Text style={styles.statText}>{team.wins}</Text>
                    <Text style={styles.statText}>{team.draws}</Text>
                    <Text style={styles.statText}>{team.losses}</Text>
                    <Text style={styles.statText}>{team.goalsFor}</Text>
                    <Text style={styles.statText}>{team.goalsAgainst}</Text>
                    <Text
                      style={[
                        styles.statText,
                        goalDifference > 0 && styles.positiveGD,
                        goalDifference < 0 && styles.negativeGD,
                      ]}
                    >
                      {goalDifference > 0 ? "+" : ""}
                      {goalDifference}
                    </Text>
                    <Text style={styles.pointsText}>{team.points}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Qualification For Semi's</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.green }]} />
            <Text style={styles.legendText}>Semi's Qualification (Top 4)</Text>
          </View>
        </View>
      </View>

      <View style={styles.tournamentInfo}>
        <Text style={styles.infoTitle}>Tournament Format</Text>
        <Text style={styles.infoText}>
          • 8 teams compete in a league format{"\n"}
          • Each team plays 7 matches (28 total){"\n"}
          • Top 4 teams qualify for semi-finals{"\n"}
          • Semi-finals + Final in Week 4{"\n"}
          • 3 points for win, 1 for draw, 0 for loss
        </Text>
      </View>

      {/* Stats explanation */}
      <View style={styles.statsExplanation}>
        <Text style={styles.statsExplanationTitle}>Key</Text>
        <View style={styles.statsExplanationItems}>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>P:</Text>
            <Text style={styles.statsValue}>Matches played</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>W:</Text>
            <Text style={styles.statsValue}>Wins</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>D:</Text>
            <Text style={styles.statsValue}>Draws</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>L:</Text>
            <Text style={styles.statsValue}>Losses</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>GF:</Text>
            <Text style={styles.statsValue}>Goals for</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>GA:</Text>
            <Text style={styles.statsValue}>Goals against</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>GD:</Text>
            <Text style={styles.statsValue}>Goal difference</Text>
          </View>
          <View style={styles.statsExplanationItem}>
            <Text style={styles.statsKey}>Pts:</Text>
            <Text style={styles.statsValue}>Points</Text>
          </View>
        </View>
      </View>

      {/* Last updated */}
      <View style={styles.lastUpdated}>
        <Text style={styles.lastUpdatedText}>
          Last updated: {currentDateTime.fullDateTime}
        </Text>
      </View>
    </RefreshableScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  // Status Bar Styles
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  currentDate: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  currentTime: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  userInfoContainer: {
    alignItems: 'flex-end',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userLogin: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 20,
    paddingRight: 20,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginVertical: 40,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
  },
  emptySubtext: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyRefreshText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  tableContainer: {
    margin: 10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  positionHeader: {
    width: 40,
    alignItems: "center",
  },
  teamHeader: {
    flex: 1,
    paddingLeft: 10,
  },
  statsHeader: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingRight: 10,
  },
  headerText: {
    color: COLORS.black,
    fontSize: 12,
    fontWeight: "bold",
  },
  headerTextPoints: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: "bold",
  },
  teamsContainer: {
    paddingBottom: 5,
  },
  teamRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  evenRow: {
    backgroundColor: COLORS.black,
  },
  positionContainer: {
    width: 40,
    alignItems: "center",
  },
  positionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  positionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  teamContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  teamLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  teamLogoImage: {
    width: 30,
    height: 30,
  },
  teamLogoText: {
    color: COLORS.black,
    fontSize: 10,
    fontWeight: "bold",
  },
  teamName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingRight: 10,
  },
  statText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: "center",
    minWidth: 20,
  },
  positiveGD: {
    color: COLORS.green,
  },
  negativeGD: {
    color: COLORS.red,
  },
  pointsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 20,
  },
  legend: {
    margin: 20,
    marginBottom: 10,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  legendTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    color: COLORS.gray,
    fontSize: 12,
  },
  tournamentInfo: {
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  infoTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    color: COLORS.gray,
    fontSize: 12,
    lineHeight: 18,
  },
  statsExplanation: {
    margin: 20,
    marginTop: 10,
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  statsExplanationTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statsExplanationItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statsExplanationItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "45%",
  },
  statsKey: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 5,
  },
  statsValue: {
    color: COLORS.gray,
    fontSize: 12,
  },
  lastUpdated: {
    padding: 20,
    alignItems: "center",
  },
  lastUpdatedText: {
    color: COLORS.gray,
    fontSize: 10,
  },
});

export default PointsTableScreen;
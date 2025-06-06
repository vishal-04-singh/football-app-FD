import type React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTournament } from "../contexts/TournamentContext";
import { COLORS } from "../constants/colors";
import { Ionicons } from "@expo/vector-icons";

const PointsTableScreen: React.FC = () => {
  const { tournament } = useTournament();

  // Sort teams by points, then by goal difference, then by goals for
  const sortedTeams =
    tournament?.teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const goalDiffA = a.goalsFor - a.goalsAgainst;
      const goalDiffB = b.goalsFor - b.goalsAgainst;
      if (goalDiffB !== goalDiffA) return goalDiffB - goalDiffA;
      return b.goalsFor - a.goalsFor;
    }) || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Points Table</Text>
        <Text style={styles.subtitle}>League Standings</Text>
      </View>

      {sortedTeams.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={80} color={COLORS.gray} />
          <Text style={styles.emptyText}>No Teams Yet</Text>
          <Text style={styles.emptySubtext}>
            Teams will appear here once they are added to the tournament
          </Text>
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
              <Text style={styles.headerText}>Pts</Text>
            </View>
          </View>

          <View style={styles.teamsContainer}>
            {sortedTeams.map((team, index) => {
              const position = index + 1;
              const goalDifference = team.goalsFor - team.goalsAgainst;
              const getPositionColor = (position: number) => {
                if (position <= 4) return COLORS.green; // Playoff qualification
               
                return COLORS.gray; // Lower positions
              };

              return (
                <View
                  key={team.id}
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
            
            <Text style={styles.legendText}> • Semi's Qualification (Top 4)</Text>
          </View>
          
        </View>
      </View>

      {/* <View style={styles.tournamentInfo}>
        <Text style={styles.infoTitle}>Tournament Format</Text>
        <Text style={styles.infoText}>
          • 8 teams compete in a league format{"\n"}• Each team plays 7 matches
          (28 total){"\n"}• Top 2 teams qualify for semi-finals{"\n"}•
          Semi-finals + Final in Week 4{"\n"}• 3 points for win, 1 for draw, 0
          for loss
        </Text>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  header: {
    paddingTop: 10,
    paddingBottom:10,
    paddingLeft:20,
    paddingRight:20,
    backgroundColor: COLORS.background,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
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
    textAlign: "center",
    lineHeight: 24,
  },
  tableContainer: {
    flex: 1,
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
  teamsContainer: {
    flex: 1,
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
  pointsText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    minWidth: 20,
  },
  legend: {
    margin: 20,
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
    marginTop: 0,
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
  teamLogoImage: {
  width: 30,
  height: 30,
  borderRadius: 15,
}
});

export default PointsTableScreen;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/constants/colors';
import type { MatchEvent } from '../src/types';

interface MatchStatisticsProps {
  matchEvents: MatchEvent[];
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  teams?: any[];
}

const MatchStatistics: React.FC<MatchStatisticsProps> = ({
  matchEvents,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  teams,
}) => {
  // Helper function to check if event belongs to a specific team
  const isEventFromTeam = (event: any, teamId: string) => {
    const eventTeamId = String(event.team || event.teamId || "");
    const normalizedTeamId = String(teamId || "");
    
    if (eventTeamId === normalizedTeamId) return true;
    
    // Fallback: check via player team lookup
    if (event.playerId && teams) {
      const playerTeam = teams.find(team => 
        team.players?.some(player => 
          String(player.id) === String(event.playerId) || 
          String(player._id) === String(event.playerId)
        )
      );
      
      if (playerTeam) {
        const playerTeamId = String(playerTeam.id || playerTeam._id);
        return playerTeamId === normalizedTeamId;
      }
    }
    
    return false;
  };

  // Calculate statistics for both teams
  const homeStats = {
    goals: homeScore || matchEvents.filter(e => e.type === "goal" && isEventFromTeam(e, homeTeamId)).length,
    yellowCards: matchEvents.filter(e => e.type === "yellow_card" && isEventFromTeam(e, homeTeamId)).length,
    redCards: matchEvents.filter(e => e.type === "red_card" && isEventFromTeam(e, homeTeamId)).length,
    substitutions: matchEvents.filter(e => e.type === "substitution" && isEventFromTeam(e, homeTeamId)).length
  };
  
  const awayStats = {
    goals: awayScore || matchEvents.filter(e => e.type === "goal" && isEventFromTeam(e, awayTeamId)).length,
    yellowCards: matchEvents.filter(e => e.type === "yellow_card" && isEventFromTeam(e, awayTeamId)).length,
    redCards: matchEvents.filter(e => e.type === "red_card" && isEventFromTeam(e, awayTeamId)).length,
    substitutions: matchEvents.filter(e => e.type === "substitution" && isEventFromTeam(e, awayTeamId)).length
  };

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <View style={styles.statHeader}>
          <Text style={styles.statTitle}>Match Statistics</Text>
        </View>
        
        {/* Goals */}
        <View style={styles.statRow}>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{homeStats.goals}</Text>
          </View>
          <View style={styles.statType}>
            <View style={styles.goalIndicator}>
              <Ionicons name="football" size={16} color={COLORS.primary} />
              <Text style={styles.statTypeText}>Goals</Text>
            </View>
          </View>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{awayStats.goals}</Text>
          </View>
        </View>
        
        {/* Yellow Cards */}
        <View style={styles.statRow}>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{homeStats.yellowCards}</Text>
          </View>
          <View style={styles.statType}>
            <View style={styles.cardIndicator}>
              <View style={styles.yellowCardIndicator} />
              <Text style={styles.statTypeText}>Yellow Cards</Text>
            </View>
          </View>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{awayStats.yellowCards}</Text>
          </View>
        </View>
        
        {/* Red Cards */}
        <View style={styles.statRow}>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{homeStats.redCards}</Text>
          </View>
          <View style={styles.statType}>
            <View style={styles.cardIndicator}>
              <View style={styles.redCardIndicator} />
              <Text style={styles.statTypeText}>Red Cards</Text>
            </View>
          </View>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{awayStats.redCards}</Text>
          </View>
        </View>
        
        {/* Substitutions */}
        <View style={styles.statRow}>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{homeStats.substitutions}</Text>
          </View>
          <View style={styles.statType}>
            <View style={styles.subIndicator}>
              <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
              <Text style={styles.statTypeText}>Substitutions</Text>
            </View>
          </View>
          <View style={styles.teamStatValue}>
            <Text style={styles.statValueText}>{awayStats.substitutions}</Text>
          </View>
        </View>
        
        {/* Team Names */}
        <View style={styles.teamNameRow}>
          <Text style={styles.statTeamName}>{homeTeamName}</Text>
          <View style={styles.teamNameSpacer} />
          <Text style={styles.statTeamName}>{awayTeamName}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    margin: 16,
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    paddingBottom: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  statTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  teamStatValue: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  statValueText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "bold",
  },
  statType: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statTypeText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
  },
  goalIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  yellowCardIndicator: {
    width: 12,
    height: 16,
    backgroundColor: "#FFD700",
    marginBottom: 4,
    borderRadius: 2,
    elevation: 1,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  redCardIndicator: {
    width: 12,
    height: 16,
    backgroundColor: COLORS.red,
    marginBottom: 4,
    borderRadius: 2,
    elevation: 1,
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  subIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  teamNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  teamNameSpacer: {
    width: 100,
  },
  statTeamName: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
});

export default MatchStatistics;
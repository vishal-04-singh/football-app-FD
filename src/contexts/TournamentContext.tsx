"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiService } from "../../services/api";
import type { Tournament, Team, Player, Match } from "../types";
import type { MatchStats } from "../types/matchStats";

interface ScheduleMatchData {
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue: string;
  week: number;
}

// Match status constants
const MATCH_STATUS = {
  UPCOMING: "upcoming",
  LIVE: "live",
  COMPLETED: "completed",
} as const;

interface TournamentContextType {
  tournament: Tournament | null;
  teams: Team[];
  matches: Match[];
  loading: boolean;
  refreshData: () => Promise<void>;
  updateMatch: (
    matchId: string,
    homeScore: number,
    awayScore: number,
    events: any[]
  ) => Promise<void>;
  updateMatchStatus: (
    matchId: string,
    status: string,
    minute: number,
    event?: any
  ) => Promise<void>;
  updateMatchStats: (matchId: string, stats: MatchStats) => Promise<void>;
  getMatchStats: (matchId: string) => Promise<MatchStats | null>;
  addTeam: (teamData: { name: string; logo?: string }) => Promise<void>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  addPlayer: (player: Omit<Player, "id">) => Promise<void>;
  scheduleMatch: (matchData: ScheduleMatchData) => Promise<void>;
  getMatchStatus: (matchDateTime: string) => "upcoming" | "live" | "completed";
  startMatch: (matchId: string) => Promise<void>;
  completeMatch: (matchId: string, finalStats?: MatchStats) => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType | undefined>(
  undefined
);

export const useTournament = () => {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error("useTournament must be used within a TournamentProvider");
  }
  return context;
};

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // Function to determine match status based on date and time
  const getMatchStatus = useCallback(
    (matchDateTime: string): "upcoming" | "live" | "completed" => {
      const currentTime = new Date();
      const matchTime = new Date(matchDateTime);

      // Calculate end time (match time + 2 hours for full match duration)
      const matchEndTime = new Date(matchTime);
      matchEndTime.setMinutes(matchEndTime.getMinutes() + 120); // 2 hours = 120 minutes

      if (currentTime >= matchTime && currentTime < matchEndTime) {
        return MATCH_STATUS.LIVE;
      } else if (currentTime >= matchEndTime) {
        return MATCH_STATUS.COMPLETED;
      } else {
        return MATCH_STATUS.UPCOMING;
      }
    },
    []
  );

  // Update match statuses based on current time
  const updateMatchStatuses = useCallback(() => {
    setMatches((prevMatches) =>
      prevMatches.map((match) => {
        // Only process if we have both date and time
        if (!match.date || !match.time) return match;

        // Create datetime string by combining date and time
        const matchDateTime = `${match.date}T${match.time}`;
        const calculatedStatus = getMatchStatus(matchDateTime);

        // Only update if the calculated status is different from current status
        // But allow manual override for completed matches
        if (
          match.status !== calculatedStatus &&
          match.status !== MATCH_STATUS.COMPLETED
        ) {
          return { ...match, status: calculatedStatus };
        }
        return match;
      })
    );
  }, [getMatchStatus]);

  const refreshData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        // Make sure token is refreshed before making the request
        await apiService.refreshToken();

        const data = await apiService.getTournamentData();
        console.log("API Response - Tournament Data:", data);

        // Ensure team IDs are consistent
        const processedTeams = (data.teams || []).map(
          (team: { _id: any; id: any; players: any }) => ({
            ...team,
            id: team._id || team.id, // Ensure id is always set
            _id: team._id || team.id, // Ensure _id is also always set
            players: team.players || [],
          })
        );

        console.log("Processed Teams:", processedTeams);

        setTournament(data.tournament);
        setTeams(processedTeams);

        // Update match statuses before setting matches
        const updatedMatches = (data.matches || []).map((match: Match) => {
          // Ensure reference IDs are valid and consistent
          const processedMatch = {
            ...match,
            id: match._id || match.id, // Ensure id is always set
            _id: match._id || match.id, // Ensure _id is also always set
            // Make sure team IDs match the format expected
            homeTeamId:
              typeof match.homeTeamId === "object" && match.homeTeamId !== null
                ? (match.homeTeamId as any)._id
                : match.homeTeamId,
            awayTeamId:
              typeof match.awayTeamId === "object" && match.awayTeamId !== null
                ? (match.awayTeamId as any)._id
                : match.awayTeamId,
          };

          // If match is already marked as completed, respect that status
          if (match.status === MATCH_STATUS.COMPLETED) {
            return processedMatch;
          }

          // Otherwise calculate status based on date and time
          if (match.date && match.time) {
            const matchDateTime = `${match.date}T${match.time}`;
            const calculatedStatus = getMatchStatus(matchDateTime);
            return { ...processedMatch, status: calculatedStatus };
          }

          return processedMatch;
        });

        console.log("Processed Matches:", updatedMatches);

        setMatches(updatedMatches);
        setLastRefresh(Date.now());
      } catch (error) {
        console.error("Error fetching tournament data:", error);
        // Initialize with empty data if API fails
        if (!tournament) {
          setTournament({
            id: "default",
            name: "Football League Championship",
            startDate: "2024-01-06",
            endDate: "2024-01-28",
            currentWeek: 1,
            status: "ongoing",
            teams: [],
            matches: [],
          });
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [getMatchStatus, tournament]
  );

  // Update match scores and events
  const updateMatch = async (
    matchId: string,
    homeScore: number,
    awayScore: number,
    events: any[]
  ) => {
    try {
      const updatedMatch = await apiService.updateMatch(matchId, {
        homeScore,
        awayScore,
        events,
        status: MATCH_STATUS.COMPLETED,
      });

      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, ...updatedMatch } : match
        )
      );

      // Refresh data to ensure all clients have the latest
      refreshData(false);
    } catch (error) {
      console.error("Error updating match:", error);
      throw error;
    }
  };

  // Update match status and add events
  // Update the updateMatchStatus function in TournamentContext.tsx
  const updateMatchStatus = async (
    matchId: string,
    status: string,
    minute: number,
    event?: any
  ) => {
    try {
      const updateData: any = { status, minute };

      if (event) {
        // Handle event updates
        const match = matches.find((m) => m.id === matchId);
        if (match) {
          // FIXED: Properly preserve all event fields including team
          const newEvent = {
            id: event.id || `event${Date.now()}`, // Use existing ID or generate new one
            type: event.type,
            playerId: event.playerId, // FIXED: Use actual player ID from event
            playerName: event.playerName,
            minute: event.minute,
            team: event.team, // FIXED: Preserve the team field!
            teamName: event.teamName, // FIXED: Preserve team name
            description:
              event.description ||
              `${event.playerName} - ${event.type.replace("_", " ")}`,
          };

          console.log("Creating event in backend:", newEvent); // Debug log

          updateData.events = [...(match.events || []), newEvent];

          if (event.type === "goal") {
            // FIXED: Use the team field to determine which score to update
            if (
              event.team === match.homeTeamId ||
              String(event.team) === String(match.homeTeamId)
            ) {
              updateData.homeScore = (match.homeScore || 0) + 1;
            } else if (
              event.team === match.awayTeamId ||
              String(event.team) === String(match.awayTeamId)
            ) {
              updateData.awayScore = (match.awayScore || 0) + 1;
            }
          }
        }
      }

      const updatedMatch = await apiService.updateMatch(matchId, updateData);

      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId ? { ...match, ...updatedMatch } : match
        )
      );

      // Refresh data to ensure all clients have the latest
      refreshData(false);
    } catch (error) {
      console.error("Error updating match status:", error);
      throw error;
    }
  };

  // Update match statistics
  const updateMatchStats = async (matchId: string, stats: MatchStats) => {
    try {
      const updatedMatch = await apiService.updateMatchStats(matchId, stats);

      // Update local match data with new stats
      setMatches((prev) =>
        prev.map((match) =>
          match.id === matchId
            ? {
                ...match,
                ...updatedMatch,
                homeScore: stats.homeScore,
                awayScore: stats.awayScore,
              }
            : match
        )
      );

      // Refresh data to ensure all clients have the latest
      refreshData(false);

      return updatedMatch;
    } catch (error) {
      console.error("Error updating match statistics:", error);
      throw error;
    }
  };

  // Get match statistics
  const getMatchStats = useCallback(
    async (matchId: string): Promise<MatchStats | null> => {
      try {
        const stats = await apiService.getMatchStats(matchId);
        return stats;
      } catch (error) {
        console.error("Error fetching match statistics:", error);
        return null;
      }
    },
    []
  );

  // Add new team
  const addTeam = async (teamData: { name: string; logo?: string }) => {
    try {
      // Only send name and logo - no captainId at all
      const newTeam = await apiService.createTeam({
        name: teamData.name,
        logo: teamData.logo || "",
      });

      setTeams((prev) => [
        ...prev,
        { ...newTeam, id: newTeam._id, players: [] },
      ]);

      // Refresh data to ensure all clients have the latest
      refreshData(false);
    } catch (error) {
      console.error("Error adding team:", error);
      throw error;
    }
  };

  // Update team
  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    try {
      const updatedTeam = await apiService.updateTeam(teamId, updates);

      setTeams((prev) =>
        prev.map((team) =>
          team.id === teamId ? { ...team, ...updatedTeam } : team
        )
      );

      // Refresh data to ensure all clients have the latest
      refreshData(false);
    } catch (error) {
      console.error("Error updating team:", error);
      throw error;
    }
  };

  // Add player to team
  const addPlayer = async (playerData: Omit<Player, "id">) => {
    try {
      console.log("🏃‍♂️ Adding player with data:", playerData);

      // Validate required fields
      if (
        !playerData.name ||
        !playerData.position ||
        !playerData.jerseyNumber ||
        !playerData.teamId
      ) {
        throw new Error("Missing required player information");
      }

      // Ensure jersey number is a valid number
      const jerseyNumber = Number(playerData.jerseyNumber);
      if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 1001) {
        throw new Error("Jersey number must be between 1 and 1000");
      }

      // Check if jersey number is already taken in the team
      const team = teams.find(
        (t) => t.id === playerData.teamId || t._id === playerData.teamId
      );
      if (team) {
        const existingPlayer = team.players.find(
          (p) => p.jerseyNumber === jerseyNumber
        );
        if (existingPlayer) {
          throw new Error(
            `Jersey number ${jerseyNumber} is already taken by ${existingPlayer.name}`
          );
        }

        // Check team capacity
        if (team.players.length >= 11) {
          throw new Error("Team already has maximum players (11)");
        }
      }

      const newPlayer = await apiService.createPlayer({
        name: playerData.name.trim(),
        position: playerData.position,
        jerseyNumber: jerseyNumber,
        teamId: playerData.teamId,
        isSubstitute: playerData.isSubstitute || false,
        photo: playerData.photo || "",
      });

      console.log("✅ Player created successfully:", newPlayer);

      // Update local state
      setTeams((prev) =>
        prev.map((team) =>
          team.id === playerData.teamId || team._id === playerData.teamId
            ? {
                ...team,
                players: [
                  ...team.players,
                  { ...newPlayer, id: newPlayer._id || newPlayer.id },
                ],
              }
            : team
        )
      );

      // Refresh data to ensure all clients have the latest
      refreshData(false);
    } catch (error) {
      console.error("❌ Error adding player:", error);
      throw error;
    }
  };

  // Schedule new match
  const scheduleMatch = async (matchData: ScheduleMatchData) => {
    try {
      // Add debug logging
      console.log("Scheduling match with data:", matchData);
      console.log("Home team ID:", matchData.homeTeamId);
      console.log("Away team ID:", matchData.awayTeamId);

      // Find the actual team objects for validation
      const homeTeam = teams.find(
        (t) => t.id === matchData.homeTeamId || t._id === matchData.homeTeamId
      );
      const awayTeam = teams.find(
        (t) => t.id === matchData.awayTeamId || t._id === matchData.awayTeamId
      );

      console.log("Found home team:", homeTeam?.name);
      console.log("Found away team:", awayTeam?.name);

      if (!homeTeam || !awayTeam) {
        throw new Error(
          "One or both teams not found. Please select valid teams."
        );
      }

      // Calculate the initial status based on date and time
      const matchDateTime = `${matchData.date}T${matchData.time}`;
      const initialStatus = getMatchStatus(matchDateTime);

      const newMatch = await apiService.createMatch({
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        date: matchData.date,
        time: matchData.time,
        venue: matchData.venue,
        week: matchData.week,
        status: initialStatus,
        homeScore: 0,
        awayScore: 0,
        events: [],
      });

      console.log("API response for new match:", newMatch);

      // Ensure the new match has consistent ID formats
      const processedNewMatch = {
        ...newMatch,
        id: newMatch._id || newMatch.id,
        _id: newMatch._id || newMatch.id,
        // Make sure team IDs are consistent
        homeTeamId: newMatch.homeTeamId?._id || newMatch.homeTeamId,
        awayTeamId: newMatch.awayTeamId?._id || newMatch.awayTeamId,
      };

      setMatches((prev) => [...prev, processedNewMatch]);

      // Refresh data to ensure all clients have the latest
      await refreshData(false);
    } catch (error) {
      console.error("Error scheduling match:", error);
      throw error;
    }
  };

  // Start a match (change status to live)
  const startMatch = useCallback(
    async (matchId: string) => {
      try {
        await updateMatchStatus(matchId, MATCH_STATUS.LIVE, 0);
      } catch (error) {
        console.error("Error starting match:", error);
        throw error;
      }
    },
    [updateMatchStatus]
  );

  // Complete a match
  const completeMatch = useCallback(
    async (matchId: string, finalStats?: MatchStats) => {
      try {
        // Update match status to completed
        await updateMatchStatus(matchId, MATCH_STATUS.COMPLETED, 90);

        // Update final statistics if provided
        if (finalStats) {
          await updateMatchStats(matchId, finalStats);
        }

        // Refresh data to get updated standings
        await refreshData(false);
      } catch (error) {
        console.error("Error completing match:", error);
        throw error;
      }
    },
    [updateMatchStatus, updateMatchStats, refreshData]
  );

  // Initial data load
  useEffect(() => {
    refreshData();
    // Empty dependency array so this only runs once on mount
  }, []);

  // Auto-refresh data every 30 seconds for live updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh if it's been more than 30 seconds since the last manual refresh
      const now = Date.now();
      if (now - lastRefresh > 30000) {
        refreshData(false); // silent refresh
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [lastRefresh, refreshData]);

  // Update match statuses every minute
  useEffect(() => {
    // Initial update
    if (matches.length > 0) {
      updateMatchStatuses();
    }

    const statusUpdateInterval = setInterval(() => {
      updateMatchStatuses();
    }, 60000); // Check every minute

    return () => clearInterval(statusUpdateInterval);
  }, [matches.length, updateMatchStatuses]);

  // Create tournament object with teams and matches for compatibility
  const tournamentWithData = tournament
    ? {
        ...tournament,
        teams,
        matches,
      }
    : null;

  const value: TournamentContextType = {
    tournament: tournamentWithData,
    teams,
    matches,
    loading,
    refreshData,
    updateMatch,
    updateMatchStatus,
    updateMatchStats,
    getMatchStats,
    addTeam,
    updateTeam,
    addPlayer,
    scheduleMatch,
    getMatchStatus,
    startMatch,
    completeMatch,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

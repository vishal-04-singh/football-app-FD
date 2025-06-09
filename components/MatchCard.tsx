import { Alert } from 'react-native';
import type { Player } from '../src/types/index';

export const usePlayerManagement = (
  teams: any[],
  homeSquad: any,
  setHomeSquad: any,
  awaySquad: any,
  setAwaySquad: any,
  setHomeTeamPlayers: any,
  setAwayTeamPlayers: any
) => {
  
  const openPlayerPicker = async (teamType: "home" | "away", selectedHomeTeam: string, selectedAwayTeam: string) => {
    const teamId = teamType === "home" ? selectedHomeTeam : selectedAwayTeam;

    if (!teamId) {
      Alert.alert("Error", `Please select ${teamType} team first`);
      return;
    }

    const team = teams?.find((t) => t.id === teamId || t._id === teamId);

    if (team) {
      if (team.players && team.players.length > 0) {
        const playersData = team.players.map((player: any) => ({
          ...player,
          id: player.id || player._id,
        }));

        if (teamType === "home") {
          setHomeTeamPlayers(playersData);
        } else {
          setAwayTeamPlayers(playersData);
        }
      } else {
        Alert.alert("Error", "No players found for this team");
      }
    } else {
      Alert.alert("Error", "Team not found");
    }
  };

  const togglePlayerInSquad = (
    player: Player,
    teamType: "home" | "away",
    position: "main" | "sub"
  ) => {
    const currentSquad = teamType === "home" ? homeSquad : awaySquad;
    const setSquad = teamType === "home" ? setHomeSquad : setAwaySquad;

    if (position === "main") {
      const isAlreadyMain = currentSquad.mainPlayers.some((p: Player) => p.id === player.id);

      if (isAlreadyMain) {
        setSquad((prev: any) => ({
          ...prev,
          mainPlayers: prev.mainPlayers.filter((p: Player) => p.id !== player.id),
        }));
      } else {
        if (currentSquad.mainPlayers.length >= 7) {
          Alert.alert("Limit Reached", "Maximum 7 main players allowed");
          return;
        }

        setSquad((prev: any) => ({
          mainPlayers: [...prev.mainPlayers, player],
          substitutes: prev.substitutes.filter((p: Player) => p.id !== player.id),
        }));
      }
    } else {
      const isAlreadySub = currentSquad.substitutes.some((p: Player) => p.id === player.id);

      if (isAlreadySub) {
        setSquad((prev: any) => ({
          ...prev,
          substitutes: prev.substitutes.filter((p: Player) => p.id !== player.id),
        }));
      } else {
        if (currentSquad.substitutes.length >= 3) {
          Alert.alert("Limit Reached", "Maximum 3 substitutes allowed");
          return;
        }

        setSquad((prev: any) => ({
          substitutes: [...prev.substitutes, player],
          mainPlayers: prev.mainPlayers.filter((p: Player) => p.id !== player.id),
        }));
      }
    }
  };

  const isPlayerInSquad = (
    player: Player,
    teamType: "home" | "away",
    position: "main" | "sub"
  ) => {
    const currentSquad = teamType === "home" ? homeSquad : awaySquad;

    if (position === "main") {
      return currentSquad.mainPlayers.some((p: Player) => p.id === player.id);
    } else {
      return currentSquad.substitutes.some((p: Player) => p.id === player.id);
    }
  };

  return {
    openPlayerPicker,
    togglePlayerInSquad,
    isPlayerInSquad,
  };
};
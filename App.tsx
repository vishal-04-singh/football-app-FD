"use client"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { StatusBar } from "expo-status-bar"
import { AuthProvider, useAuth } from "./src/contexts/AuthContext"
import { TournamentProvider } from "./src/contexts/TournamentContext"
import LoginScreen from "./src/screens/LoginScreen"
import HomeScreen from "./src/screens/HomeScreen"
import MatchesScreen from "./src/screens/MatchesScreen"
import TeamsScreen from "./src/screens/TeamsScreen"
import PointsTableScreen from "./src/screens/PointsTableScreen"
import LiveMatchScreen from "./src/screens/LiveMatchScreen"
import ManagementScreen from "./src/screens/ManagementScreen"
import ScheduleMatchScreen from "./src/screens/ScheduleMatchScreen"
import MatchFixtureScreen from "./src/screens/MatchFixtureScreen"
import SignupScreen from "./src/screens/SignupScreen"
import LoadingSpinner from "./components/LoadingSpinner"
import ErrorBoundary from "./components/ErrorBoundary"
import ConnectionStatus from "./components/ConnectionStatus"
import { Ionicons } from "@expo/vector-icons"
import { COLORS } from "./src/constants/colors"

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

function TabNavigator() {
  const { user } = useAuth()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline"
          } else if (route.name === "Matches") {
            iconName = focused ? "football" : "football-outline"
          } else if (route.name === "Teams") {
            iconName = focused ? "people" : "people-outline"
          } else if (route.name === "Points") {
            iconName = focused ? "trophy" : "trophy-outline"
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline"
          } else {
            iconName = "ellipse"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.black,
          borderTopColor: COLORS.primary,
        },
        headerStyle: {
          backgroundColor: COLORS.black,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerRight: () => <ConnectionStatus />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Teams" component={TeamsScreen} />
      <Tab.Screen name="Points" component={PointsTableScreen} />
      <Tab.Screen
        name="Profile"
        component={ManagementScreen}
        options={{
          title: user?.role === "spectator" ? "Profile" : "Management",
        }}
      />
    </Tab.Navigator>
  )
}

function AppNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner message="Loading your account..." />
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.black,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="LiveMatch" component={LiveMatchScreen} options={{ title: "Live Match" }} />
          <Stack.Screen name="ScheduleMatch" component={ScheduleMatchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MatchFixture" component={MatchFixtureScreen} options={{ headerShown: false }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  )
}

function AppContent() {
  return (
    <ErrorBoundary>
      <TournamentProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={COLORS.black} />
          <AppNavigator />
        </NavigationContainer>
      </TournamentProvider>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

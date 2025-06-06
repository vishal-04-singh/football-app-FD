"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { COLORS } from "../constants/colors"
import { useNavigation, useRoute } from "@react-navigation/native"
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack"
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons"

type AuthStackParamList = {
  Login: { email?: string; password?: string }
  Signup: undefined
}

type LoginScreenRouteProp = NativeStackScreenProps<AuthStackParamList, "Login">["route"]

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const { login, socialAuth } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, "Login">>()
  const route = useRoute<LoginScreenRouteProp>()

  // Set email and password if provided from signup screen
  useEffect(() => {
    if (route.params?.email) {
      setEmail(route.params.email)
    }
    if (route.params?.password) {
      setPassword(route.params.password)
    }
  }, [route.params])

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const success = await login(email, password)

      if (!success) {
        Alert.alert("Error", "Invalid credentials. Please check your email and password.")
      }
    } catch (error) {
      console.error("Login error:", error)
      Alert.alert("Login Failed", "An error occurred during login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const showDemoCredentials = () => {
    Alert.alert(
      "Demo Credentials",
      "Manager: manager@football.com\nCaptain: captain@team1.com\nFan: fan@football.com\n\nPassword: password",
      [{ text: "OK" }],
    )
  }

  const handleSocialLogin = async (provider: string) => {
    setSocialLoading(provider)
    try {
      // In a real app, we would get the token from the social provider's SDK
      // For now, we'll simulate this with a mock token
      const mockToken = "mock_social_token_" + Math.random().toString(36).substring(7)

      const success = await socialAuth(provider.toLowerCase(), mockToken)

      if (!success) {
        Alert.alert(`${provider} Login Failed`, "Could not authenticate with your social account.")
      }
    } catch (error) {
      console.error(`${provider} login error:`, error)
      Alert.alert(`${provider} Login Error`, "An error occurred during social login.")
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Image
              source={require("../../assets/ASL_logo.png")} // adjust path as needed
              style={{ width: 80, height: 80, resizeMode: "contain", marginBottom: 20 }}
            />
          </Text>
          <Text style={styles.title}>Football League</Text>
          <Text style={styles.subtitle}>Championship Manager</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.gray}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading && !socialLoading}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor={COLORS.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading && !socialLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
              disabled={loading || !!socialLoading}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, (loading || !!socialLoading) && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading || !!socialLoading}
          >
            {loading ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.loginButtonText}>Login</Text>}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.socialButton, socialLoading === "Google" && styles.loadingSocialButton]}
              onPress={() => handleSocialLogin("Google")}
              disabled={loading || !!socialLoading}
            >
              {socialLoading === "Google" ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <AntDesign name="google" size={20} color="white" style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, socialLoading === "Apple" && styles.loadingSocialButton]}
              onPress={() => handleSocialLogin("Apple")}
              disabled={loading || !!socialLoading}
            >
              {socialLoading === "Apple" ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <AntDesign name="apple1" size={22} color="white" style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, socialLoading === "Facebook" && styles.loadingSocialButton]}
              onPress={() => handleSocialLogin("Facebook")}
              disabled={loading || !!socialLoading}
            >
              {socialLoading === "Facebook" ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <FontAwesome name="facebook" size={20} color="white" style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Facebook</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.signupLink}
            onPress={() => navigation.navigate("Signup")}
            disabled={loading || !!socialLoading}
          >
            <Text style={styles.signupLinkText}>
              Don't have an account? <Text style={styles.signupLinkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={showDemoCredentials}
            disabled={loading || !!socialLoading}
          >
            <Text style={styles.demoButtonText}>Show Demo Credentials</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  logo: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
  },
  form: {
    width: "100%",
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    color: COLORS.white,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    color: COLORS.white,
    fontSize: 16,
  },
  eyeButton: {
    padding: 15,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 20,
    height: 56,
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.black,
    fontSize: 18,
    fontWeight: "bold",
  },
  demoButton: {
    alignItems: "center",
    padding: 10,
  },
  demoButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray,
  },
  dividerText: {
    color: COLORS.gray,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: COLORS.background,
    height: 48,
  },
  loadingSocialButton: {
    opacity: 0.8,
  },
  socialIcon: {
    marginRight: 6,
  },
  socialButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  signupLink: {
    alignItems: "center",
    padding: 15,
  },
  signupLinkText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  signupLinkBold: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
})

export default LoginScreen

"use client"

import type React from "react"
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native"
import { useAuth } from "../contexts/AuthContext"
import { COLORS } from "../constants/colors"
import { Ionicons } from "@expo/vector-icons"
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"
import { useNavigation } from "@react-navigation/native"
import { AntDesign, FontAwesome } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

type AuthStackParamList = {
  Login: { email?: string; password?: string }
  Signup: undefined
}

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, "Signup">>()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "spectator" as "management" | "captain" | "spectator",
  })
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { signup, socialAuth } = useAuth()

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }

    switch (field) {
      case "name":
        if (!value.trim()) {
          newErrors.name = "Full name is required"
        } else if (value.trim().length < 2) {
          newErrors.name = "Name must be at least 2 characters"
        } else {
          delete newErrors.name
        }
        break
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!value.trim()) {
          newErrors.email = "Email is required"
        } else if (!emailRegex.test(value)) {
          newErrors.email = "Please enter a valid email address"
        } else {
          delete newErrors.email
        }
        break
      case "password":
        if (!value) {
          newErrors.password = "Password is required"
        } else if (value.length < 6) {
          newErrors.password = "Password must be at least 6 characters"
        } else {
          delete newErrors.password
        }
        break
      case "confirmPassword":
        if (!value) {
          newErrors.confirmPassword = "Please confirm your password"
        } else if (value !== formData.password) {
          newErrors.confirmPassword = "Passwords do not match"
        } else {
          delete newErrors.confirmPassword
        }
        break
    }

    setErrors(newErrors)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      validateField(field, value)
    }
  }

  const handleSignup = async () => {
    // Validate all fields
    validateField("name", formData.name)
    validateField("email", formData.email)
    validateField("password", formData.password)
    validateField("confirmPassword", formData.confirmPassword)

    const hasErrors =
      Object.keys(errors).length > 0 ||
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword

    if (hasErrors) {
      Alert.alert("Please Fix Errors", "Complete all required fields correctly")
      return
    }

    setLoading(true)
    try {
      const success = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      })

      if (success) {
        Alert.alert(
          "Account Created Successfully!",
          `Welcome ${formData.name}! Your ${formData.role} account has been created. You can now login with your credentials.`,
          [
            {
              text: "Login Now",
              onPress: () => {
                navigation.navigate("Login", {
                  email: formData.email,
                  password: formData.password,
                })
              },
            },
          ],
        )
      } else {
        Alert.alert("Signup Failed", "Failed to create account. The email might already be in use.")
      }
    } catch (error) {
      console.error("Signup error:", error)
      Alert.alert("Signup Failed", "An error occurred while creating your account. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignup = async (provider: string) => {
    setSocialLoading(provider)
    try {
      // In a real app, we would get the token from the social provider's SDK
      // For now, we'll simulate this with a mock token
      const mockToken = "mock_social_token_" + Math.random().toString(36).substring(7)

      const success = await socialAuth(provider.toLowerCase(), mockToken)

      if (!success) {
        Alert.alert(`${provider} Signup Failed`, "Could not create an account with your social profile.")
      }
    } catch (error) {
      console.error(`${provider} signup error:`, error)
      Alert.alert(`${provider} Signup Error`, "An error occurred during social signup.")
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={loading || !!socialLoading}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Text style={styles.logoEmoji}>
                  <Image
                    source={require("../../assets/ASL_logo.png")} // adjust path as needed
                    style={{ width: 80, height: 80, resizeMode: "contain", marginBottom: 20 }}
                  />
                </Text>
              </View>
            </View>

            <Text style={styles.title}>Join the League</Text>
            <Text style={styles.subtitle}>Create your professional football account</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your full name"
                  placeholderTextColor={COLORS.gray}
                  value={formData.name}
                  onChangeText={(text) => handleInputChange("name", text)}
                  onBlur={() => validateField("name", formData.name)}
                  autoCapitalize="words"
                  editable={!loading && !socialLoading}
                />
                {formData.name.trim() && !errors.name && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your email address"
                  placeholderTextColor={COLORS.gray}
                  value={formData.email}
                  onChangeText={(text) => handleInputChange("email", text)}
                  onBlur={() => validateField("email", formData.email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading && !socialLoading}
                />
                {formData.email.trim() && !errors.email && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                )}
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password *</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Create a secure password"
                  placeholderTextColor={COLORS.gray}
                  value={formData.password}
                  onChangeText={(text) => handleInputChange("password", text)}
                  onBlur={() => validateField("password", formData.password)}
                  secureTextEntry={!showPassword}
                  editable={!loading && !socialLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading || !!socialLoading}
                >
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm your password"
                  placeholderTextColor={COLORS.gray}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange("confirmPassword", text)}
                  onBlur={() => validateField("confirmPassword", formData.confirmPassword)}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading && !socialLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading || !!socialLoading}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.gray}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Role Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[styles.roleButton, formData.role === "spectator" && styles.activeRoleButton]}
                  onPress={() => handleInputChange("role", "spectator")}
                  disabled={loading || !!socialLoading}
                >
                  <Text style={[styles.roleButtonText, formData.role === "spectator" && styles.activeRoleButtonText]}>
                    Fan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, formData.role === "captain" && styles.activeRoleButton]}
                  onPress={() => handleInputChange("role", "captain")}
                  disabled={loading || !!socialLoading}
                >
                  <Text style={[styles.roleButtonText, formData.role === "captain" && styles.activeRoleButtonText]}>
                    Captain
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, formData.role === "management" && styles.activeRoleButton]}
                  onPress={() => handleInputChange("role", "management")}
                  disabled={loading || !!socialLoading}
                >
                  <Text style={[styles.roleButtonText, formData.role === "management" && styles.activeRoleButtonText]}>
                    Manager
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (loading || !!socialLoading) && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading || !!socialLoading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.black} />
              ) : (
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View className="dividerLine" style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
              <View className="dividerLine" style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={[styles.socialButton, socialLoading === "Google" && styles.loadingSocialButton]}
                onPress={() => handleSocialSignup("Google")}
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
                onPress={() => handleSocialSignup("Apple")}
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
                onPress={() => handleSocialSignup("Facebook")}
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

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
              disabled={loading || !!socialLoading}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 40,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 60,
    padding: 10,
    borderRadius: 25,
    backgroundColor: COLORS.background,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    lineHeight: 22,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 15,
    minHeight: 56,
  },
  inputError: {
    borderColor: "#ff4757",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#ff4757",
    marginTop: 6,
    marginLeft: 4,
  },
  roleButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
    alignItems: "center",
    marginHorizontal: 4,
    backgroundColor: COLORS.background,
  },
  activeRoleButton: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  roleButtonText: {
    color: COLORS.gray,
    fontWeight: "600",
  },
  activeRoleButtonText: {
    color: COLORS.primary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gray,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray,
    paddingHorizontal: 16,
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
  loginLink: {
    alignItems: "center",
    padding: 16,
  },
  loginLinkText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  loginLinkBold: {
    color: COLORS.primary,
    fontWeight: "700",
  },
})

export default SignupScreen
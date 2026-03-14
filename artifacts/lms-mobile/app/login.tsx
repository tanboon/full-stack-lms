import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  useColorScheme, ScrollView, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (newMode: "login" | "register") => {
    if (newMode === mode) return;
    setError(null);
    setSuccess(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(slideAnim, {
      toValue: newMode === "register" ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
    setMode(newMode);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Login failed. Check your credentials.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) { setError("Please enter your full name."); return; }
    if (!regEmail.trim()) { setError("Please enter your email address."); return; }
    if (!/^\S+@\S+\.\S+$/.test(regEmail.trim())) { setError("Please enter a valid email address."); return; }
    if (regPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (regPassword !== regConfirm) { setError("Passwords do not match."); return; }

    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await register(regName.trim(), regEmail.trim().toLowerCase(), regPassword);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Registration failed. Try a different email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (role: "admin" | "student") => {
    if (role === "admin") { setEmail("admin@lms.com"); setPassword("securepass123"); }
    else { setEmail("student1@lms.com"); setPassword("securepass123"); }
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const indicatorLeft = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ["4%", "52%"] });

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandRow}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>LM</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.text, fontFamily: "Inter_700Bold" }]}>LMS Student</Text>
            <Text style={[styles.brandSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              University E-Learning Portal
            </Text>
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Mode Toggle */}
          <View style={[styles.toggleTrack, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Animated.View style={[styles.toggleIndicator, { backgroundColor: colors.primary, left: indicatorLeft }]} />
            <Pressable style={styles.toggleBtn} onPress={() => switchMode("login")}>
              <Text style={[styles.toggleText, { color: mode === "login" ? "#fff" : colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable style={styles.toggleBtn} onPress={() => switchMode("register")}>
              <Text style={[styles.toggleText, { color: mode === "register" ? "#fff" : colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {/* Title */}
          <View style={{ gap: 4 }}>
            <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {mode === "login"
                ? "Sign in to access your courses and exams"
                : "Join the university learning platform"}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: "#FF5C5C18", borderColor: "#FF5C5C40" }]}>
              <Feather name="alert-circle" size={14} color="#FF5C5C" />
              <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          )}

          {/* ── LOGIN FIELDS ── */}
          {mode === "login" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Email Address</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="mail" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textSecondary}
                    value={email} onChangeText={setEmail}
                    autoCapitalize="none" keyboardType="email-address"
                    autoComplete="email" returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Password</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary}
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPassword} autoComplete="password"
                    returnKeyType="done" onSubmitEditing={handleLogin}
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleLogin} disabled={isLoading}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 }]}
              >
                {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="log-in" size={16} color="#fff" />
                    <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
                  </>
                )}
              </Pressable>

              {/* Demo Quick-Fill */}
              <View style={styles.demoRow}>
                <Text style={[styles.demoLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Quick fill:</Text>
                <Pressable onPress={() => fillDemo("admin")} style={[styles.demoChip, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "12" }]}>
                  <Text style={[styles.demoChipText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Admin</Text>
                </Pressable>
                <Pressable onPress={() => fillDemo("student")} style={[styles.demoChip, { borderColor: colors.accent + "60", backgroundColor: colors.accent + "12" }]}>
                  <Text style={[styles.demoChipText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Student</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── REGISTER FIELDS ── */}
          {mode === "register" && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Full Name</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="user" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="Your full name"
                    placeholderTextColor={colors.textSecondary}
                    value={regName} onChangeText={setRegName}
                    autoCapitalize="words" returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Email Address</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="mail" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="your@email.com"
                    placeholderTextColor={colors.textSecondary}
                    value={regEmail} onChangeText={setRegEmail}
                    autoCapitalize="none" keyboardType="email-address"
                    autoComplete="email" returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Password</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="lock" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={colors.textSecondary}
                    value={regPassword} onChangeText={setRegPassword}
                    secureTextEntry={!showRegPassword} returnKeyType="next"
                  />
                  <Pressable onPress={() => setShowRegPassword(v => !v)} hitSlop={8}>
                    <Feather name={showRegPassword ? "eye-off" : "eye"} size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Confirm Password</Text>
                <View style={[styles.inputRow, {
                  backgroundColor: colors.background,
                  borderColor: regConfirm && regConfirm !== regPassword ? "#FF5C5C60" : colors.border,
                }]}>
                  <Feather name="shield" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                    placeholder="Repeat your password"
                    placeholderTextColor={colors.textSecondary}
                    value={regConfirm} onChangeText={setRegConfirm}
                    secureTextEntry={!showConfirm} returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
                    <Feather name={showConfirm ? "eye-off" : "eye"} size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
                {regConfirm.length > 0 && regConfirm !== regPassword && (
                  <Text style={[styles.fieldHint, { color: "#FF5C5C", fontFamily: "Inter_400Regular" }]}>
                    Passwords do not match
                  </Text>
                )}
              </View>

              {/* Strength hint */}
              {regPassword.length > 0 && (
                <View style={styles.strengthRow}>
                  {[4, 6, 8, 12].map((len, i) => (
                    <View
                      key={i}
                      style={[styles.strengthBar, {
                        backgroundColor: regPassword.length >= len
                          ? i < 2 ? "#FF5C5C" : i < 3 ? "#F7B731" : "#22C55E"
                          : colors.border,
                      }]}
                    />
                  ))}
                  <Text style={[styles.strengthLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {regPassword.length < 6 ? "Weak" : regPassword.length < 10 ? "Fair" : "Strong"}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleRegister} disabled={isLoading}
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 }]}
              >
                {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Feather name="user-plus" size={16} color="#fff" />
                    <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create Account</Text>
                  </>
                )}
              </Pressable>

              <Text style={[styles.termsText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                By creating an account you agree to the university's terms and conditions.
              </Text>
            </>
          )}
        </View>

        <Text style={[styles.footer, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          University LMS · Secure Authentication
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 28, alignSelf: "flex-start" },
  logoBox: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  brandName: { fontSize: 20 },
  brandSub: { fontSize: 13, marginTop: 1 },
  card: {
    width: "100%", borderRadius: 24, padding: 24, borderWidth: 1, gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
  },
  toggleTrack: {
    flexDirection: "row", borderRadius: 14, borderWidth: 1,
    padding: 4, position: "relative", height: 46, overflow: "hidden",
  },
  toggleIndicator: {
    position: "absolute", top: 4, width: "46%", height: 38, borderRadius: 11,
  },
  toggleBtn: { flex: 1, justifyContent: "center", alignItems: "center", zIndex: 1 },
  toggleText: { fontSize: 14 },
  title: { fontSize: 24 },
  subtitle: { fontSize: 14 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { color: "#FF5C5C", fontSize: 13, flex: 1 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 15 },
  fieldHint: { fontSize: 12, marginTop: 2 },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: -6 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, width: 40 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14, marginTop: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 16 },
  termsText: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  demoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  demoLabel: { fontSize: 12 },
  demoChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  demoChipText: { fontSize: 12 },
  footer: { fontSize: 12, marginTop: 24 },
});

import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  useColorScheme, ScrollView, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fillDemo = (role: "admin" | "student") => {
    if (role === "admin") {
      setEmail("admin@lms.com");
      setPassword("securepass123");
    } else {
      setEmail("student1@lms.com");
      setPassword("securepass123");
    }
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Brand */}
        <View style={styles.brandRow}>
          <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>LM</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              LMS Student
            </Text>
            <Text style={[styles.brandSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              University E-Learning Portal
            </Text>
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Welcome Back
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Sign in to access your courses and exams
          </Text>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: "#FF5C5C18", borderColor: "#FF5C5C40" }]}>
              <Feather name="alert-circle" size={14} color="#FF5C5C" />
              <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Email Address
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="mail" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
              Password
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="lock" size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Sign In Button */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.signInBtn,
              { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="log-in" size={16} color="#fff" />
                <Text style={[styles.signInText, { fontFamily: "Inter_600SemiBold" }]}>Sign In</Text>
              </>
            )}
          </Pressable>

          {/* Demo Quick-Fill */}
          <View style={styles.demoRow}>
            <Text style={[styles.demoLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Quick fill:
            </Text>
            <Pressable
              onPress={() => fillDemo("admin")}
              style={[styles.demoChip, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "12" }]}
            >
              <Text style={[styles.demoChipText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                Admin
              </Text>
            </Pressable>
            <Pressable
              onPress={() => fillDemo("student")}
              style={[styles.demoChip, { borderColor: colors.accent + "60", backgroundColor: colors.accent + "12" }]}
            >
              <Text style={[styles.demoChipText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                Student
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Footer */}
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
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 36, alignSelf: "flex-start" },
  logoBox: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  brandName: { fontSize: 20 },
  brandSub: { fontSize: 13, marginTop: 1 },
  card: {
    width: "100%", borderRadius: 24, padding: 24,
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
    gap: 16,
  },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14, marginTop: -8 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  errorText: { color: "#FF5C5C", fontSize: 13, flex: 1 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5,
  },
  input: { flex: 1, fontSize: 15 },
  signInBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 15, borderRadius: 14, marginTop: 4,
  },
  signInText: { color: "#fff", fontSize: 16 },
  demoRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 4,
  },
  demoLabel: { fontSize: 12 },
  demoChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  demoChipText: { fontSize: 12 },
  footer: { fontSize: 12, marginTop: 24 },
});

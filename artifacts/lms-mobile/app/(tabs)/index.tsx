import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

// [7.1] Personal Link-in-Bio: Flexbox, rounded images, Pressable with random color generation

const RANDOM_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#82E0AA", "#F0B27A",
];

function randomColor() {
  return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}

type LinkItem = {
  id: string;
  label: string;
  url: string;
  icon: string;
  color: string;
};

const INITIAL_LINKS: LinkItem[] = [
  { id: "1", label: "My Course Portfolio", url: "https://example.com", icon: "book-open", color: "#6C63FF" },
  { id: "2", label: "GitHub Projects", url: "https://github.com", icon: "github", color: "#24292E" },
  { id: "3", label: "LinkedIn Profile", url: "https://linkedin.com", icon: "linkedin", color: "#0077B5" },
  { id: "4", label: "Research Paper", url: "https://scholar.google.com", icon: "file-text", color: "#00D4AA" },
  { id: "5", label: "Student Blog", url: "https://example.com/blog", icon: "edit-3", color: "#FF5C5C" },
];

const SKILLS_BY_ROLE: Record<string, string[]> = {
  admin: ["System Admin", "User Management", "MongoDB", "Node.js", "React", "REST APIs"],
  instructor: ["Teaching", "Curriculum Design", "Node.js", "React", "TypeScript", "MongoDB"],
  student: ["React Native", "Node.js", "MongoDB", "TypeScript", "UI/UX Design", "REST APIs"],
};

const ROLE_LABELS: Record<string, string> = {
  admin: "System Administrator",
  instructor: "Course Instructor",
  student: "Student",
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [links, setLinks] = useState<LinkItem[]>(INITIAL_LINKS);

  const handleRandomize = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLinks(prev =>
      prev.map(l => l.id === id ? { ...l, color: randomColor() } : l)
    );
  }, []);

  const handleLink = useCallback((url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(url).catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const role = user?.role ?? "student";
  const skills = SKILLS_BY_ROLE[role] ?? SKILLS_BY_ROLE.student;
  const roleLabel = ROLE_LABELS[role] ?? "Student";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
              <Ionicons name="person" size={48} color={colors.primary} />
            </View>
          </View>
          <View style={[styles.statusDot, { borderColor: colors.card }]} />
        </View>

        <Text style={[styles.name, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          {user?.name ?? "Loading..."}
        </Text>
        <Text style={[styles.roleLabel, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
          {roleLabel}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {user?.email}
        </Text>

        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
          <Feather
            name={role === "admin" ? "shield" : role === "instructor" ? "book" : "user"}
            size={12}
            color={colors.primary}
          />
          <Text style={[styles.roleBadgeText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            {role.toUpperCase()}
          </Text>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: colors.border }]}
        >
          <Feather name="log-out" size={14} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>

      {/* Skills */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Skills</Text>
        <View style={styles.skillsWrap}>
          {skills.map(skill => (
            <View
              key={skill}
              style={[styles.skillTag, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
            >
              <Text style={[styles.skillText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                {skill}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Links</Text>
        <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Tap the color dot to randomize color
        </Text>
        {links.map(item => (
          <Pressable
            key={item.id}
            onPress={() => handleLink(item.url)}
            style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.linkIcon, { backgroundColor: item.color + "22" }]}>
              <Feather name={item.icon as any} size={18} color={item.color} />
            </View>
            <Text style={[styles.linkLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
              {item.label}
            </Text>
            {/* [7.1] Pressable random color dot */}
            <Pressable onPress={() => handleRandomize(item.id)} hitSlop={10}>
              <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            </Pressable>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 20, marginBottom: 8,
    padding: 24, borderRadius: 24,
    alignItems: "center", borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    gap: 6,
  },
  avatarWrapper: { position: "relative", marginBottom: 10 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, padding: 3, justifyContent: "center", alignItems: "center",
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: "center", alignItems: "center",
  },
  statusDot: {
    position: "absolute", bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#22C55E", borderWidth: 2,
  },
  name: { fontSize: 24, marginTop: 4 },
  roleLabel: { fontSize: 14 },
  email: { fontSize: 13 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  roleBadgeText: { fontSize: 11 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 8, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1,
  },
  logoutText: { fontSize: 13 },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  hint: { fontSize: 12, marginBottom: 10, marginTop: -6 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillTag: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  skillText: { fontSize: 13 },
  linkCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
    marginBottom: 10, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  linkIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  linkLabel: { flex: 1, fontSize: 15 },
  colorDot: { width: 18, height: 18, borderRadius: 9 },
});

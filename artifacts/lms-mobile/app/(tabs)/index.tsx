import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  useColorScheme,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

const SKILLS = ["React Native", "Node.js", "MongoDB", "TypeScript", "UI/UX Design", "REST APIs"];
const STATS = [
  { label: "Courses", value: "12" },
  { label: "Credits", value: "48" },
  { label: "GPA", value: "3.8" },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
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
          Alex Johnson
        </Text>
        <Text style={[styles.role, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
          Computer Science — Year 4
        </Text>
        <Text style={[styles.bio, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Passionate about building scalable systems and crafting seamless user experiences. Currently working on my thesis in distributed databases.
        </Text>

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          {STATS.map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < STATS.length - 1 && { borderRightColor: colors.border, borderRightWidth: 1 }]}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Skills */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Skills</Text>
        <View style={styles.skillsWrap}>
          {SKILLS.map(skill => (
            <View key={skill} style={[styles.skillTag, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.skillText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Links</Text>
        <Text style={[styles.hint, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Tap the color dot to randomize
        </Text>
        {links.map(link => (
          <Pressable
            key={link.id}
            style={({ pressed }) => [
              styles.linkCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
            onPress={() => handleLink(link.url)}
          >
            <View style={[styles.linkIcon, { backgroundColor: link.color + "22" }]}>
              <Feather name={link.icon as any} size={18} color={link.color} />
            </View>
            <Text style={[styles.linkLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
              {link.label}
            </Text>
            <Pressable
              onPress={(e) => { e.stopPropagation(); handleRandomize(link.id); }}
              hitSlop={10}
              style={[styles.colorDot, { backgroundColor: link.color }]}
            />
            <Feather name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarWrapper: { position: "relative", marginBottom: 16 },
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
  name: { fontSize: 24, marginBottom: 4 },
  role: { fontSize: 14, marginBottom: 12 },
  bio: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  statsRow: {
    flexDirection: "row", width: "100%",
    borderTopWidth: 1, paddingTop: 16, marginTop: 4,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11, marginTop: 2 },
  section: { marginTop: 24, paddingHorizontal: 20 },
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

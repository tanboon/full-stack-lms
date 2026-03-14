import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, useColorScheme, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const ENROLLED_KEY = "library_enrolled_courses";
const QUEUE_KEY = "exam_sync_queue_v2";

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22C55E",
  intermediate: "#F7B731",
  advanced: "#FF5C5C",
};

const CATEGORY_ICONS: Record<string, string> = {
  "web-dev": "monitor",
  "mobile-dev": "smartphone",
  "data-science": "bar-chart-2",
  "design": "pen-tool",
  "business": "briefcase",
  "other": "book",
};

type Course = {
  _id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  instructor: string;
  duration: number;
  enrolledCount: number;
  price: number;
};

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { user, token, logout } = useAuth();

  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load enrolled IDs from AsyncStorage
      const raw = await AsyncStorage.getItem(ENROLLED_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      setEnrolledIds(ids);

      // Load submitted exam count from queue
      const qRaw = await AsyncStorage.getItem(QUEUE_KEY);
      const q = qRaw ? JSON.parse(qRaw) : [];
      setSubmittedCount(q.filter((e: any) => e.status === "Synced").length);

      // Fetch all courses from API
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/courses?limit=100`, { headers });
      const json = await res.json();
      const all: Course[] = json.data ?? json.courses ?? [];
      setCourses(all);

      // Filter to enrolled only
      if (ids.length > 0) {
        setEnrolledCourses(all.filter(c => ids.includes(c._id)));
      } else {
        setEnrolledCourses([]);
      }
    } catch {
      setEnrolledCourses([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, []);

  // Reload whenever this tab gets focus (e.g. after enrolling from Library)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => { await logout(); router.replace("/login"); },
      },
    ]);
  };

  const role = user?.role ?? "student";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: 20 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
            {user?.name ?? "Student"}
          </Text>
        </View>
        <View style={[styles.avatarBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
          <Text style={[{ fontSize: 15, color: colors.primary, fontFamily: "Inter_700Bold" }]}>
            {(user?.name ?? "S").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { marginHorizontal: 20, marginTop: 20 }]}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: "#6C63FF18" }]}>
            <Feather name="book-open" size={18} color="#6C63FF" />
          </View>
          <Text style={[styles.statNum, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {enrolledIds.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Enrolled
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: "#22C55E18" }]}>
            <Feather name="check-circle" size={18} color="#22C55E" />
          </View>
          <Text style={[styles.statNum, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {submittedCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Exams Done
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIcon, { backgroundColor: "#F7B73118" }]}>
            <Feather name="layers" size={18} color="#F7B731" />
          </View>
          <Text style={[styles.statNum, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {courses.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Total Courses
          </Text>
        </View>
      </View>

      {/* My Courses */}
      <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            My Enrolled Courses
          </Text>
          {enrolledCourses.length > 0 && (
            <Pressable onPress={() => router.push("/(tabs)/library")}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                Browse More
              </Text>
            </Pressable>
          )}
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 8 }]}>
              Loading your courses...
            </Text>
          </View>
        ) : enrolledCourses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="book" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              No courses yet
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Browse the library and tap "Enroll" to add courses here
            </Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/library"); }}
              style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="search" size={15} color="#fff" />
              <Text style={[styles.browseBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                Browse Library
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {enrolledCourses.map(course => {
              const levelColor = LEVEL_COLOR[course.level] ?? "#6C63FF";
              const catIcon = CATEGORY_ICONS[course.category] ?? "book";
              return (
                <Pressable
                  key={course._id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/library/${course._id}`); }}
                  style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Icon */}
                  <View style={[styles.courseIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name={catIcon as any} size={22} color={colors.primary} />
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.courseTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                      {course.title}
                    </Text>
                    <View style={styles.courseMeta}>
                      <View style={[styles.levelBadge, { backgroundColor: levelColor + "18", borderColor: levelColor + "40" }]}>
                        <Text style={[styles.levelText, { color: levelColor, fontFamily: "Inter_500Medium" }]}>
                          {course.level}
                        </Text>
                      </View>
                      <Text style={[styles.courseMetaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                        {course.duration}h · {course.enrolledCount} enrolled
                      </Text>
                    </View>
                  </View>

                  {/* Arrow */}
                  <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Quick tip when enrolled */}
      {!isLoading && enrolledCourses.length > 0 && (
        <View style={[styles.tipCard, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30", marginHorizontal: 20, marginTop: 20 }]}>
          <Feather name="info" size={15} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
            Head to the <Text style={{ fontFamily: "Inter_600SemiBold" }}>Exams</Text> tab to take exams for your enrolled courses.
          </Text>
        </View>
      )}

      {/* Account Section */}
      <View style={{ marginHorizontal: 20, marginTop: 28 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 14 }]}>
          Account
        </Text>
        {/* User info card */}
        <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.accountAvatar, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}>
            <Text style={[styles.accountInitials, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {(user?.name ?? "S").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[{ fontSize: 15, color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {user?.name ?? "Student"}
            </Text>
            <Text style={[{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {user?.email ?? ""}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Text style={[{ fontSize: 11, color: colors.primary, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }]}>
                {user?.role ?? "student"}
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out button */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.signOutBtn,
            { backgroundColor: pressed ? "#FF5C5C20" : "#FF5C5C12", borderColor: "#FF5C5C35" },
          ]}
        >
          <Feather name="log-out" size={18} color="#FF5C5C" />
          <Text style={[styles.signOutText, { fontFamily: "Inter_600SemiBold" }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 13, marginBottom: 2 },
  userName: { fontSize: 24 },
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center", borderWidth: 1,
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    padding: 14, alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  statNum: { fontSize: 22 },
  statLabel: { fontSize: 11, textAlign: "center" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 18 },
  seeAll: { fontSize: 13 },
  centered: { alignItems: "center", paddingVertical: 40 },
  emptyCard: {
    borderRadius: 20, borderWidth: 1, padding: 32,
    alignItems: "center", gap: 10,
  },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },
  browseBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 14, marginTop: 8,
  },
  browseBtnText: { color: "#fff", fontSize: 15 },
  courseCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  courseIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  courseTitle: { fontSize: 15, lineHeight: 20 },
  courseMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  levelText: { fontSize: 11 },
  courseMetaText: { fontSize: 12 },
  tipCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  tipText: { fontSize: 13, lineHeight: 19, flex: 1 },
  accountCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 18, borderWidth: 1, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    marginBottom: 12,
  },
  accountAvatar: {
    width: 52, height: 52, borderRadius: 16,
    borderWidth: 1.5, justifyContent: "center", alignItems: "center", flexShrink: 0,
  },
  accountInitials: { fontSize: 18 },
  roleBadge: {
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, marginTop: 2,
  },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderRadius: 16, borderWidth: 1, paddingVertical: 14, marginBottom: 12,
  },
  signOutText: { fontSize: 15, color: "#FF5C5C" },
});

import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, useColorScheme, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

// [7.4] Real-time Multi-Source Dashboard: Promise.allSettled (2 APIs parallel),
// AsyncStorage offline cache mode

const CACHE_KEY = "dashboard_cache_v2";
const CACHE_TTL = 5 * 60 * 1000;

type Course = {
  _id: string;
  title: string;
  description: string;
  level: string;
  price: number;
  enrolledCount: number;
  category: string;
  tags: string[];
};

type Exam = {
  _id: string;
  examTitle: string;
  courseId?: { title: string };
  duration: number;
  passingScore: number;
  questions: any[];
};

type DashboardData = {
  courses: Course[];
  exams: Exam[];
  fetchedAt: number;
  fromCache: boolean;
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "#22C55E",
  intermediate: "#F7B731",
  advanced: "#FF5C5C",
};

function StatCard({ label, value, icon, color, colors }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <View style={[styles.statIconBox, { backgroundColor: color + "25" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "exams">("courses");

  const fetchDashboardData = useCallback(async (): Promise<DashboardData> => {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: DashboardData = JSON.parse(cached);
      if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
        return { ...parsed, fromCache: true };
      }
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    // [7.4] Promise.allSettled — fetch 2 APIs simultaneously, handle partial failures
    const [coursesResult, examsResult] = await Promise.allSettled([
      fetch(`${API_BASE}/courses`, { headers }).then(r => r.json()),
      fetch(`${API_BASE}/exams`, { headers }).then(r => r.json()),
    ]);

    const courses: Course[] = coursesResult.status === "fulfilled"
      ? (coursesResult.value.data ?? [])
      : [];
    const exams: Exam[] = examsResult.status === "fulfilled"
      ? (examsResult.value.data ?? [])
      : [];

    if (courses.length === 0 && exams.length === 0 && cached) {
      const parsed: DashboardData = JSON.parse(cached);
      return { ...parsed, fromCache: true };
    }

    const result: DashboardData = { courses, exams, fetchedAt: Date.now(), fromCache: false };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
    return result;
  }, [token]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch {
      setError("Failed to load data. Check your connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchDashboardData]);

  React.useEffect(() => { load(); }, []);

  const totalEnrolled = data?.courses.reduce((sum, c) => sum + (c.enrolledCount ?? 0), 0) ?? 0;
  const totalQuestions = data?.exams.reduce((sum, e) => sum + (e.questions?.length ?? 0), 0) ?? 0;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Loading from LMS backend...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); load(true); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Dashboard</Text>
          {data?.fromCache && (
            <View style={[styles.cacheBadge, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "40" }]}>
              <Feather name="database" size={10} color={colors.accent} />
              <Text style={[styles.cacheBadgeText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                Cached
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); load(true); }}
          style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Error */}
      {error && (
        <View style={[styles.errorCard, { backgroundColor: "#FF5C5C12", borderColor: "#FF5C5C30", marginHorizontal: 20, marginBottom: 16 }]}>
          <Feather name="wifi-off" size={16} color="#FF5C5C" />
          <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{error}</Text>
        </View>
      )}

      {/* Stats Grid */}
      {data && (
        <View style={styles.statsGrid}>
          <StatCard label="Courses" value={data.courses.length} icon="book-open" color="#6C63FF" colors={colors} />
          <StatCard label="Exams" value={data.exams.length} icon="check-square" color="#00D4AA" colors={colors} />
          <StatCard label="Enrollments" value={totalEnrolled} icon="users" color="#F7B731" colors={colors} />
          <StatCard label="Questions" value={totalQuestions} icon="help-circle" color="#FF5C5C" colors={colors} />
        </View>
      )}

      {/* Tab Bar */}
      {data && (
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20, marginBottom: 16 }]}>
          {(["courses", "exams"] as const).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[
                styles.tabText,
                { fontFamily: "Inter_500Medium" },
                activeTab === tab
                  ? { color: "#fff" }
                  : { color: colors.textSecondary },
              ]}>
                {tab === "courses" ? `Courses (${data.courses.length})` : `Exams (${data.exams.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Courses List */}
      {data && activeTab === "courses" && (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {data.courses.map((course, i) => (
            <View
              key={course._id}
              style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.courseNum, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.courseNumText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {i + 1}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.courseTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                  {course.title}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[course.level] ?? "#888") + "20" }]}>
                    <Text style={[styles.levelText, { color: LEVEL_COLORS[course.level] ?? "#888", fontFamily: "Inter_500Medium" }]}>
                      {course.level}
                    </Text>
                  </View>
                  <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {course.enrolledCount ?? 0} enrolled
                  </Text>
                  <Text style={[styles.metaText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
                    ${course.price}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Exams List */}
      {data && activeTab === "exams" && (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          {data.exams.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              No exams in database yet.
            </Text>
          ) : data.exams.map(exam => (
            <View
              key={exam._id}
              style={[styles.examCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.examIcon, { backgroundColor: colors.accent + "20" }]}>
                <Feather name="file-text" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.examTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {exam.examTitle}
                </Text>
                {exam.courseId?.title && (
                  <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                    {exam.courseId.title}
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={[styles.metaText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                    {exam.duration} min
                  </Text>
                  <Text style={[styles.metaText, { color: "#22C55E", fontFamily: "Inter_500Medium" }]}>
                    Pass: {exam.passingScore}%
                  </Text>
                  <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {exam.questions?.length ?? 0} questions
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Source footer */}
      {data && (
        <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20, marginTop: 20 }]}>
          <Feather name="zap" size={14} color={colors.accent} />
          <Text style={[styles.sourceText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Fetched via <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}>Promise.allSettled</Text> from 2 parallel API endpoints
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, marginBottom: 20 },
  title: { fontSize: 28 },
  cacheBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start" },
  cacheBadgeText: { fontSize: 11 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { fontSize: 14, flex: 1, color: "#FF5C5C" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { width: "47%", padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 12 },
  tabBar: { flexDirection: "row", borderRadius: 14, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14 },
  courseCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  courseNum: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", minWidth: 32 },
  courseNumText: { fontSize: 14 },
  courseTitle: { fontSize: 14, lineHeight: 20 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontSize: 11 },
  metaText: { fontSize: 12 },
  examCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  examIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  examTitle: { fontSize: 14, lineHeight: 20 },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
  sourceCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  sourceText: { fontSize: 12, flex: 1 },
});

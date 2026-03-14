import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, useColorScheme, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

// [7.4] Real-time Multi-Source Dashboard: Promise.allSettled (2 APIs parallel),
// AsyncStorage offline cache mode

const CACHE_KEY = "dashboard_cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 min

type Post = { id: number; title: string; body: string; userId: number };
type Todo = { id: number; title: string; completed: boolean; userId: number };
type DashboardData = {
  posts: Post[];
  todos: Todo[];
  fetchedAt: number;
  fromCache: boolean;
};

async function fetchDashboardData(): Promise<DashboardData> {
  // Check cache first
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed: DashboardData = JSON.parse(cached);
    if (Date.now() - parsed.fetchedAt < CACHE_TTL) {
      return { ...parsed, fromCache: true };
    }
  }

  // [7.4] Promise.allSettled — fetch from 2 APIs simultaneously, handle partial failures
  const [postsResult, todosResult] = await Promise.allSettled([
    fetch("https://jsonplaceholder.typicode.com/posts?_limit=6").then(r => r.json()),
    fetch("https://jsonplaceholder.typicode.com/todos?_limit=10").then(r => r.json()),
  ]);

  const posts: Post[] = postsResult.status === "fulfilled" ? postsResult.value : [];
  const todos: Todo[] = todosResult.status === "fulfilled" ? todosResult.value : [];

  // If both failed, return from cache if any
  if (posts.length === 0 && todos.length === 0 && cached) {
    const parsed: DashboardData = JSON.parse(cached);
    return { ...parsed, fromCache: true };
  }

  const data: DashboardData = { posts, todos, fetchedAt: Date.now(), fromCache: false };

  // Persist to cache for offline access
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  return data;
}

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
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "todos">("posts");

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData();
      setData(result);
    } catch (e) {
      setError("Failed to load data. Check your connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => { load(); }, []);

  const completedTodos = data?.todos.filter(t => t.completed).length ?? 0;
  const completionRate = data?.todos.length ? Math.round((completedTodos / data.todos.length) * 100) : 0;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Fetching from 2 sources...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }}
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
              <Feather name="wifi-off" size={10} color={colors.accent} />
              <Text style={[styles.cacheBadgeText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>Cached data</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); load(true); }}
          style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="refresh-cw" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Error */}
      {error && (
        <Pressable onPress={() => load()} style={[styles.errorCard, { backgroundColor: "#FF5C5C18", borderColor: "#FF5C5C40" }]}>
          <Feather name="alert-circle" size={16} color="#FF5C5C" />
          <Text style={[styles.errorText, { color: "#FF5C5C", fontFamily: "Inter_500Medium" }]}>{error} Tap to retry.</Text>
        </Pressable>
      )}

      {data && (
        <>
          {/* Stats */}
          <View style={styles.statsGrid}>
            <StatCard label="Articles" value={data.posts.length} icon="file-text" color={colors.primary} colors={colors} />
            <StatCard label="Tasks" value={data.todos.length} icon="check-square" color={colors.accent} colors={colors} />
            <StatCard label="Done" value={completedTodos} icon="check-circle" color="#22C55E" colors={colors} />
            <StatCard label="Progress" value={`${completionRate}%`} icon="trending-up" color="#F7B731" colors={colors} />
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Task Completion</Text>
              <Text style={[styles.progressPct, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{completionRate}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${completionRate}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[styles.progressSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {completedTodos} of {data.todos.length} tasks completed
            </Text>
          </View>

          {/* Tabs */}
          <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(["posts", "todos"] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => { Haptics.selectionAsync(); setActiveTab(tab); }}
                style={[styles.tab, activeTab === tab && { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.tabText, { color: activeTab === tab ? "#fff" : colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                  {tab === "posts" ? "Articles" : "Tasks"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Posts */}
          {activeTab === "posts" && (
            <View style={{ gap: 10, paddingHorizontal: 20 }}>
              {data.posts.map(post => (
                <View key={post.id} style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.postNum, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.postNumText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{post.id}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
                      {post.title.charAt(0).toUpperCase() + post.title.slice(1)}
                    </Text>
                    <Text style={[styles.postBody, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                      {post.body}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Todos */}
          {activeTab === "todos" && (
            <View style={{ gap: 8, paddingHorizontal: 20 }}>
              {data.todos.map(todo => (
                <View key={todo.id} style={[styles.todoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.todoCheck, { backgroundColor: todo.completed ? "#22C55E18" : colors.border + "60", borderColor: todo.completed ? "#22C55E" : colors.border }]}>
                    {todo.completed && <Feather name="check" size={12} color="#22C55E" />}
                  </View>
                  <Text style={[styles.todoText, { color: todo.completed ? colors.textSecondary : colors.text, fontFamily: "Inter_400Regular", textDecorationLine: todo.completed ? "line-through" : "none" }]} numberOfLines={2}>
                    {todo.title.charAt(0).toUpperCase() + todo.title.slice(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Source Info */}
          <View style={[styles.sourceCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20, marginTop: 20 }]}>
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.sourceText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Fetched via <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}>Promise.allSettled</Text> from 2 parallel APIs
            </Text>
          </View>
        </>
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
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { fontSize: 14, flex: 1 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  statCard: { width: "47%", padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 12 },
  progressCard: { marginHorizontal: 20, marginBottom: 16, padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 16 },
  progressPct: { fontSize: 18 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressSub: { fontSize: 12 },
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 16, borderRadius: 14, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 14 },
  postCard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  postNum: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  postNumText: { fontSize: 13 },
  postTitle: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  postBody: { fontSize: 12, lineHeight: 17 },
  todoCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  todoCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  todoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  sourceCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  sourceText: { fontSize: 12, flex: 1 },
});

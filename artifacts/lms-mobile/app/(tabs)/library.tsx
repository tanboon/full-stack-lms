import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, useColorScheme, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

// [7.3] Deep-Link Library Explorer — fetches real courses from backend,
// useLocalSearchParams in detail screen, favorites callback sync via AsyncStorage

const FAVORITES_KEY = "library_favorites";
const CACHE_KEY = "library_courses_cache";
const API_BASE = "https://c80ad5b9-f987-4edd-b1e4-e0e56710da93-00-28eoe9ojq7n75.riker.replit.dev/api";

type Course = {
  _id: string;
  title: string;
  description: string;
  instructor?: any;
  price: number;
  tags: string[];
  level: "beginner" | "intermediate" | "advanced";
  enrolled: number;
  thumbnail?: string;
  isFavorite?: boolean;
};

const LEVELS = ["All", "beginner", "intermediate", "advanced"];
const LEVEL_COLORS: Record<string, string> = {
  beginner: "#22C55E",
  intermediate: "#F7B731",
  advanced: "#FF5C5C",
};

async function fetchCourses(): Promise<Course[]> {
  const token = await AsyncStorage.getItem("lms_mobile_token");
  const res = await fetch(`${API_BASE}/courses`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await res.json();
  return (json.data ?? json.courses ?? []) as Course[];
}

export default function LibraryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<Course[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    if (json) setFavorites(new Set(JSON.parse(json)));
  }, []);

  const loadCourses = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCourses();
      if (data.length > 0) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
        setCourses(data);
      } else {
        // Try cache
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) setCourses(JSON.parse(cached));
      }
    } catch {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setCourses(JSON.parse(cached));
        setError("Offline — showing cached courses");
      } else {
        setError("Could not load courses. Check your connection.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
    loadCourses();
  }, []);

  // [7.3] Callback to sync favorite state back from detail screen
  const toggleFavorite = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const filtered = courses.filter(c => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchLevel = selectedLevel === "All" || c.level === selectedLevel;
    return matchSearch && matchLevel;
  });

  const favoriteCount = favorites.size;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Loading courses from backend...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Library</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {courses.length} courses from backend
            </Text>
          </View>
          <Pressable
            onPress={() => loadCourses(true)}
            style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name={favoriteCount > 0 ? "heart" : "refresh-cw"} size={18} color={favoriteCount > 0 ? "#FF5C5C" : colors.primary} />
            {favoriteCount > 0 && (
              <Text style={[styles.favCount, { color: "#FF5C5C", fontFamily: "Inter_600SemiBold" }]}>{favoriteCount}</Text>
            )}
          </Pressable>
        </View>

        {/* Error notice */}
        {error && (
          <View style={[styles.errorNotice, { backgroundColor: "#F7B73118", borderColor: "#F7B73140" }]}>
            <Feather name="wifi-off" size={12} color="#F7B731" />
            <Text style={[styles.errorNoticeText, { color: "#F7B731", fontFamily: "Inter_400Regular" }]}>{error}</Text>
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            placeholder="Search courses, tags..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Level filter */}
        <FlatList
          horizontal
          data={LEVELS}
          keyExtractor={s => s}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setSelectedLevel(item); }}
              style={[styles.levelChip, { backgroundColor: selectedLevel === item ? colors.primary : colors.card, borderColor: selectedLevel === item ? colors.primary : colors.border }]}
            >
              <Text style={[styles.levelChipText, { color: selectedLevel === item ? "#fff" : colors.text, fontFamily: "Inter_500Medium" }]}>
                {item === "All" ? "All" : item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Courses list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadCourses(true)} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="book-open" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>No courses found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isFav = favorites.has(item._id);
          const levelColor = LEVEL_COLORS[item.level] || colors.primary;
          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/library/[id]", params: { id: item._id, isFavorite: String(isFav) } });
              }}
              style={({ pressed }) => [
                styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
              ]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>{item.description}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.levelBadge, { backgroundColor: levelColor + "20" }]}>
                    <Text style={[styles.levelBadgeText, { color: levelColor, fontFamily: "Inter_500Medium" }]}>
                      {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
                    </Text>
                  </View>
                  <Feather name="users" size={12} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{item.enrolled}</Text>
                  <Text style={[styles.priceText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                    ฿{(item.price / 100).toFixed(0)}
                  </Text>
                </View>
                {item.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {item.tags.slice(0, 3).map(tag => (
                      <View key={tag} style={[styles.tag, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.tagText, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Pressable
                onPress={e => { e.stopPropagation(); toggleFavorite(item._id); }}
                hitSlop={10}
                style={{ paddingLeft: 8 }}
              >
                <Feather name={isFav ? "heart" : "heart"} size={20} color={isFav ? "#FF5C5C" : colors.textSecondary} />
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  favCount: { fontSize: 13 },
  errorNotice: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  errorNoticeText: { fontSize: 12, flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15 },
  levelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  levelChipText: { fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, lineHeight: 20 },
  cardDesc: { fontSize: 12, lineHeight: 17 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelBadgeText: { fontSize: 11 },
  metaText: { fontSize: 12 },
  priceText: { fontSize: 13 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 11 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 16 },
});

import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ActivityIndicator, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

// [7.3] Deep-Link Library Explorer: React Navigation Stack, fetch materials, useParams,
// callback to sync "Favorite" state back to parent

const FAVORITES_KEY = "library_favorites";

type Material = {
  id: string;
  title: string;
  author: string;
  subject: string;
  type: "Article" | "Video" | "PDF" | "Book";
  readTime: string;
  tags: string[];
  isFavorite: boolean;
};

const SUBJECTS = ["All", "CS", "Math", "Physics", "Data Science", "Networks"];

const SAMPLE_MATERIALS: Material[] = [
  { id: "1", title: "Introduction to Distributed Systems", author: "Prof. Smith", subject: "CS", type: "Article", readTime: "15 min", tags: ["Distributed", "Cloud", "CAP Theorem"], isFavorite: false },
  { id: "2", title: "Advanced MongoDB Aggregation Pipelines", author: "Dr. Lee", subject: "CS", type: "PDF", readTime: "30 min", tags: ["MongoDB", "NoSQL", "Database"], isFavorite: false },
  { id: "3", title: "React Native Performance Optimization", author: "Prof. Chen", subject: "CS", type: "Video", readTime: "45 min", tags: ["React Native", "Mobile", "Performance"], isFavorite: false },
  { id: "4", title: "Linear Algebra for ML", author: "Dr. Wilson", subject: "Math", type: "Book", readTime: "2 hrs", tags: ["Matrices", "Eigenvalues", "ML"], isFavorite: false },
  { id: "5", title: "Graph Neural Networks Survey", author: "Prof. Wang", subject: "Data Science", type: "PDF", readTime: "1 hr", tags: ["GNN", "Deep Learning", "Graphs"], isFavorite: false },
  { id: "6", title: "TCP/IP Stack Deep Dive", author: "Dr. Brown", subject: "Networks", type: "Article", readTime: "25 min", tags: ["Networking", "Protocols", "OSI"], isFavorite: false },
  { id: "7", title: "Quantum Computing Basics", author: "Prof. Kim", subject: "Physics", type: "Video", readTime: "50 min", tags: ["Quantum", "Qubits", "Algorithms"], isFavorite: false },
  { id: "8", title: "Docker & Kubernetes in Production", author: "Dr. Martinez", subject: "CS", type: "Book", readTime: "3 hrs", tags: ["DevOps", "Containers", "K8s"], isFavorite: false },
];

const TYPE_ICONS: Record<string, string> = {
  Article: "file-text",
  Video: "play-circle",
  PDF: "book",
  Book: "book-open",
};

const TYPE_COLORS: Record<string, string> = {
  Article: "#6C63FF",
  Video: "#FF5C5C",
  PDF: "#00D4AA",
  Book: "#F7B731",
};

export default function LibraryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const [materials, setMaterials] = useState<Material[]>(SAMPLE_MATERIALS);
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  // Load persisted favorites
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(json => {
      if (!json) return;
      const favIds: string[] = JSON.parse(json);
      setMaterials(prev => prev.map(m => ({ ...m, isFavorite: favIds.includes(m.id) })));
    });
  }, []);

  // Callback from detail screen to sync favorite state back [7.3]
  const onFavoriteToggle = useCallback((id: string, isFav: boolean) => {
    setMaterials(prev => {
      const next = prev.map(m => m.id === id ? { ...m, isFavorite: isFav } : m);
      const favIds = next.filter(m => m.isFavorite).map(m => m.id);
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favIds));
      return next;
    });
  }, []);

  const filtered = materials.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.author.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchSubject = selectedSubject === "All" || m.subject === selectedSubject;
    return matchSearch && matchSubject;
  });

  const favoriteCount = materials.filter(m => m.isFavorite).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Library</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {favoriteCount > 0 ? `${favoriteCount} saved` : "Reading materials"}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setMaterials(prev => prev.filter(m => m.isFavorite));
              Haptics.selectionAsync();
            }}
            style={[styles.favBtn, { backgroundColor: favoriteCount > 0 ? "#FF5C5C18" : colors.card, borderColor: colors.border }]}
          >
            <Feather name="heart" size={18} color={favoriteCount > 0 ? "#FF5C5C" : colors.textSecondary} />
            {favoriteCount > 0 && (
              <Text style={[styles.favCount, { color: "#FF5C5C", fontFamily: "Inter_600SemiBold" }]}>{favoriteCount}</Text>
            )}
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            placeholder="Search by title, author, tag..."
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

        {/* Subject Filter */}
        <FlatList
          horizontal
          data={SUBJECTS}
          keyExtractor={s => s}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { Haptics.selectionAsync(); setSelectedSubject(item); }}
              style={[styles.subjectChip, { backgroundColor: selectedSubject === item ? colors.primary : colors.card, borderColor: selectedSubject === item ? colors.primary : colors.border }]}
            >
              <Text style={[styles.subjectText, { color: selectedSubject === item ? "#fff" : colors.text, fontFamily: "Inter_500Medium" }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="book" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>No materials found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/library/[id]",
                params: {
                  id: item.id,
                  isFavorite: String(item.isFavorite),
                },
              });
            }}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
          >
            <View style={[styles.typeIcon, { backgroundColor: (TYPE_COLORS[item.type] || "#666") + "20" }]}>
              <Feather name={TYPE_ICONS[item.type] as any} size={20} color={TYPE_COLORS[item.type] || "#666"} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.cardAuthor, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{item.author}</Text>
              <View style={styles.cardMeta}>
                <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[item.type] || "#666") + "20" }]}>
                  <Text style={[styles.typeBadgeText, { color: TYPE_COLORS[item.type] || "#666", fontFamily: "Inter_500Medium" }]}>{item.type}</Text>
                </View>
                <Feather name="clock" size={12} color={colors.textSecondary} />
                <Text style={[styles.readTime, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{item.readTime}</Text>
              </View>
            </View>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onFavoriteToggle(item.id, !item.isFavorite);
              }}
              hitSlop={10}
            >
              <Feather name="heart" size={20} color={item.isFavorite ? "#FF5C5C" : colors.textSecondary} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 28 },
  subtitle: { fontSize: 14, marginTop: 2 },
  favBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  favCount: { fontSize: 13 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subjectText: { fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  typeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 15, lineHeight: 20 },
  cardAuthor: { fontSize: 13 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 11 },
  readTime: { fontSize: 12 },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 16 },
});

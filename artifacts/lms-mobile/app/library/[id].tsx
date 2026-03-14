import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  useColorScheme, Share, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

// [7.3] Deep-Link Library Explorer — useLocalSearchParams, callback to sync Favorite back

const FAVORITES_KEY = "library_favorites";

const MATERIAL_DETAILS: Record<string, any> = {
  "1": { title: "Introduction to Distributed Systems", author: "Prof. Smith", subject: "CS", type: "Article", readTime: "15 min", tags: ["Distributed", "Cloud", "CAP Theorem"], description: "This article covers the fundamentals of distributed systems including consistency, availability, and partition tolerance. We explore the CAP theorem in depth, examining real-world trade-offs made by systems like Cassandra, DynamoDB, and Zookeeper.", highlights: ["CAP Theorem explained", "ACID vs BASE", "Consensus algorithms", "Leader election patterns"] },
  "2": { title: "Advanced MongoDB Aggregation Pipelines", author: "Dr. Lee", subject: "CS", type: "PDF", readTime: "30 min", tags: ["MongoDB", "NoSQL", "Database"], description: "Deep dive into MongoDB's aggregation framework — from $match and $group to advanced stages like $facet, $lookup, and $graphLookup. Covers performance optimization with explain plans.", highlights: ["$lookup joins", "$facet multi-facet aggregations", "Index strategies", "Pipeline optimization"] },
  "3": { title: "React Native Performance Optimization", author: "Prof. Chen", subject: "CS", type: "Video", readTime: "45 min", tags: ["React Native", "Mobile", "Performance"], description: "Practical techniques to optimize React Native apps: using Hermes engine, Reanimated 3, FlatList optimization, and memoization patterns. Covers New Architecture and JSI.", highlights: ["Reanimated 3 worklets", "Hermes engine setup", "FlatList vs FlashList", "useMemo/useCallback patterns"] },
  "4": { title: "Linear Algebra for ML", author: "Dr. Wilson", subject: "Math", type: "Book", readTime: "2 hrs", tags: ["Matrices", "Eigenvalues", "ML"], description: "Essential linear algebra concepts for machine learning: vectors, matrices, determinants, eigenvalues, and singular value decomposition. Each concept illustrated with Python code.", highlights: ["SVD decomposition", "PCA foundations", "Matrix factorization", "Gradient descent geometry"] },
  "5": { title: "Graph Neural Networks Survey", author: "Prof. Wang", subject: "Data Science", type: "PDF", readTime: "1 hr", tags: ["GNN", "Deep Learning", "Graphs"], description: "Comprehensive survey of graph neural network architectures including GCN, GAT, GraphSAGE, and more. Applications in social networks, molecular biology, and recommendation systems.", highlights: ["Message passing framework", "Attention mechanisms", "Scalability challenges", "Benchmark datasets"] },
  "6": { title: "TCP/IP Stack Deep Dive", author: "Dr. Brown", subject: "Networks", type: "Article", readTime: "25 min", tags: ["Networking", "Protocols", "OSI"], description: "From physical layer to application layer — how data packets travel across the internet. Covers TCP handshakes, UDP trade-offs, congestion control, and modern QUIC protocol.", highlights: ["3-way handshake", "Congestion control algorithms", "HTTP/3 and QUIC", "NAT traversal"] },
  "7": { title: "Quantum Computing Basics", author: "Prof. Kim", subject: "Physics", type: "Video", readTime: "50 min", tags: ["Quantum", "Qubits", "Algorithms"], description: "Introduction to quantum computing: superposition, entanglement, quantum gates, and algorithms. Covers Shor's factoring algorithm and Grover's search algorithm.", highlights: ["Qubit superposition", "Quantum entanglement", "Grover's algorithm", "Quantum error correction"] },
  "8": { title: "Docker & Kubernetes in Production", author: "Dr. Martinez", subject: "CS", type: "Book", readTime: "3 hrs", tags: ["DevOps", "Containers", "K8s"], description: "Production-grade container orchestration with Kubernetes. Covers deployment strategies, service meshes, monitoring, auto-scaling, and disaster recovery.", highlights: ["Rolling deployments", "Horizontal Pod Autoscaler", "Service mesh with Istio", "GitOps workflows"] },
};

const TYPE_COLORS: Record<string, string> = {
  Article: "#6C63FF",
  Video: "#FF5C5C",
  PDF: "#00D4AA",
  Book: "#F7B731",
};

export default function MaterialDetailScreen() {
  const { id, isFavorite: initialFav } = useLocalSearchParams<{ id: string; isFavorite: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const [isFavorite, setIsFavorite] = useState(initialFav === "true");
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const material = MATERIAL_DETAILS[id ?? "1"] ?? MATERIAL_DETAILS["1"];
  const typeColor = TYPE_COLORS[material.type] || "#6C63FF";

  // Animate heart on toggle
  const animateHeart = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, tension: 300 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();
  }, [scaleAnim]);

  // Toggle favorite and sync back to library list via AsyncStorage [7.3]
  const toggleFavorite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateHeart();
    const newFav = !isFavorite;
    setIsFavorite(newFav);
    // Persist
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    const favIds: string[] = json ? JSON.parse(json) : [];
    const updated = newFav ? [...new Set([...favIds, id])] : favIds.filter(f => f !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  }, [isFavorite, id, animateHeart]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Reading Material</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Pressable
            onPress={toggleFavorite}
            style={[styles.favBtn, { backgroundColor: isFavorite ? "#FF5C5C18" : colors.card, borderColor: isFavorite ? "#FF5C5C40" : colors.border }]}
          >
            <Feather name="heart" size={20} color={isFavorite ? "#FF5C5C" : colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: typeColor + "15" }]}>
          <View style={[styles.typeIconLarge, { backgroundColor: typeColor + "25" }]}>
            <Feather name={material.type === "Video" ? "play-circle" : material.type === "PDF" ? "book" : "file-text"} size={40} color={typeColor} />
          </View>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <Text style={[styles.typeBadgeText, { fontFamily: "Inter_600SemiBold" }]}>{material.type}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 16 }}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{material.title}</Text>
          <View style={styles.metaRow}>
            <Feather name="user" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{material.author}</Text>
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <Feather name="clock" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{material.readTime}</Text>
            <View style={[styles.dot, { backgroundColor: colors.border }]} />
            <Text style={[styles.metaText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>{material.subject}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagsRow}>
            {material.tags.map((tag: string) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Overview</Text>
            <Text style={[styles.description, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{material.description}</Text>
          </View>

          {/* Key Highlights */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Key Topics</Text>
            {material.highlights.map((h: string, i: number) => (
              <View key={i} style={styles.highlightRow}>
                <View style={[styles.bullet, { backgroundColor: typeColor }]} />
                <Text style={[styles.highlightText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>{h}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [styles.readBtn, { backgroundColor: typeColor, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Feather name={material.type === "Video" ? "play" : "book-open"} size={18} color="#fff" />
            <Text style={[styles.readBtnText, { fontFamily: "Inter_600SemiBold" }]}>
              {material.type === "Video" ? "Watch Now" : "Read Now"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  headerLabel: { fontSize: 14 },
  favBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  hero: { alignItems: "center", paddingVertical: 40, gap: 16 },
  typeIconLarge: { width: 90, height: 90, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  typeBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  typeBadgeText: { color: "#fff", fontSize: 13 },
  title: { fontSize: 22, lineHeight: 30 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  metaText: { fontSize: 13 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 12 },
  section: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  sectionTitle: { fontSize: 16, marginBottom: 4 },
  description: { fontSize: 14, lineHeight: 22 },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  highlightText: { fontSize: 14, flex: 1 },
  readBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 16, borderRadius: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  readBtnText: { color: "#fff", fontSize: 16 },
});

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  useColorScheme, ActivityIndicator, Alert, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useAuth, API_BASE } from "@/contexts/AuthContext";

// [7.3] Deep-Link Library Explorer — useLocalSearchParams, real course data from API

const FAVORITES_KEY = "library_favorites";
const ENROLLED_KEY = "library_enrolled_courses";

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22C55E",
  intermediate: "#F7B731",
  advanced: "#FF5C5C",
};

const CATEGORY_LABELS: Record<string, string> = {
  "web-dev": "Web Development",
  "mobile-dev": "Mobile Development",
  "data-science": "Data Science",
  "design": "Design",
  "business": "Business",
  "other": "Other",
};

export default function CourseDetailScreen() {
  const { id, isFavorite: initialFav } = useLocalSearchParams<{ id: string; isFavorite: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(initialFav === "true");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Show brief toast message
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  // Load course from API + check persisted enrolment
  const loadCourse = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/courses/${id}`, { headers });
      const json = await res.json();
      if (json.status === "success") {
        setCourse(json.data);
      } else {
        setError("Could not load course details.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  // Check persisted enrollment and favourite state on mount
  useEffect(() => {
    loadCourse();
    (async () => {
      const raw = await AsyncStorage.getItem(ENROLLED_KEY);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (id && ids.includes(id)) setEnrolled(true);
      // Also re-read favourite from storage (may differ from param)
      const favRaw = await AsyncStorage.getItem(FAVORITES_KEY);
      const favIds: string[] = favRaw ? JSON.parse(favRaw) : [];
      if (id) setIsFavorite(favIds.includes(id));
    })();
  }, [id]);

  // Persist favorite to AsyncStorage [7.3]
  const toggleFavorite = useCallback(async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newFav = !isFavorite;
    setIsFavorite(newFav);
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    const favIds: string[] = json ? JSON.parse(json) : [];
    const updated = newFav ? [...new Set([...favIds, id])] : favIds.filter((f: string) => f !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    showToast(newFav ? "Added to favourites" : "Removed from favourites");
  }, [isFavorite, id, showToast]);

  const handleEnroll = useCallback(async () => {
    if (!id || !token) {
      Alert.alert("Sign In Required", "Please log in to enroll in courses.");
      return;
    }
    if (enrolled) return;
    setIsEnrolling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/courses/${id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setEnrolled(true);
        // Persist enrollment locally so it survives navigation
        const raw = await AsyncStorage.getItem(ENROLLED_KEY);
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (!ids.includes(id)) {
          await AsyncStorage.setItem(ENROLLED_KEY, JSON.stringify([...ids, id]));
        }
        // Update local seat count
        setCourse((c: any) => c ? { ...c, enrolledCount: (c.enrolledCount ?? 0) + 1, seats: Math.max(0, (c.seats ?? 0) - 1) } : c);
        showToast("Enrolled successfully!");
      } else {
        Alert.alert("Enrollment Failed", json.message ?? "Could not enroll. The course may be full.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setIsEnrolling(false);
    }
  }, [id, token, enrolled, showToast]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[{ color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 }]}>
          Loading course...
        </Text>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color="#FF5C5C" />
        <Text style={[{ color: colors.text, fontFamily: "Inter_600SemiBold", marginTop: 12, fontSize: 16 }]}>
          {error ?? "Course not found"}
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.backPill, { borderColor: colors.border }]}>
          <Feather name="arrow-left" size={14} color={colors.textSecondary} />
          <Text style={[{ color: colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 13 }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const levelColor = LEVEL_COLOR[course.level] ?? "#6C63FF";
  const saleActive = course.discount > 0 && course.salePrice;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toast overlay */}
      {toastMsg && (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              bottom: insets.bottom + 40,
              backgroundColor: isFavorite && toastMsg?.includes("Added") ? "#FF5C5C" : "#1a1a2e",
              pointerEvents: "none",
            }
          ]}
        >
          <Feather
            name={toastMsg.includes("favour") ? "heart" : "check-circle"}
            size={16}
            color="#fff"
          />
          <Text style={[styles.toastText, { fontFamily: "Inter_600SemiBold" }]}>{toastMsg}</Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <View style={styles.heroContent}>
            {/* Back + Favorite */}
            <View style={styles.heroNav}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
                style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              >
                <Feather name="arrow-left" size={20} color="#fff" />
              </Pressable>
              <Pressable
                onPress={toggleFavorite}
                style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
              >
                <Feather name={isFavorite ? "heart" : "heart"} size={20} color={isFavorite ? "#FF5C5C" : "#fff"} />
              </Pressable>
            </View>

            {/* Level + Category */}
            <View style={styles.heroBadges}>
              <View style={[styles.badge, { backgroundColor: levelColor + "30", borderColor: levelColor + "60" }]}>
                <Text style={[styles.badgeText, { color: "#fff" }]}>{course.level?.toUpperCase()}</Text>
              </View>
              {course.category && (
                <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Text style={[styles.badgeText, { color: "#fff" }]}>{CATEGORY_LABELS[course.category] ?? course.category}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.heroTitle, { fontFamily: "Inter_700Bold" }]}>{course.title}</Text>

            {/* Instructor */}
            <View style={styles.instructorRow}>
              <View style={[styles.avatarSmall, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                <Feather name="user" size={12} color="#fff" />
              </View>
              <Text style={[styles.instructorName, { fontFamily: "Inter_500Medium" }]}>
                {course.instructorName ?? "University Instructor"}
              </Text>
            </View>
          </View>
        </View>

        {/* Price + Enroll */}
        <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.priceRow}>
            <View>
              {saleActive ? (
                <>
                  <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>${course.price}</Text>
                  <Text style={[styles.salePrice, { color: "#22C55E", fontFamily: "Inter_700Bold" }]}>${course.salePrice}</Text>
                </>
              ) : (
                <Text style={[styles.salePrice, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                  {course.price === 0 ? "Free" : `$${course.price}`}
                </Text>
              )}
              {saleActive && (
                <View style={styles.discountTag}>
                  <Text style={[styles.discountText, { fontFamily: "Inter_700Bold" }]}>{course.discount}% OFF</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={enrolled ? undefined : handleEnroll}
              disabled={isEnrolling || enrolled || course.seats === 0}
              style={[
                styles.enrollBtn,
                {
                  backgroundColor: enrolled ? "#22C55E" : course.seats === 0 ? colors.border : colors.primary,
                  opacity: isEnrolling ? 0.7 : 1,
                }
              ]}
            >
              {isEnrolling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name={enrolled ? "check" : "user-plus"} size={16} color="#fff" />
                  <Text style={[styles.enrollText, { fontFamily: "Inter_700Bold" }]}>
                    {enrolled ? "Enrolled" : course.seats === 0 ? "Full" : "Enroll Now"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Quick stats */}
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <View style={styles.statItem}>
              <Feather name="users" size={14} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {course.enrolledCount ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Enrolled</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Feather name="star" size={14} color="#F7B731" />
              <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {course.rating?.toFixed(1) ?? "N/A"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Rating</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Feather name="database" size={14} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {course.seats ?? "∞"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Seats Left</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>About This Course</Text>
          <Text style={[styles.descText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {course.description || "No description provided."}
          </Text>
        </View>

        {/* Tags */}
        {course.tags?.length > 0 && (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Topics</Text>
            <View style={styles.tagsRow}>
              {course.tags.map((tag: string) => (
                <View key={tag} style={[styles.tagChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
                  <Text style={[styles.tagText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews Preview */}
        {course.reviews?.length > 0 && (
          <View style={[styles.section, { borderTopColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Reviews ({course.reviews.length})
            </Text>
            {course.reviews.slice(0, 3).map((review: any, idx: number) => (
              <View key={idx} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <View style={[styles.avatarSmall, { backgroundColor: colors.primary + "20" }]}>
                    <Feather name="user" size={12} color={colors.primary} />
                  </View>
                  <Text style={[{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.text }]}>
                    {review.userName ?? "Student"}
                  </Text>
                  <View style={styles.stars}>
                    {[1,2,3,4,5].map(s => (
                      <Feather key={s} name="star" size={11} color={s <= (review.rating ?? 5) ? "#F7B731" : colors.border} />
                    ))}
                  </View>
                </View>
                {review.comment && (
                  <Text style={[{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 18 }]}>
                    {review.comment}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center", gap: 8 },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  hero: {
    minHeight: 240,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 20,
    paddingBottom: 28,
    justifyContent: "flex-end",
  },
  heroContent: { gap: 10 },
  heroNav: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  heroBadges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "transparent" },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, color: "#fff", lineHeight: 30 },
  instructorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarSmall: { width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  instructorName: { fontSize: 13, color: "rgba(255,255,255,0.85)" },
  priceCard: {
    margin: 20, borderRadius: 20, borderWidth: 1, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  originalPrice: { fontSize: 13, textDecorationLine: "line-through" },
  salePrice: { fontSize: 26 },
  discountTag: { marginTop: 4, backgroundColor: "#22C55E20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  discountText: { fontSize: 11, color: "#22C55E" },
  enrollBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  enrollText: { color: "#fff", fontSize: 15 },
  statsRow: { flexDirection: "row", borderTopWidth: 1, paddingTop: 14 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 16 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, marginHorizontal: 4 },
  section: { paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 17 },
  descText: { fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 12 },
  reviewCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  stars: { flexDirection: "row", gap: 2, marginLeft: "auto" },
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: { color: "#fff", fontSize: 14 },
});

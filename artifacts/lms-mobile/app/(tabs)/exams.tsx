import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, useColorScheme, Alert,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

// [7.5] Offline-First Exam Synchronizer:
// - Fetch real exams from backend
// - Submit exam answers offline → save to AsyncStorage with "Pending" status
// - NetInfo detects network return → trigger FIFO background sync queue
// - Auto-update status from "Pending" → "Synced" (or "Failed")

const QUEUE_KEY = "exam_sync_queue_v2";
const ENROLLED_KEY = "library_enrolled_courses";

type RealQuestion = {
  _id: string;
  text: string;
  type: "mcq" | "truefalse" | "short";
  options?: string[];
  correctAnswer?: string;
  points: number;
};

type RealExam = {
  _id: string;
  examTitle: string;
  courseId?: { _id: string; title: string };
  duration: number;
  passingScore: number;
  questions: RealQuestion[];
  shuffleQuestions?: boolean;
};

type ExamAnswer = {
  syncId: string;
  examId: string;
  examName: string;
  answers: Record<string, string>;
  submittedAt: number;
  status: "Pending" | "Syncing" | "Synced" | "Failed";
  syncedAt?: number;
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
};

type ScoreResult = {
  examTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  passingScore: number;
  breakdown: { questionText: string; userAnswer: string; correctAnswer: string; isCorrect: boolean; pointsEarned: number; pointsMax: number }[];
};

function StatusBadge({ status, colors }: { status: ExamAnswer["status"]; colors: any }) {
  const config: Record<ExamAnswer["status"], { color: string; icon: string; label: string }> = {
    Pending: { color: "#F7B731", icon: "clock", label: "Pending" },
    Syncing: { color: "#6C63FF", icon: "refresh-cw", label: "Syncing..." },
    Synced: { color: "#22C55E", icon: "check-circle", label: "Synced" },
    Failed: { color: "#FF5C5C", icon: "x-circle", label: "Failed" },
  };
  const { color, icon, label } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      <Feather name={icon as any} size={12} color={color} />
      <Text style={[styles.statusText, { color, fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
    </View>
  );
}

export default function ExamsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [exams, setExams] = useState<RealExam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<RealExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<ExamAnswer[]>([]);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const isSyncingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load enrolled course IDs — backend is source of truth, AsyncStorage is cache
  const loadEnrolled = useCallback(async () => {
    try {
      if (token) {
        const res = await fetch(`${API_BASE}/courses/my-enrollments`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          const ids: string[] = (json.data ?? []).map((oid: any) => oid.toString());
          await AsyncStorage.setItem(ENROLLED_KEY, JSON.stringify(ids));
          setEnrolledIds(new Set(ids));
          return;
        }
      }
    } catch {}
    // Fallback: read from AsyncStorage cache
    const raw = await AsyncStorage.getItem(ENROLLED_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    setEnrolledIds(new Set(ids));
  }, [token]);

  // Load queue from AsyncStorage
  const loadQueue = useCallback(async () => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (raw) setQueue(JSON.parse(raw));
  }, []);

  const saveQueue = useCallback(async (q: ExamAnswer[]) => {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    setQueue(q);
  }, []);

  // Fetch real exams from backend
  const fetchExams = useCallback(async () => {
    setIsLoadingExams(true);
    setExamsError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/exams`, { headers });
      const json = await res.json();
      if (json.status === "success") {
        setExams(json.data ?? []);
      } else if (res.status === 429) {
        setExamsError("Too many requests. Please wait a moment and try again.");
      } else if (res.status === 401) {
        setExamsError("Session expired. Please sign out and log in again.");
      } else {
        setExamsError(json.message ?? "Could not load exams. Please try again.");
      }
    } catch {
      setExamsError("Network error. Check your connection.");
    } finally {
      setIsLoadingExams(false);
    }
  }, [token]);

  // [7.5] FIFO background sync
  const syncQueue = useCallback(async (currentQueue: ExamAnswer[]) => {
    if (isSyncingRef.current) return;
    const pendingItems = currentQueue.filter(item => item.status === "Pending");
    if (pendingItems.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);

    let updatedQueue = [...currentQueue];

    for (const item of pendingItems) {
      updatedQueue = updatedQueue.map(q =>
        q.syncId === item.syncId ? { ...q, status: "Syncing" as const } : q
      );
      await saveQueue(updatedQueue);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch(`${API_BASE}/exams/${item.examId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ answers: item.answers, submittedAt: item.submittedAt }),
        });
        const resultJson = await resp.json();
        const resultData = resultJson.data;
        updatedQueue = updatedQueue.map(q =>
          q.syncId === item.syncId ? {
            ...q,
            status: "Synced" as const,
            syncedAt: Date.now(),
            score: resultData?.score,
            totalPoints: resultData?.totalPoints,
            percentage: resultData?.percentage,
            passed: resultData?.passed,
          } : q
        );
        // Show score modal for the most recent submission
        if (resultData && item.syncId === pendingItems[pendingItems.length - 1].syncId) {
          setScoreResult(resultData as ScoreResult);
        }
      } catch {
        updatedQueue = updatedQueue.map(q =>
          q.syncId === item.syncId ? { ...q, status: "Failed" as const } : q
        );
      }
      await saveQueue(updatedQueue);
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
  }, [token, saveQueue]);

  useEffect(() => { loadQueue(); fetchExams(); loadEnrolled(); }, []);

  // Reload enrolled IDs whenever this tab gains focus
  useFocusEffect(
    useCallback(() => { loadEnrolled(); }, [loadEnrolled])
  );

  // [7.5] NetInfo — detect network changes and auto-trigger sync
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected === true;
      setIsOnline(online);
      if (online) {
        setQueue(currentQueue => {
          if (currentQueue.some(i => i.status === "Pending")) {
            syncQueue(currentQueue);
          }
          return currentQueue;
        });
      }
    });
    return () => unsubscribe();
  }, [syncQueue]);

  // Pulse animation for online dot
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  const handleSubmit = useCallback(async () => {
    if (!selectedExam) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const entry: ExamAnswer = {
      syncId: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      examId: selectedExam._id,
      examName: selectedExam.examTitle,
      answers,
      submittedAt: Date.now(),
      status: "Pending",
    };

    const newQueue = [...queue, entry];
    await saveQueue(newQueue);
    setSelectedExam(null);
    setAnswers({});
    setIsSubmitting(false);

    if (isOnline) {
      setTimeout(() => syncQueue(newQueue), 300);
    } else {
      Alert.alert(
        "Saved Offline",
        "Your answers are saved and will sync automatically when you're back online.",
        [{ text: "OK" }]
      );
    }
  }, [selectedExam, answers, queue, isOnline, saveQueue, syncQueue]);

  // Score result screen
  if (scoreResult) {
    const pct = scoreResult.percentage;
    const passed = scoreResult.passed;
    const passColor = passed ? "#22C55E" : "#FF5C5C";
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Result Hero */}
          <View style={{ alignItems: "center", paddingHorizontal: 24, paddingVertical: 32 }}>
            <View style={[styles.scoreCircle, { borderColor: passColor, backgroundColor: passColor + "15" }]}>
              <Text style={[styles.scorePercent, { color: passColor, fontFamily: "Inter_700Bold" }]}>{pct}%</Text>
              <Text style={[{ fontSize: 12, color: passColor, fontFamily: "Inter_500Medium", marginTop: 2 }]}>
                {passed ? "PASSED" : "FAILED"}
              </Text>
            </View>
            <Text style={[{ fontSize: 22, fontFamily: "Inter_700Bold", color: colors.text, marginTop: 20, textAlign: "center" }]}>
              {passed ? "Congratulations! 🎉" : "Keep Practicing"}
            </Text>
            <Text style={[{ fontSize: 14, color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "center" }]}>
              {scoreResult.examTitle}
            </Text>

            {/* Stats Row */}
            <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{scoreResult.score}/{scoreResult.totalPoints}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Points</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{scoreResult.passingScore}%</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Required</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: passColor, fontFamily: "Inter_700Bold" }]}>
                  {scoreResult.breakdown?.filter(b => b.isCorrect).length ?? 0}/{scoreResult.breakdown?.length ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Correct</Text>
              </View>
            </View>
          </View>

          {/* Question Breakdown */}
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Text style={[styles.sectionLabel, { color: colors.text, fontFamily: "Inter_700Bold", marginBottom: 4 }]}>
              Answer Breakdown
            </Text>
            {(scoreResult.breakdown ?? []).map((item, idx) => (
              <View key={idx} style={[styles.breakdownCard, {
                backgroundColor: item.isCorrect ? "#22C55E0A" : "#FF5C5C0A",
                borderColor: item.isCorrect ? "#22C55E30" : "#FF5C5C30",
              }]}>
                <View style={styles.breakdownHeader}>
                  <Feather
                    name={item.isCorrect ? "check-circle" : "x-circle"}
                    size={16}
                    color={item.isCorrect ? "#22C55E" : "#FF5C5C"}
                  />
                  <Text style={[styles.breakdownQ, { color: colors.text, fontFamily: "Inter_500Medium", flex: 1 }]} numberOfLines={2}>
                    {item.questionText}
                  </Text>
                  <Text style={[{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: item.isCorrect ? "#22C55E" : "#FF5C5C" }]}>
                    {item.pointsEarned}/{item.pointsMax}
                  </Text>
                </View>
                {!item.isCorrect && (
                  <View style={styles.breakdownAnswers}>
                    <Text style={[{ fontSize: 11, color: "#FF5C5C", fontFamily: "Inter_400Regular" }]}>
                      Your answer: {item.userAnswer || "(no answer)"}
                    </Text>
                    <Text style={[{ fontSize: 11, color: "#22C55E", fontFamily: "Inter_600SemiBold" }]}>
                      Correct: {item.correctAnswer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Done Button */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Pressable
              onPress={() => setScoreResult(null)}
              style={[styles.submitBtn, { backgroundColor: passColor }]}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={[styles.submitText, { fontFamily: "Inter_700Bold" }]}>Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Exam form view
  if (selectedExam) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Header */}
          <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
            <Pressable
              onPress={() => { setSelectedExam(null); setAnswers({}); }}
              style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Feather name="arrow-left" size={18} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
                {selectedExam.examTitle}
              </Text>
              <Text style={[styles.formDuration, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {selectedExam.duration} min · Pass {selectedExam.passingScore}% · {selectedExam.questions.length} questions
              </Text>
            </View>
            {/* Online indicator */}
            <Animated.View style={[styles.onlineDot, { transform: [{ scale: pulseAnim }], borderColor: colors.border }]}>
              <View style={[styles.dotInner, { backgroundColor: isOnline ? "#22C55E" : "#FF5C5C" }]} />
            </Animated.View>
          </View>

          {/* Questions */}
          <View style={{ padding: 20, gap: 16 }}>
            {selectedExam.questions.map((q, idx) => (
              <View key={q._id ?? idx} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.questionHeader}>
                  <View style={[styles.qNum, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.qNumText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={[styles.questionText, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                    {q.text}
                  </Text>
                </View>
                <Text style={[{ fontSize: 11, color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {q.points} point{q.points !== 1 ? "s" : ""} · {q.type === "mcq" ? "Multiple Choice" : q.type === "truefalse" ? "True/False" : "Short Answer"}
                </Text>

                {/* MCQ Options */}
                {q.type === "mcq" && q.options && q.options.length > 0 && (
                  <View style={{ gap: 8 }}>
                    {q.options.map(opt => (
                      <Pressable
                        key={opt}
                        onPress={() => { setAnswers(prev => ({ ...prev, [q._id ?? idx]: opt })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[
                          styles.mcqOption,
                          {
                            borderColor: answers[q._id ?? idx] === opt ? colors.primary : colors.border,
                            backgroundColor: answers[q._id ?? idx] === opt ? colors.primary + "15" : colors.background,
                          },
                        ]}
                      >
                        <View style={[styles.radio, { borderColor: answers[q._id ?? idx] === opt ? colors.primary : colors.border }]}>
                          {answers[q._id ?? idx] === opt && (
                            <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                          )}
                        </View>
                        <Text style={[styles.mcqText, { color: colors.text, fontFamily: "Inter_400Regular" }]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* True/False */}
                {q.type === "truefalse" && (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {["True", "False"].map(opt => (
                      <Pressable
                        key={opt}
                        onPress={() => { setAnswers(prev => ({ ...prev, [q._id ?? idx]: opt })); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[
                          styles.mcqOption,
                          { flex: 1,
                            borderColor: answers[q._id ?? idx] === opt ? colors.primary : colors.border,
                            backgroundColor: answers[q._id ?? idx] === opt ? colors.primary + "15" : colors.background,
                          },
                        ]}
                      >
                        <View style={[styles.radio, { borderColor: answers[q._id ?? idx] === opt ? colors.primary : colors.border }]}>
                          {answers[q._id ?? idx] === opt && (
                            <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                          )}
                        </View>
                        <Text style={[styles.mcqText, { color: colors.text, fontFamily: "Inter_500Medium" }]}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Short Answer */}
                {q.type === "short" && (
                  <TextInput
                    style={[styles.essayInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
                    placeholder="Type your answer here..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={answers[q._id ?? idx] ?? ""}
                    onChangeText={text => setAnswers(prev => ({ ...prev, [q._id ?? idx]: text }))}
                    textAlignVertical="top"
                  />
                )}
              </View>
            ))}
          </View>

          {!isOnline && (
            <View style={[styles.offlineNote, { backgroundColor: "#F7B73112", borderColor: "#F7B73140", marginHorizontal: 20 }]}>
              <Feather name="wifi-off" size={16} color="#F7B731" />
              <Text style={styles.offlineText}>
                You're offline. Answers will be saved locally and synced automatically when connection is restored.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Submit Bar */}
        <View style={[styles.submitBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name={isOnline ? "upload-cloud" : "download"} size={18} color="#fff" />
                <Text style={[styles.submitText, { fontFamily: "Inter_700Bold" }]}>
                  {isOnline ? "Submit Exam" : "Save Offline"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // Exam list view
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.listHeader, { paddingHorizontal: 20, marginBottom: 16 }]}>
        <View>
          <Text style={[styles.listTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Exams</Text>
          <Text style={[styles.listSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {exams.filter(e => e.courseId?._id ? enrolledIds.has(e.courseId._id) : false).length} available · {queue.filter(q => q.status === "Pending").length} pending sync
          </Text>
        </View>
        <Animated.View style={[styles.onlineDot, { transform: [{ scale: pulseAnim }], borderColor: colors.border }]}>
          <View style={[styles.dotInner, { backgroundColor: isOnline ? "#22C55E" : "#FF5C5C" }]} />
        </Animated.View>
      </View>

      {/* Loading Exams */}
      {isLoadingExams && (
        <View style={[styles.centered, { height: 120 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[{ fontSize: 13, color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Loading exams from backend...
          </Text>
        </View>
      )}

      {examsError && (
        <View style={[styles.errorCard, { backgroundColor: "#FF5C5C12", borderColor: "#FF5C5C30", marginHorizontal: 20, marginBottom: 16 }]}>
          <Feather name="alert-circle" size={16} color="#FF5C5C" />
          <Text style={[styles.errorText, { fontFamily: "Inter_400Regular", flex: 1 }]}>{examsError}</Text>
          <Pressable
            onPress={() => fetchExams()}
            style={[styles.retryBtn, { backgroundColor: "#FF5C5C20", borderColor: "#FF5C5C40" }]}
          >
            <Feather name="refresh-cw" size={13} color="#FF5C5C" />
            <Text style={[{ fontSize: 12, color: "#FF5C5C", fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* No enrollments nudge */}
      {!isLoadingExams && enrolledIds.size === 0 && (
        <View style={[styles.nudgeCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20, marginBottom: 20 }]}>
          <Feather name="book-open" size={28} color={colors.primary} />
          <Text style={[styles.nudgeTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Enroll in a course first
          </Text>
          <Text style={[styles.nudgeDesc, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Exams are only shown for courses you're enrolled in. Go to the Library tab to enroll.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/library")}
            style={[styles.nudgeBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="search" size={14} color="#fff" />
            <Text style={[{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }]}>Browse Library</Text>
          </Pressable>
        </View>
      )}

      {/* Available Exams — filtered to enrolled courses */}
      {!isLoadingExams && exams.length > 0 && enrolledIds.size > 0 && (() => {
        const filtered = exams.filter(e =>
          e.courseId?._id ? enrolledIds.has(e.courseId._id) : false
        );
        return (
        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.sectionLabel, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              My Exams
            </Text>
            <Text style={[{ fontSize: 12, color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {filtered.length} exam{filtered.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {filtered.length === 0 ? (
            <View style={[styles.nudgeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="clipboard" size={24} color={colors.textSecondary} />
              <Text style={[{ fontSize: 14, color: colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" }]}>
                No exams available for your enrolled courses yet
              </Text>
            </View>
          ) : (
            <>
              {filtered.map(exam => (
                <Pressable
                  key={exam._id}
                  onPress={() => { setSelectedExam(exam); setAnswers({}); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  style={[styles.examCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.examIconBox, { backgroundColor: colors.primary + "20" }]}>
                    <Feather name="file-text" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.examName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                      {exam.examTitle}
                    </Text>
                    {exam.courseId?.title && (
                      <Text style={[styles.examCourse, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                        {exam.courseId.title}
                      </Text>
                    )}
                    <View style={styles.examMeta}>
                      <Feather name="clock" size={12} color={colors.textSecondary} />
                      <Text style={[styles.examDuration, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                        {exam.duration} min
                      </Text>
                      <Text style={[styles.examQCount, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                        {exam.questions?.length ?? 0} questions
                      </Text>
                      <Text style={[styles.examQCount, { color: "#22C55E", fontFamily: "Inter_500Medium" }]}>
                        Pass: {exam.passingScore}%
                      </Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </>
          )}
        </View>
        );
      })()}

      {/* Sync Queue */}
      {queue.length > 0 && (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View style={styles.queueHeader}>
            <Text style={[styles.sectionLabel, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Sync Queue ({queue.length})
            </Text>
            {isOnline && queue.some(q => q.status === "Pending") && (
              <Pressable
                onPress={() => syncQueue(queue)}
                disabled={isSyncing}
                style={[styles.syncNowBtn, { borderColor: colors.primary }]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="upload-cloud" size={14} color={colors.primary} />
                )}
                <Text style={[styles.syncNowText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </Text>
              </Pressable>
            )}
          </View>

          {queue.map(item => (
            <View
              key={item.syncId}
              style={[styles.queueCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.queueExamName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                  {item.examName}
                </Text>
                <Text style={[styles.queueTime, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {new Date(item.submittedAt).toLocaleString()}
                </Text>
                {item.status === "Synced" && item.percentage !== undefined ? (
                  <Text style={[{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: item.passed ? "#22C55E" : "#FF5C5C" }]}>
                    Score: {item.score}/{item.totalPoints} ({item.percentage}%) — {item.passed ? "Passed" : "Failed"}
                  </Text>
                ) : (
                  <Text style={[styles.queueAnswers, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {Object.keys(item.answers).length} answer{Object.keys(item.answers).length !== 1 ? "s" : ""} recorded
                  </Text>
                )}
              </View>
              <StatusBadge status={item.status} colors={colors} />
            </View>
          ))}

          <Pressable
            onPress={() => { saveQueue([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={[styles.clearBtn, { borderColor: colors.border }]}
          >
            <Feather name="trash-2" size={14} color={colors.textSecondary} />
            <Text style={[styles.clearText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Clear Queue
            </Text>
          </Pressable>
        </View>
      )}

      {!isLoadingExams && exams.length === 0 && !examsError && (
        <View style={[styles.emptyTip, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20 }]}>
          <Feather name="info" size={18} color={colors.primary} />
          <Text style={[styles.emptyTipText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            No exams available. Create exams in the web portal using the Exam Creator, then they will appear here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center", gap: 8 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listTitle: { fontSize: 28 },
  listSub: { fontSize: 13, marginTop: 2 },
  sectionLabel: { fontSize: 18 },
  examCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  examIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  examName: { fontSize: 15, marginBottom: 2 },
  examCourse: { fontSize: 12, marginBottom: 4 },
  examMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  examDuration: { fontSize: 12 },
  examQCount: { fontSize: 12 },
  queueHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  syncNowBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  syncNowText: { fontSize: 12 },
  queueCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  queueExamName: { fontSize: 14, marginBottom: 2 },
  queueTime: { fontSize: 11, marginBottom: 2 },
  queueAnswers: { fontSize: 11 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11 },
  clearBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  clearText: { fontSize: 14 },
  emptyTip: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start" },
  emptyTipText: { flex: 1, fontSize: 13, lineHeight: 20 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  errorText: { fontSize: 14, flex: 1, color: "#FF5C5C" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  // Form styles
  formHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  formTitle: { fontSize: 16 },
  formDuration: { fontSize: 12 },
  onlineDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  dotInner: { width: 10, height: 10, borderRadius: 5 },
  questionCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  questionHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  qNum: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", minWidth: 28 },
  qNumText: { fontSize: 13 },
  questionText: { flex: 1, fontSize: 15, lineHeight: 22 },
  mcqOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  mcqText: { fontSize: 14 },
  essayInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 110, fontSize: 14, lineHeight: 22 },
  offlineNote: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start" },
  offlineText: { flex: 1, fontSize: 13, lineHeight: 20, color: "#F7B731" },
  submitBar: { padding: 20, borderTopWidth: 1 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 16, borderRadius: 16,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitText: { color: "#fff", fontSize: 16 },
  // Score result styles
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 4,
    justifyContent: "center", alignItems: "center",
  },
  scorePercent: { fontSize: 38 },
  statsRow: {
    flexDirection: "row", borderRadius: 16, borderWidth: 1,
    padding: 16, marginTop: 24, width: "100%",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, marginHorizontal: 8 },
  breakdownCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  nudgeCard: {
    borderRadius: 20, borderWidth: 1, padding: 28,
    alignItems: "center", gap: 10,
  },
  nudgeTitle: { fontSize: 17 },
  nudgeDesc: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  nudgeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 14, marginTop: 4,
  },
  breakdownHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  breakdownQ: { fontSize: 13, lineHeight: 18 },
  breakdownAnswers: { paddingLeft: 24, gap: 3 },
});

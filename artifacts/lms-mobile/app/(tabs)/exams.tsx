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
import { useAuth, API_BASE } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

// [7.5] Offline-First Exam Synchronizer:
// - Fetch real exams from backend
// - Submit exam answers offline → save to AsyncStorage with "Pending" status
// - NetInfo detects network return → trigger FIFO background sync queue
// - Auto-update status from "Pending" → "Synced" (or "Failed")

const QUEUE_KEY = "exam_sync_queue_v2";

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
  courseId?: { title: string };
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

  const [exams, setExams] = useState<RealExam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [examsError, setExamsError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<RealExam | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<ExamAnswer[]>([]);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSyncingRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
      } else {
        setExamsError("Could not load exams. Please log in.");
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
        await fetch(`${API_BASE}/exams/${item.examId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify({ answers: item.answers, submittedAt: item.submittedAt }),
        });
        updatedQueue = updatedQueue.map(q =>
          q.syncId === item.syncId ? { ...q, status: "Synced" as const, syncedAt: Date.now() } : q
        );
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

  useEffect(() => { loadQueue(); fetchExams(); }, []);

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
            {exams.length} available · {queue.filter(q => q.status === "Pending").length} pending sync
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
          <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{examsError}</Text>
        </View>
      )}

      {/* Available Exams */}
      {!isLoadingExams && exams.length > 0 && (
        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 24 }}>
          <Text style={[styles.sectionLabel, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Available Exams
          </Text>
          {exams.map(exam => (
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
        </View>
      )}

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
                <Text style={[styles.queueAnswers, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {Object.keys(item.answers).length} answer{Object.keys(item.answers).length !== 1 ? "s" : ""} recorded
                </Text>
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
});

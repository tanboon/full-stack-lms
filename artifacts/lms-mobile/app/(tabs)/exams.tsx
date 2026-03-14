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
import Colors from "@/constants/colors";

// [7.5] Offline-First Exam Synchronizer:
// - Submit exam answers offline → save to AsyncStorage with "Pending" status
// - NetInfo detects network return → trigger FIFO background sync queue
// - Auto-update status from "Pending" → "Synced" (or "Failed")

const QUEUE_KEY = "exam_sync_queue";
const API_BASE = "https://jsonplaceholder.typicode.com";

type ExamAnswer = {
  syncId: string;
  examId: string;
  examName: string;
  answers: Record<string, string>;
  submittedAt: number;
  status: "Pending" | "Syncing" | "Synced" | "Failed";
  syncedAt?: number;
};

const SAMPLE_EXAMS = [
  {
    id: "exam_001",
    name: "Midterm: Database Systems",
    duration: "90 min",
    questions: [
      { id: "q1", text: "Explain the CAP theorem and give an example of each combination.", type: "essay" },
      { id: "q2", text: "What is a MongoDB aggregation pipeline?", type: "essay" },
      { id: "q3", text: "Which consistency model does MongoDB use by default?", type: "mcq", options: ["Strong", "Eventual", "Causal", "Sequential"] },
    ],
  },
  {
    id: "exam_002",
    name: "Quiz: REST API Design",
    duration: "45 min",
    questions: [
      { id: "q1", text: "What HTTP status code indicates a resource was created?", type: "mcq", options: ["200", "201", "204", "400"] },
      { id: "q2", text: "Describe idempotency in REST APIs.", type: "essay" },
    ],
  },
];

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

  const [selectedExam, setSelectedExam] = useState<typeof SAMPLE_EXAMS[0] | null>(null);
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

  // [7.5] FIFO background sync — processes queue items one by one in order
  const syncQueue = useCallback(async (currentQueue: ExamAnswer[]) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    const pending = currentQueue.filter(item => item.status === "Pending");
    let updated = [...currentQueue];

    for (const item of pending) {
      // Mark as Syncing
      updated = updated.map(q => q.syncId === item.syncId ? { ...q, status: "Syncing" as const } : q);
      setQueue([...updated]);

      try {
        // Simulate POST to server
        const res = await fetch(`${API_BASE}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: item.examName, body: JSON.stringify(item.answers), userId: 1 }),
        });

        if (res.ok) {
          updated = updated.map(q => q.syncId === item.syncId ? { ...q, status: "Synced" as const, syncedAt: Date.now() } : q);
        } else {
          updated = updated.map(q => q.syncId === item.syncId ? { ...q, status: "Failed" as const } : q);
        }
      } catch {
        updated = updated.map(q => q.syncId === item.syncId ? { ...q, status: "Failed" as const } : q);
      }

      await saveQueue(updated);
      await new Promise(r => setTimeout(r, 600)); // FIFO delay between items
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
  }, [saveQueue]);

  // Pulse animation for online indicator
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  useEffect(() => {
    loadQueue();
    // [7.5] NetInfo listener — triggers sync when network returns
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(prev => {
        if (!prev && online) {
          // Network just came back — trigger sync
          AsyncStorage.getItem(QUEUE_KEY).then(raw => {
            if (raw) syncQueue(JSON.parse(raw));
          });
        }
        return online;
      });
    });
    return () => unsubscribe();
  }, [loadQueue, syncQueue]);

  const handleSubmit = useCallback(async () => {
    if (!selectedExam) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    const entry: ExamAnswer = {
      syncId: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      examId: selectedExam.id,
      examName: selectedExam.name,
      answers,
      submittedAt: Date.now(),
      status: "Pending",
    };

    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const existing: ExamAnswer[] = raw ? JSON.parse(raw) : [];
    const newQueue = [...existing, entry];
    await saveQueue(newQueue);

    // Try to sync immediately if online
    if (isOnline) {
      syncQueue(newQueue);
    }

    setIsSubmitting(false);
    setSelectedExam(null);
    setAnswers({});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedExam, answers, isOnline, saveQueue, syncQueue]);

  const pendingCount = queue.filter(q => q.status === "Pending").length;

  // EXAM FORM VIEW
  if (selectedExam) {
    const allAnswered = selectedExam.questions.every(q => answers[q.id]?.trim());
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.formHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setSelectedExam(null)} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.formTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>{selectedExam.name}</Text>
            <Text style={[styles.formDuration, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{selectedExam.duration}</Text>
          </View>
          <View style={[styles.onlineDot, { borderColor: colors.card }]}>
            <Animated.View style={[styles.dotInner, { backgroundColor: isOnline ? "#22C55E" : "#FF5C5C", transform: [{ scale: pulseAnim }] }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120, gap: 20 }} showsVerticalScrollIndicator={false}>
          {selectedExam.questions.map((q, i) => (
            <View key={q.id} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.questionHeader}>
                <View style={[styles.qNum, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.qNumText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.questionText, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{q.text}</Text>
              </View>

              {q.type === "mcq" ? (
                <View style={{ gap: 8, marginTop: 8 }}>
                  {(q.options ?? []).map((opt: string) => (
                    <Pressable
                      key={opt}
                      onPress={() => { Haptics.selectionAsync(); setAnswers(prev => ({ ...prev, [q.id]: opt })); }}
                      style={[
                        styles.mcqOption,
                        { borderColor: answers[q.id] === opt ? colors.primary : colors.border, backgroundColor: answers[q.id] === opt ? colors.primary + "15" : colors.background }
                      ]}
                    >
                      <View style={[styles.radio, { borderColor: answers[q.id] === opt ? colors.primary : colors.border }]}>
                        {answers[q.id] === opt && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                      </View>
                      <Text style={[styles.mcqText, { color: answers[q.id] === opt ? colors.primary : colors.text, fontFamily: "Inter_500Medium" }]}>{opt}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={[styles.essayInput, { color: colors.text, borderColor: answers[q.id] ? colors.primary : colors.border, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
                  multiline
                  numberOfLines={4}
                  placeholder="Write your answer here..."
                  placeholderTextColor={colors.textSecondary}
                  value={answers[q.id] ?? ""}
                  onChangeText={v => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                  textAlignVertical="top"
                />
              )}
            </View>
          ))}

          {/* Offline warning */}
          {!isOnline && (
            <View style={[styles.offlineNote, { backgroundColor: "#F7B73118", borderColor: "#F7B73140" }]}>
              <Feather name="wifi-off" size={14} color="#F7B731" />
              <Text style={[styles.offlineText, { fontFamily: "Inter_400Regular" }]}>
                You're offline. Answers will be saved and synced automatically when connection returns.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.submitBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: allAnswered ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name={isOnline ? "send" : "download"} size={18} color="#fff" />
                <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>
                  {isOnline ? "Submit Exam" : "Save Offline"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // LIST VIEW
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100, gap: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Exams</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>Offline-First Sync</Text>
        </View>
        <View style={styles.headerRight}>
          <Animated.View style={[styles.netBadge, { backgroundColor: isOnline ? "#22C55E18" : "#FF5C5C18", borderColor: isOnline ? "#22C55E40" : "#FF5C5C40" }]}>
            <Animated.View style={[styles.netDot, { backgroundColor: isOnline ? "#22C55E" : "#FF5C5C", transform: [{ scale: isOnline ? pulseAnim : new Animated.Value(1) }] }]} />
            <Text style={[styles.netText, { color: isOnline ? "#22C55E" : "#FF5C5C", fontFamily: "Inter_500Medium" }]}>
              {isOnline === null ? "Checking..." : isOnline ? "Online" : "Offline"}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Available Exams */}
      <View style={{ paddingHorizontal: 20, gap: 12 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Available Exams</Text>
        {SAMPLE_EXAMS.map(exam => (
          <Pressable
            key={exam.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedExam(exam); setAnswers({}); }}
            style={({ pressed }) => [
              styles.examCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
          >
            <View style={[styles.examIcon, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="edit-3" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.examName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{exam.name}</Text>
              <View style={styles.examMeta}>
                <Feather name="clock" size={12} color={colors.textSecondary} />
                <Text style={[styles.examDuration, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{exam.duration}</Text>
                <Text style={[styles.examQCount, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  • {exam.questions.length} questions
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      {/* Sync Queue */}
      {queue.length > 0 && (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <View style={styles.queueHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Sync Queue</Text>
            {isSyncing && <ActivityIndicator size="small" color={colors.primary} />}
            {pendingCount > 0 && !isSyncing && isOnline && (
              <Pressable
                onPress={() => syncQueue(queue)}
                style={[styles.syncNowBtn, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}
              >
                <Feather name="refresh-cw" size={12} color={colors.primary} />
                <Text style={[styles.syncNowText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Sync Now</Text>
              </Pressable>
            )}
          </View>

          {[...queue].reverse().map(item => (
            <View key={item.syncId} style={[styles.queueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.queueExamName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>{item.examName}</Text>
                <Text style={[styles.queueTime, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  Submitted {new Date(item.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {item.syncedAt ? ` • Synced ${new Date(item.syncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                </Text>
                <Text style={[styles.queueAnswers, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {Object.keys(item.answers).length} answers
                </Text>
              </View>
              <StatusBadge status={item.status} colors={colors} />
            </View>
          ))}

          <Pressable
            onPress={async () => {
              await AsyncStorage.removeItem(QUEUE_KEY);
              setQueue([]);
            }}
            style={[styles.clearBtn, { borderColor: colors.danger + "40" }]}
          >
            <Feather name="trash-2" size={14} color={colors.danger} />
            <Text style={[styles.clearText, { color: colors.danger, fontFamily: "Inter_500Medium" }]}>Clear Queue</Text>
          </Pressable>
        </View>
      )}

      {/* Empty queue tip */}
      {queue.length === 0 && (
        <View style={[styles.emptyTip, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20 }]}>
          <Feather name="info" size={16} color={colors.accent} />
          <Text style={[styles.emptyTipText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Submit an exam above. If you're offline, it saves locally and auto-syncs when connection returns (FIFO queue).
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  netBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  netDot: { width: 8, height: 8, borderRadius: 4 },
  netText: { fontSize: 12 },
  sectionTitle: { fontSize: 18 },
  examCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  examIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  examName: { fontSize: 15, marginBottom: 4 },
  examMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
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
  // Form styles
  formHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  formTitle: { fontSize: 16 },
  formDuration: { fontSize: 12 },
  onlineDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  dotInner: { width: 8, height: 8, borderRadius: 4 },
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

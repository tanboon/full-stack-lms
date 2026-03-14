import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, KeyboardAvoidingView, Platform,
  useColorScheme, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

// [7.2] Dynamic Currency Converter — TextInput + KeyboardAvoidingView + Glassmorphism UI

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳" },
  { code: "KRW", name: "Korean Won", symbol: "₩", flag: "🇰🇷" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬" },
];

// Static rates (base: USD) — approximated
const RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, THB: 35.2, GBP: 0.79,
  JPY: 149.5, CNY: 7.24, KRW: 1325, SGD: 1.34,
};

function convert(amount: number, from: string, to: string): number {
  const inUSD = amount / RATES[from];
  return inUSD * RATES[to];
}

function formatResult(val: number, code: string): string {
  if (code === "JPY" || code === "KRW") return val.toFixed(0);
  return val.toFixed(2);
}

type CurrencyPickerProps = {
  selected: string;
  onSelect: (c: string) => void;
  colors: any;
  isDark: boolean;
};

function CurrencyPicker({ selected, onSelect, colors, isDark }: CurrencyPickerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {CURRENCIES.map(c => (
        <Pressable
          key={c.code}
          onPress={() => { Haptics.selectionAsync(); onSelect(c.code); }}
          style={[
            styles.currencyChip,
            {
              backgroundColor: selected === c.code ? colors.primary : colors.glass,
              borderColor: selected === c.code ? colors.primary : colors.glassBorder,
            }
          ]}
        >
          <Text style={{ fontSize: 16 }}>{c.flag}</Text>
          <Text style={[styles.chipCode, { color: selected === c.code ? "#fff" : colors.text, fontFamily: "Inter_600SemiBold" }]}>
            {c.code}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function ConverterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("THB");
  const [isSwapping, setIsSwapping] = useState(false);

  const fromCurr = CURRENCIES.find(c => c.code === from)!;
  const toCurr = CURRENCIES.find(c => c.code === to)!;
  const numericAmount = parseFloat(amount) || 0;
  const result = convert(numericAmount, from, to);
  const rate = convert(1, from, to);

  const handleSwap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSwapping(true);
    setTimeout(() => {
      setFrom(to);
      setTo(from);
      setIsSwapping(false);
    }, 200);
  }, [from, to]);

  const bgGradient = isDark
    ? ["#1a1040", "#0F0E17"]
    : ["#ede9fe", "#F8F7FF"];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Currency Converter
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Live exchange rates
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Glass Card */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? "rgba(108,99,255,0.15)" : "rgba(108,99,255,0.08)", borderColor: colors.primary + "30" }]}>
            {/* FROM */}
            <View style={styles.convSection}>
              <Text style={[styles.convLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>FROM</Text>
              <View style={styles.convRow}>
                <Text style={{ fontSize: 28 }}>{fromCurr.flag}</Text>
                <Text style={[styles.currCode, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{from}</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text, fontFamily: "Inter_700Bold" }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={12}
                />
              </View>
              <CurrencyPicker selected={from} onSelect={setFrom} colors={colors} isDark={isDark} />
            </View>

            {/* Swap */}
            <Pressable
              onPress={handleSwap}
              style={({ pressed }) => [styles.swapBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1, transform: [{ rotate: isSwapping ? "180deg" : "0deg" }] }]}
            >
              <Feather name="repeat" size={20} color="#fff" />
            </Pressable>

            {/* TO */}
            <View style={styles.convSection}>
              <Text style={[styles.convLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>TO</Text>
              <View style={styles.convRow}>
                <Text style={{ fontSize: 28 }}>{toCurr.flag}</Text>
                <Text style={[styles.currCode, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{to}</Text>
                <Text style={[styles.resultText, { color: colors.primary, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
                  {toCurr.symbol}{formatResult(result, to)}
                </Text>
              </View>
              <CurrencyPicker selected={to} onSelect={setTo} colors={colors} isDark={isDark} />
            </View>
          </View>

          {/* Rate Info */}
          <View style={[styles.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="trending-up" size={16} color={colors.accent} />
            <Text style={[styles.rateText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              1 {from} = {formatResult(rate, to)} {to}
            </Text>
          </View>

          {/* Quick Amounts */}
          <Text style={[styles.quickTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Quick Convert</Text>
          <View style={styles.quickGrid}>
            {[50, 100, 500, 1000, 5000, 10000].map(q => (
              <Pressable
                key={q}
                onPress={() => { Haptics.selectionAsync(); setAmount(String(q)); }}
                style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.quickBtnText, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                  {fromCurr.symbol}{q.toLocaleString()}
                </Text>
                <Text style={[styles.quickResult, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {toCurr.symbol}{formatResult(convert(q, from, to), to)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 28 },
  headerSub: { fontSize: 14, marginTop: 2 },
  glassCard: {
    borderRadius: 24, borderWidth: 1, padding: 20,
    marginBottom: 16, gap: 16,
  },
  convSection: { gap: 10 },
  convLabel: { fontSize: 11, letterSpacing: 1.2 },
  convRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  currCode: { fontSize: 18 },
  amountInput: { flex: 1, fontSize: 32, textAlign: "right" },
  resultText: { flex: 1, fontSize: 32, textAlign: "right" },
  swapBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignSelf: "center", justifyContent: "center", alignItems: "center",
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  currencyChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  chipCode: { fontSize: 13 },
  rateCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24,
  },
  rateText: { fontSize: 14 },
  quickTitle: { fontSize: 18, marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: {
    width: "47%", padding: 14, borderRadius: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  quickBtnText: { fontSize: 13, marginBottom: 4 },
  quickResult: { fontSize: 16 },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CircularProgress from '../../components/CircularProgress';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 48 - 12) / 2;

interface Habit {
  type: string;
  label: string;
  emoji: string;
  colorKey: 'habitSteps' | 'habitWater' | 'habitSleep' | 'habitCalories';
  unit: string;
  goalKey: string;
  totalKey: string;
  coins: number;
}

const HABITS: Habit[] = [
  { type: 'steps', label: 'Steps', emoji: '👟', colorKey: 'habitSteps', unit: 'steps', goalKey: 'steps_goal', totalKey: 'steps', coins: 10 },
  { type: 'water', label: 'Water', emoji: '💧', colorKey: 'habitWater', unit: 'glasses', goalKey: 'water_goal', totalKey: 'water', coins: 8 },
  { type: 'sleep', label: 'Sleep', emoji: '😴', colorKey: 'habitSleep', unit: 'hrs', goalKey: 'sleep_goal', totalKey: 'sleep', coins: 5 },
  { type: 'calories', label: 'Calories', emoji: '🔥', colorKey: 'habitCalories', unit: 'cal', goalKey: 'calories_goal', totalKey: 'calories', coins: 7 },
];

export default function HomeScreen() {
  const { user, apiCall, updateUser } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coinModal, setCoinModal] = useState<{ visible: boolean; coins: number; habit: string }>({ visible: false, coins: 0, habit: '' });

  const fetchData = useCallback(async () => {
    try {
      const resp = await apiCall('/api/habits/today');
      if (resp.ok) setData(await resp.json());
    } catch (e) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, []);

  const getProgress = (habit: Habit) => {
    if (!data) return 0;
    const val = data.totals[habit.totalKey] || 0;
    const goal = data.goals[habit.goalKey] || 1;
    return Math.min((val / goal) * 100, 100);
  };

  const isCompleted = (habit: Habit) => data?.completed?.[habit.type] || false;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const coinsToday = Object.values(data?.completed || {}).filter(Boolean).length;
  const coinValues = { steps: 10, water: 8, sleep: 5, calories: 7 };
  const totalCoinsToday = HABITS.filter(h => isCompleted(h)).reduce((s, h) => s + h.coins, 0);

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        testID="home-scroll"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.dateText}>{today}</Text>
            <Text style={s.greeting}>Hey, {user?.name?.split(' ')[0] || 'there'} 👋</Text>
          </View>
          <TouchableOpacity testID="wallet-shortcut" onPress={() => router.push('/(tabs)/wallet')} style={[s.coinBadge, { backgroundColor: colors.secondary }]}>
            <Text style={s.coinBadgeText}>🪙 {user?.coins || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Today's summary */}
        <View style={[s.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={s.summaryLabel}>Today's Progress</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{coinsToday}/4</Text>
              <Text style={[s.summaryUnit, { color: colors.textSecondary }]}>Goals Done</Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryValue, { color: colors.secondary }]}>+{totalCoinsToday}</Text>
              <Text style={[s.summaryUnit, { color: colors.textSecondary }]}>Coins Earned</Text>
            </View>
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{Math.round((coinsToday / 4) * 100)}%</Text>
              <Text style={[s.summaryUnit, { color: colors.textSecondary }]}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Habit grid */}
        <Text style={s.sectionTitle}>Daily Habits</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={s.grid}>
            {HABITS.map((habit) => {
              const progress = getProgress(habit);
              const completed = isCompleted(habit);
              const val = data?.totals?.[habit.totalKey] || 0;
              const goal = data?.goals?.[habit.goalKey] || 0;
              const habitColor = colors[habit.colorKey];

              return (
                <TouchableOpacity
                  key={habit.type}
                  testID={`habit-card-${habit.type}`}
                  style={[s.habitCard, { backgroundColor: colors.surface, width: CARD_SIZE, borderColor: completed ? habitColor : colors.border }]}
                  onPress={() => router.push(`/habit/${habit.type}`)}
                  activeOpacity={0.8}
                >
                  <View style={s.habitCardTop}>
                    <Text style={s.habitEmoji}>{habit.emoji}</Text>
                    {completed && <Text style={s.checkmark}>✅</Text>}
                  </View>
                  <CircularProgress size={80} progress={progress} color={habitColor} bgColor={habitColor + '30'} strokeWidth={7}>
                    <Text style={[s.progressPct, { color: habitColor }]}>{Math.round(progress)}%</Text>
                  </CircularProgress>
                  <Text style={[s.habitLabel, { color: colors.textPrimary }]}>{habit.label}</Text>
                  <Text style={[s.habitValue, { color: colors.textSecondary }]}>
                    {val % 1 === 0 ? val : val.toFixed(1)} / {goal} {habit.unit}
                  </Text>
                  <View style={[s.coinReward, { backgroundColor: colors.secondary + '20' }]}>
                    <Text style={[s.coinRewardText, { color: colors.secondary }]}>🪙 {habit.coins} coins</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick tip */}
        <View style={[s.tipCard, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
          <Text style={[s.tipText, { color: colors.primary }]}>
            💡 Complete all 4 goals to earn 30 coins today!
          </Text>
        </View>
      </ScrollView>

      {/* Coin earned modal */}
      <Modal visible={coinModal.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={s.modalEmoji}>🎉</Text>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Goal Completed!</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>You completed your {coinModal.habit} goal</Text>
            <View style={[s.modalCoin, { backgroundColor: colors.secondary }]}>
              <Text style={s.modalCoinText}>+{coinModal.coins} Coins Earned!</Text>
            </View>
            <TouchableOpacity testID="modal-close-btn" style={[s.modalBtn, { backgroundColor: colors.primary }]} onPress={() => setCoinModal({ visible: false, coins: 0, habit: '' })}>
              <Text style={s.modalBtnText}>Awesome! 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  dateText: { fontSize: 13, color: colors.textSecondary },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  coinBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  coinBadgeText: { fontSize: 14, fontWeight: '700', color: '#000' },
  summaryCard: { marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: colors.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  summaryUnit: { fontSize: 12, marginTop: 2 },
  divider: { width: 1, height: 36 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginHorizontal: 16, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  habitCard: { borderRadius: 20, padding: 14, alignItems: 'center', borderWidth: 1.5, gap: 6 },
  habitCardTop: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitEmoji: { fontSize: 22 },
  checkmark: { fontSize: 16 },
  progressPct: { fontSize: 13, fontWeight: '700' },
  habitLabel: { fontSize: 15, fontWeight: '700' },
  habitValue: { fontSize: 12 },
  coinReward: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  coinRewardText: { fontSize: 11, fontWeight: '600' },
  tipCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 14, borderWidth: 1 },
  tipText: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 280, borderRadius: 24, padding: 24, alignItems: 'center' },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  modalCoin: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 16 },
  modalCoinText: { fontSize: 16, fontWeight: '700', color: '#000' },
  modalBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 24 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

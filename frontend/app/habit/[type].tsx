import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CircularProgress from '../../components/CircularProgress';

const HABIT_CONFIG: Record<string, { label: string; emoji: string; colorKey: string; unit: string; goalKey: string; coinReward: number; placeholder: string; step: number }> = {
  steps: { label: 'Steps', emoji: '👟', colorKey: 'habitSteps', unit: 'steps', goalKey: 'steps_goal', coinReward: 10, placeholder: 'e.g. 2000', step: 500 },
  water: { label: 'Water', emoji: '💧', colorKey: 'habitWater', unit: 'glasses', goalKey: 'water_goal', coinReward: 8, placeholder: 'e.g. 2', step: 1 },
  sleep: { label: 'Sleep', emoji: '😴', colorKey: 'habitSleep', unit: 'hours', goalKey: 'sleep_goal', coinReward: 5, placeholder: 'e.g. 7.5', step: 0.5 },
  calories: { label: 'Calories', emoji: '🔥', colorKey: 'habitCalories', unit: 'cal burned', goalKey: 'calories_goal', coinReward: 7, placeholder: 'e.g. 150', step: 50 },
};

export default function HabitScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { apiCall, updateUser } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const config = HABIT_CONFIG[type || 'steps'];

  const [todayData, setTodayData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [logging, setLogging] = useState(false);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; coins: number }>({ visible: false, coins: 0 });

  const habitColor = (colors as any)[config.colorKey];

  const fetchData = useCallback(async () => {
    try {
      const resp = await apiCall('/api/habits/today');
      if (resp.ok) {
        const data = await resp.json();
        setTodayData(data);
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, []);

  const total = todayData?.totals?.[type || ''] || 0;
  const goal = todayData?.goals?.[config.goalKey] || 1;
  const progress = Math.min((total / goal) * 100, 100);
  const isCompleted = todayData?.completed?.[type || ''] || false;

  const handleQuickAdd = (amount: number) => {
    setInputValue(String(amount));
  };

  const handleLog = async () => {
    const val = parseFloat(inputValue);
    if (!val || val <= 0) {
      Alert.alert('Invalid Value', 'Please enter a valid positive number');
      return;
    }
    setLogging(true);
    try {
      const resp = await apiCall('/api/habits/log', {
        method: 'POST',
        body: JSON.stringify({ habit_type: type, value: val }),
      });
      if (resp.ok) {
        const result = await resp.json();
        setInputValue('');
        await fetchData();
        if (result.goal_completed) {
          updateUser({ coins: result.current_coins });
          setSuccessModal({ visible: true, coins: result.coins_earned });
        } else {
          Alert.alert('Logged!', `+${val} ${config.unit} added`);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to log activity');
    } finally {
      setLogging(false);
    }
  };

  const s = makeStyles(colors);

  if (!config) return null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.habitEmoji]}>{config.emoji}</Text>
            <Text style={[s.habitTitle, { color: colors.textPrimary }]}>Log {config.label}</Text>
          </View>

          {/* Progress circle */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={s.progressSection}>
              <CircularProgress size={160} progress={progress} color={habitColor} bgColor={habitColor + '20'} strokeWidth={12}>
                <Text style={[s.progressPct, { color: habitColor }]}>{Math.round(progress)}%</Text>
              </CircularProgress>
              <Text style={[s.progressText, { color: colors.textPrimary }]}>
                {total % 1 === 0 ? total : total.toFixed(1)} / {goal} {config.unit}
              </Text>
              {isCompleted && (
                <View style={[s.completedBadge, { backgroundColor: colors.success }]}>
                  <Text style={s.completedText}>✅ Goal Completed! +{config.coinReward} coins</Text>
                </View>
              )}
            </View>
          )}

          {/* Log input */}
          <View style={[s.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Add {config.unit}</Text>
            <View style={s.inputRow}>
              <TextInput
                testID="habit-value-input"
                style={[s.textInput, { color: colors.textPrimary, backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
                placeholder={config.placeholder}
                placeholderTextColor={colors.textSecondary}
                value={inputValue}
                onChangeText={setInputValue}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                testID="log-habit-btn"
                style={[s.logBtn, { backgroundColor: habitColor }]}
                onPress={handleLog}
                disabled={logging}
              >
                {logging ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.logBtnText}>+ Log</Text>}
              </TouchableOpacity>
            </View>

            {/* Quick add */}
            <Text style={[s.quickLabel, { color: colors.textSecondary }]}>Quick add</Text>
            <View style={s.quickRow}>
              {[1, 2, 3, 5].map((mult) => {
                const amt = config.step * mult;
                return (
                  <TouchableOpacity
                    key={mult}
                    testID={`quick-add-${amt}`}
                    style={[s.quickChip, { backgroundColor: habitColor + '20', borderColor: habitColor + '50' }]}
                    onPress={() => handleQuickAdd(amt)}
                  >
                    <Text style={[s.quickChipText, { color: habitColor }]}>+{amt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Coin reward info */}
          <View style={[s.rewardCard, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary + '30' }]}>
            <Text style={s.rewardEmoji}>🪙</Text>
            <View>
              <Text style={[s.rewardTitle, { color: colors.textPrimary }]}>Earn {config.coinReward} Coins</Text>
              <Text style={[s.rewardSub, { color: colors.textSecondary }]}>Complete your daily {config.label.toLowerCase()} goal</Text>
            </View>
          </View>

          {/* Goal settings hint */}
          <Text style={[s.goalHint, { color: colors.textSecondary }]}>
            Current goal: {goal} {config.unit} / day
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={successModal.visible} transparent animationType="scale">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={s.modalEmoji}>🎉</Text>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Goal Achieved!</Text>
            <Text style={[s.modalSub, { color: colors.textSecondary }]}>
              You completed your {config.label} goal for today!
            </Text>
            <View style={[s.coinEarned, { backgroundColor: colors.secondary }]}>
              <Text style={s.coinEarnedText}>+{successModal.coins} Coins Earned! 🚀</Text>
            </View>
            <TouchableOpacity
              testID="success-modal-close"
              style={[s.modalBtn, { backgroundColor: habitColor }]}
              onPress={() => { setSuccessModal({ visible: false, coins: 0 }); router.back(); }}
            >
              <Text style={s.modalBtnText}>Keep Going!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 },
  habitEmoji: { fontSize: 32 },
  habitTitle: { fontSize: 24, fontWeight: '700' },
  progressSection: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  progressPct: { fontSize: 28, fontWeight: '800' },
  progressText: { fontSize: 16, fontWeight: '500' },
  completedBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  completedText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  inputCard: { marginHorizontal: 16, borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  textInput: { flex: 1, height: 52, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, borderWidth: 1 },
  logBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  logBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  quickLabel: { fontSize: 12, fontWeight: '500', marginTop: 14, marginBottom: 8 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontWeight: '600' },
  rewardCard: { marginHorizontal: 16, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, marginBottom: 12 },
  rewardEmoji: { fontSize: 28 },
  rewardTitle: { fontSize: 15, fontWeight: '600' },
  rewardSub: { fontSize: 13, marginTop: 2 },
  goalHint: { textAlign: 'center', fontSize: 13, paddingBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 290, borderRadius: 24, padding: 28, alignItems: 'center' },
  modalEmoji: { fontSize: 56, marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  coinEarned: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 20 },
  coinEarnedText: { fontSize: 16, fontWeight: '700', color: '#000' },
  modalBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 24 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

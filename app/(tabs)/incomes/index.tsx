import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
  KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors, shadow } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

/* ─── Types ─── */
interface Distributor {
  _id: string;
  name: string;
}

interface Income {
  _id: string;
  amount: number;
  message?: string;
  distributor: Distributor | string;
  date: string;
}


/* ─── Income Card ─── */
function IncomeCard({ income, onDelete, isAdmin }: { income: Income; onDelete: (id: string) => void; isAdmin: boolean }) {
  const distributorName = typeof income.distributor === 'object'
    ? income.distributor.name
    : 'Непознат';

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 18, marginHorizontal: 16, marginVertical: 5,
      padding: 16, borderLeftWidth: 4, borderLeftColor: '#16A34A', ...shadow.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>{distributorName}</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{dayjs(income.date).format('DD MMM YYYY · HH:mm')}</Text>
          {income.message ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{income.message}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>{income.amount.toFixed(2)} €</Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => Alert.alert('Изтрий', 'Сигурен ли си?', [
                { text: 'Отмени', style: 'cancel' },
                { text: 'Изтрий', style: 'destructive', onPress: () => onDelete(income._id) },
              ])}
              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/* ─── Create Modal ─── */
function CreateIncomeModal({ visible, onClose, onSuccess, distributors }: {
  visible: boolean; onClose: () => void; onSuccess: () => void; distributors: Distributor[];
}) {
  const [distributorId, setDistributorId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selected = distributors.find((d) => d._id === distributorId);

  const reset = () => { setDistributorId(''); setAmount(''); setMessage(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!distributorId || !amount) {
      Alert.alert('Непълни данни', 'Избери доставчик и въведи сума.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/incomes/additional', {
        distributor: distributorId,
        amount: parseFloat(amount),
        message: message || undefined,
        date: new Date(),
      });
      reset();
      onSuccess();
    } catch (e: any) {
      Alert.alert('Грешка', e?.response?.data?.message ?? 'Неуспешно добавяне.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} activeOpacity={1} onPress={handleClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', ...shadow.lg }}>
          <View style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ position: 'absolute', top: 8, left: '50%', marginLeft: -18, width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 8 }}>Нов приход</Text>
            <TouchableOpacity onPress={handleClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            {/* Distributor picker */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>ДОСТАВЧИК *</Text>
              <TouchableOpacity
                onPress={() => setPickerOpen(true)}
                style={{
                  backgroundColor: colors.bgInput, borderRadius: 14,
                  paddingHorizontal: 14, paddingVertical: 13,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  borderWidth: 1.5, borderColor: distributorId ? colors.primary : 'transparent',
                }}
              >
                <Text style={{ color: selected ? colors.textPrimary : colors.textMuted, fontSize: 15 }}>
                  {selected ? selected.name : 'Избери доставчик...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>СУМА (€) *</Text>
              <TextInput
                style={{ backgroundColor: colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary }}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Message */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4 }}>БЕЛЕЖКА</Text>
              <TextInput
                style={{ backgroundColor: colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary }}
                value={message}
                onChangeText={setMessage}
                placeholder="Бележка..."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{
                backgroundColor: saving ? colors.bgElevated : '#16A34A',
                borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 4,
              }}
            >
              {saving
                ? <ActivityIndicator color="#16A34A" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Добави приход</Text>}
            </TouchableOpacity>
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Distributor picker modal */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setPickerOpen(false)} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '60%', ...shadow.lg }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Избери доставчик</Text>
          </View>
          <ScrollView>
            {distributors.map((d) => (
              <TouchableOpacity
                key={d._id}
                onPress={() => { setDistributorId(d._id); setPickerOpen(false); }}
                style={{
                  padding: 16, borderBottomWidth: 1, borderBottomColor: colors.divider,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: distributorId === d._id ? colors.primaryLight : 'transparent',
                }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>{d.name}</Text>
                {distributorId === d._id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}

/* ─── Main Screen ─── */
export default function IncomesScreen() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [totalAdditional, setTotalAdditional] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);

  const fetchAll = async () => {
    try {
      const [additionalRes, listRes] = await Promise.all([
        api.get('/api/incomes/additional'),
        isAdmin ? api.get('/api/incomes/additional/list?per_page=50') : Promise.resolve({ data: { items: [] } }),
      ]);
      setTotalAdditional(additionalRes.data.incomes ?? 0);
      setIncomes(listRes.data.items ?? []);
    } catch { /* ignore */ }
  };

  const fetchDistributors = async () => {
    try {
      const res = await api.get<{ distributors: Distributor[] }>('/api/distributors');
      setDistributors(res.data?.distributors ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    Promise.all([fetchAll(), fetchDistributors()]).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/incomes/additional?id=${id}`);
      setIncomes((prev) => prev.filter((i) => i._id !== id));
      fetchAll();
    } catch {
      Alert.alert('Грешка', 'Неуспешно изтриване.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Приходи" icon="wallet" />

        <FlatList
          data={incomes}
          keyExtractor={(i: Income) => i._id}
          renderItem={({ item }: { item: Income }) => <IncomeCard income={item} onDelete={handleDelete} isAdmin={isAdmin} />}
          contentContainerStyle={{ paddingBottom: 16 }}
          ListFooterComponent={<View style={{ height: 100 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={{ gap: 12, paddingTop: 16 }}>
              {/* Total additional incomes box */}
              {loading ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <View style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadow.sm }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary }}>Допълнителни приходи</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#16A34A' }}>{totalAdditional.toFixed(2)} €</Text>
                </View>
              )}

              {/* List header */}
              {isAdmin && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textSecondary }}>Записи</Text>
                  <TouchableOpacity
                    onPress={() => setCreateVisible(true)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: colors.primary, borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 9, ...shadow.lg,
                    }}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Добави</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 10 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="cash-outline" size={28} color="#16A34A" />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>Няма допълнителни приходи</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      <BottomTabBar />

      <CreateIncomeModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSuccess={() => { setCreateVisible(false); fetchAll(); }}
        distributors={distributors}
      />
    </View>
  );
}

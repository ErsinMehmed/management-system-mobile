import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { colors } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, productTitle } from '@/utils/format';
import api from '@/services/api';

type Preset = '24h' | 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: '24h',       label: '24 часа' },
  { key: 'today',     label: 'Днес' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'week',      label: 'Тази седмица' },
  { key: 'month',     label: 'Този месец' },
  { key: 'all',       label: 'Всички' },
  { key: 'custom',    label: '📅 По избор' },
];

const PERIOD_LABELS: Record<Preset, string> = {
  '24h': 'последните 24 часа',
  today: 'днес',
  yesterday: 'вчера',
  week: 'тази седмица',
  month: 'този месец',
  all: 'всички времена',
  custom: 'избран период',
};

function getRange(preset: Preset): { from: string | null; to: string | null } {
  const now = dayjs();
  if (preset === '24h') return { from: now.subtract(24, 'hour').toISOString(), to: null };
  if (preset === 'today') return { from: now.startOf('day').toISOString(), to: null };
  if (preset === 'yesterday') return { from: now.subtract(1, 'day').startOf('day').toISOString(), to: now.subtract(1, 'day').endOf('day').toISOString() };
  if (preset === 'week') return { from: now.startOf('week').toISOString(), to: null };
  if (preset === 'month') return { from: now.startOf('month').toISOString(), to: null };
  if (preset === 'all') return { from: null, to: null };
  return { from: null, to: null };
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={{
      flex: 1, backgroundColor: colors.bgCard, borderRadius: 14,
      padding: 12, borderWidth: 1, borderColor: colors.border, gap: 6,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: color ?? colors.textPrimary }}>{value}</Text>
    </View>
  );
}

export default function SummaryTab() {
  const { summary, isSummaryLoading, loadSummary, markSellerAsPaid } = useClientOrderStore();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin' || isSuperAdmin;

  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const applyFilter = (p: Preset, from?: string, to?: string) => {
    if (p === 'custom') {
      loadSummary(from ?? null, to ?? null);
    } else {
      const range = getRange(p);
      loadSummary(range.from, range.to);
    }
  };

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') applyFilter(p);
  };

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiInsight(null);
    try {
      const { data } = await api.post<{ text: string }>('/api/client-orders/ai-summary', {
        summary,
        period: PERIOD_LABELS[preset] ?? preset,
      });
      setAiInsight(data.text ?? 'Неуспешен анализ.');
    } catch {
      setAiInsight('Грешка при анализа.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePayout = (seller: any) => {
    Alert.alert(
      'Изплати хонорар',
      `Сигурен ли си, че искаш да изплатиш на ${seller.sellerName}?`,
      [
        { text: 'Отмени', style: 'cancel' },
        { text: 'Изплати', onPress: () => markSellerAsPaid(seller._id) },
      ]
    );
  };

  const grandCost = summary?.bySeller && summary?.sellers
    ? summary.sellers.reduce((s: number, sel: any) => s + sel.items.reduce((si: number, item: any) => si + (item.product?.price ?? 0) * item.totalQuantity, 0), 0)
    : 0;
  const grandDistributorPayout = (summary as any)?.grandDistributorPayout ?? 0;
  const grandNetRevenue = ((summary as any)?.grandTotal ?? 0) - ((summary as any)?.grandPayout ?? 0) - grandDistributorPayout;
  const grandProfit = grandNetRevenue - grandCost;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      {/* Filter presets */}
      <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="filter" size={14} color={colors.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Период</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(({ key, label }) => {
            const isActive = preset === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePreset(key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: isActive ? colors.primary : colors.bgElevated,
                  borderWidth: 1, borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#fff' : colors.textSecondary }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {preset === 'custom' && (
          <View style={{ gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>ОТ (YYYY-MM-DD)</Text>
                <TextInput
                  style={{ backgroundColor: colors.bgElevated, borderRadius: 10, padding: 10, color: colors.textPrimary, fontSize: 13, borderWidth: 1, borderColor: colors.border }}
                  placeholder="2026-01-01"
                  placeholderTextColor={colors.textMuted}
                  value={customFrom}
                  onChangeText={setCustomFrom}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>ДО (YYYY-MM-DD)</Text>
                <TextInput
                  style={{ backgroundColor: colors.bgElevated, borderRadius: 10, padding: 10, color: colors.textPrimary, fontSize: 13, borderWidth: 1, borderColor: colors.border }}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.textMuted}
                  value={customTo}
                  onChangeText={setCustomTo}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={() => applyFilter('custom', customFrom || undefined, customTo || undefined)}
              style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Приложи</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isSummaryLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted, marginTop: 10 }}>Зареждане...</Text>
        </View>
      ) : !summary ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
          <Text style={{ fontSize: 36 }}>📊</Text>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Избери период за да видиш обобщение</Text>
        </View>
      ) : summary.bySeller ? (
        // Admin/Super Admin view
        <>
          {/* AI Button */}
          {(summary as any).grandTotal > 0 && (
            <View>
              {aiInsight ? (
                <View style={{ backgroundColor: `${colors.primary}10`, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: `${colors.primary}20`, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="flash" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>AI Обобщение</Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{aiInsight}</Text>
                  <TouchableOpacity onPress={() => { setAiInsight(null); handleAiAnalysis(); }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Обнови анализа</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleAiAnalysis}
                  disabled={isAnalyzing}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${colors.primary}10`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: `${colors.primary}20` }}
                >
                  {isAnalyzing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="flash" size={16} color={colors.primary} />}
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                    {isAnalyzing ? 'Анализирам...' : 'AI Обобщение'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Grand totals */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="📈" label="Общ оборот" value={formatCurrency((summary as any).grandTotal)} color={colors.primary} />
            <StatCard icon="🚚" label="Доставки" value={formatCurrency((summary as any).sellers?.reduce((s: number, x: any) => s + (x.sellerDelivery ?? 0), 0) ?? 0)} />
          </View>

          {isSuperAdmin && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard icon="💰" label="За изплащане" value={formatCurrency((summary as any).grandPayout)} color={colors.rejected} />
                <StatCard icon="✅" label="Изплатени" value={formatCurrency((summary as any).grandPaidPayout ?? 0)} color={colors.delivered} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard icon="🔷" label="Нето оборот" value={formatCurrency(grandNetRevenue)} color={colors.primaryLight} />
                <StatCard icon="📊" label="Печалба" value={formatCurrency(grandProfit)} color={colors.delivered} />
              </View>
            </>
          )}

          {/* Per seller */}
          {(summary as any).sellers.map((seller: any) => (
            <View key={seller._id ?? 'unassigned'} style={{ backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              {/* Seller header */}
              <View style={{ padding: 14, backgroundColor: `${colors.primary}08`, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{seller.sellerName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{seller.sellerName}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {formatCurrency(seller.sellerTotal)}
                      {isSuperAdmin && ` · ${formatCurrency(seller.sellerPayout)} хонорар`}
                    </Text>
                  </View>
                </View>
                {isSuperAdmin && seller._id && (
                  seller.sellerUnpaidCount > 0 ? (
                    <TouchableOpacity
                      onPress={() => handlePayout(seller)}
                      style={{ backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Изплати</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.deliveredBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.delivered} />
                      <Text style={{ color: colors.delivered, fontSize: 12, fontWeight: '600' }}>Изплатен</Text>
                    </View>
                  )
                )}
              </View>

              {/* Products table */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: isSuperAdmin ? 520 : 320 }}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    {['Продукт', 'Бр.', 'Оборот', 'Дост.', ...(isSuperAdmin ? ['Хонорар', 'Нето'] : [])].map((h, i) => (
                      <Text key={i} style={{ flex: i === 0 ? 2 : 1, fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: i === 0 ? 'left' : 'right' }}>{h}</Text>
                    ))}
                  </View>

                  {seller.items.slice().sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).map((item: any, i: number) => {
                    const neto = item.totalRevenue - item.totalPayout - (item.totalDistributorPayout ?? 0);
                    return (
                      <View key={i} style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ flex: 2, color: colors.textPrimary, fontSize: 12 }} numberOfLines={1}>{productTitle(item.product)}</Text>
                        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, textAlign: 'right' }}>{item.totalQuantity}</Text>
                        <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{formatCurrency(item.totalRevenue, 0)}</Text>
                        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, textAlign: 'right' }}>{item.totalDelivery > 0 ? formatCurrency(item.totalDelivery, 0) : '—'}</Text>
                        {isSuperAdmin && <Text style={{ flex: 1, color: item.unpaidCount === 0 ? colors.delivered : '#F59E0B', fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{formatCurrency(item.totalPayout, 0)}</Text>}
                        {isSuperAdmin && <Text style={{ flex: 1, color: colors.primaryLight, fontSize: 12, fontWeight: '600', textAlign: 'right' }}>{formatCurrency(neto, 0)}</Text>}
                      </View>
                    );
                  })}

                  {/* Total row */}
                  <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: `${colors.bgElevated}`, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ flex: 2, color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>ОБЩО</Text>
                    <Text style={{ flex: 1 }} />
                    <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '800', textAlign: 'right' }}>{formatCurrency(seller.sellerTotal, 0)}</Text>
                    <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'right' }}>{seller.sellerDelivery > 0 ? formatCurrency(seller.sellerDelivery, 0) : '—'}</Text>
                    {isSuperAdmin && <Text style={{ flex: 1, color: seller.sellerUnpaidCount === 0 ? colors.delivered : '#F59E0B', fontSize: 12, fontWeight: '800', textAlign: 'right' }}>{formatCurrency(seller.sellerPayout, 0)}</Text>}
                    {isSuperAdmin && <Text style={{ flex: 1, color: colors.primaryLight, fontSize: 12, fontWeight: '800', textAlign: 'right' }}>{formatCurrency(seller.sellerTotal - seller.sellerPayout - (seller.sellerDistributorPayout ?? 0), 0)}</Text>}
                  </View>
                </View>
              </ScrollView>
            </View>
          ))}
        </>
      ) : (
        // Seller view
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard icon="📈" label="Общ оборот" value={formatCurrency((summary as any).grandTotal)} color={colors.primary} />
            <StatCard icon="🚚" label="Доставки" value={formatCurrency((summary as any).grandDelivery ?? 0)} />
            <StatCard icon="✅" label="Изплатени" value={formatCurrency((summary as any).grandPaidPayout ?? 0)} color={colors.delivered} />
          </View>

          {!(summary as any).items?.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <Text style={{ fontSize: 36 }}>📭</Text>
              <Text style={{ color: colors.textMuted }}>Няма доставени поръчки</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                {['Продукт', 'Бр.', 'Оборот', 'Дост.'].map((h, i) => (
                  <Text key={i} style={{ flex: i === 0 ? 2 : 1, fontSize: 10, fontWeight: '700', color: colors.textMuted, textAlign: i === 0 ? 'left' : 'right' }}>{h}</Text>
                ))}
              </View>
              {(summary as any).items.map((item: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ flex: 2, color: colors.textPrimary, fontSize: 13 }} numberOfLines={1}>{productTitle(item.product)}</Text>
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, textAlign: 'right' }}>{item.totalQuantity}</Text>
                  <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '600', textAlign: 'right' }}>{formatCurrency(item.totalRevenue, 0)}</Text>
                  <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, textAlign: 'right' }}>{item.totalDelivery > 0 ? formatCurrency(item.totalDelivery, 0) : '—'}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', padding: 12, backgroundColor: colors.bgElevated }}>
                <Text style={{ flex: 2, color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>ОБЩО</Text>
                <Text style={{ flex: 1 }} />
                <Text style={{ flex: 1, color: colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'right' }}>{formatCurrency((summary as any).grandTotal, 0)}</Text>
                <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, fontWeight: '700', textAlign: 'right' }}>{(summary as any).grandDelivery > 0 ? formatCurrency((summary as any).grandDelivery, 0) : '—'}</Text>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

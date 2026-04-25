import { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, productTitle } from '@/utils/format';
import api from '@/services/api';

function formatDateBg(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DateField({
  label, value, onPress, onClear,
}: { label: string; value: Date | null; onPress: () => void; onClear: () => void }) {
  const filled = !!value;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.4 }}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={{
          backgroundColor: filled ? '#EEF2FF' : '#F7F8FC',
          borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
          flexDirection: 'row', alignItems: 'center', gap: 8,
          borderWidth: 1.5, borderColor: filled ? '#6366F1' : '#EBEBF5',
        }}
      >
        <Ionicons name="calendar-outline" size={16} color={filled ? '#6366F1' : '#A0A0BE'} />
        <Text style={{
          flex: 1, fontSize: 13, fontWeight: filled ? '700' : '500',
          color: filled ? '#1C1C2E' : '#A0A0BE',
        }}>
          {filled ? formatDateBg(value) : 'Избери дата'}
        </Text>
        {filled && (
          <TouchableOpacity onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#A0A0BE" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

type Preset = '24h' | 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: '24h',       label: '24ч' },
  { key: 'today',     label: 'Днес' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'week',      label: 'Седмица' },
  { key: 'month',     label: 'Месец' },
  { key: 'all',       label: 'Всички' },
  { key: 'custom',    label: 'По избор' },
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
  if (preset === '24h')       return { from: now.subtract(24, 'hour').toISOString(), to: null };
  if (preset === 'today')     return { from: now.startOf('day').toISOString(), to: null };
  if (preset === 'yesterday') return { from: now.subtract(1, 'day').startOf('day').toISOString(), to: now.subtract(1, 'day').endOf('day').toISOString() };
  if (preset === 'week')      return { from: now.startOf('week').toISOString(), to: null };
  if (preset === 'month')     return { from: now.startOf('month').toISOString(), to: null };
  return { from: null, to: null };
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={17} color={color} />
      </View>
      <Text style={{ fontSize: 11, color: '#A0A0BE', fontWeight: '600', letterSpacing: 0.3 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#1C1C2E', letterSpacing: -0.5 }}>{value}</Text>
    </View>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

const COL_PRODUCT = 160;
const COL_NUM     = 52;
const COL_VAL     = 76;

function TableHeader({ withSuperAdmin }: { withSuperAdmin?: boolean }) {
  const h = { fontSize: 10, fontWeight: '700' as const, color: '#A0A0BE', letterSpacing: 0.5 };
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F7F8FC' }}>
      <Text style={{ ...h, width: COL_PRODUCT }}>ПРОДУКТ</Text>
      <Text style={{ ...h, width: COL_NUM, textAlign: 'right' }}>БРОЙ</Text>
      <Text style={{ ...h, width: COL_VAL, textAlign: 'right' }}>ОБОРОТ</Text>
      <Text style={{ ...h, width: COL_VAL, textAlign: 'right' }}>ДОСТ.</Text>
      {withSuperAdmin && <Text style={{ ...h, width: COL_VAL, textAlign: 'right' }}>ХОНОРАР</Text>}
      {withSuperAdmin && <Text style={{ ...h, width: COL_VAL, textAlign: 'right' }}>ДИСТРИБ.</Text>}
      {withSuperAdmin && <Text style={{ ...h, width: COL_VAL, textAlign: 'right' }}>НЕТО</Text>}
      {withSuperAdmin && <Text style={{ ...h, width: COL_VAL, textAlign: 'right' }}>ПЕЧАЛБА</Text>}
    </View>
  );
}

function TableRow({ item, withSuperAdmin, last, productCost }: { item: any; withSuperAdmin?: boolean; last?: boolean; productCost?: number }) {
  const distributorPayout = item.totalDistributorPayout ?? 0;
  const neto    = item.totalRevenue - item.totalPayout - distributorPayout;
  const profit  = neto - (productCost ?? 0);
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#F4F4F8', alignItems: 'center' }}>
      <Text style={{ width: COL_PRODUCT, fontSize: 12, fontWeight: '500', color: '#1C1C2E' }} numberOfLines={1} ellipsizeMode="tail">{productTitle(item.product)}</Text>
      <Text style={{ width: COL_NUM, fontSize: 12, color: '#52527A', textAlign: 'right' }}>{item.totalQuantity} бр.</Text>
      <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: '#1C1C2E', textAlign: 'right' }}>{formatCurrency(item.totalRevenue)}</Text>
      <Text style={{ width: COL_VAL, fontSize: 12, color: '#A0A0BE', textAlign: 'right' }}>{item.totalDelivery > 0 ? formatCurrency(item.totalDelivery) : '—'}</Text>
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: item.unpaidCount === 0 ? '#16A34A' : '#F59E0B', textAlign: 'right' }}>{formatCurrency(item.totalPayout)}</Text>}
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, color: distributorPayout > 0 ? '#F59E0B' : '#A0A0BE', textAlign: 'right' }}>{distributorPayout > 0 ? formatCurrency(distributorPayout) : '—'}</Text>}
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: '#6366F1', textAlign: 'right' }}>{formatCurrency(neto)}</Text>}
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: profit >= 0 ? '#16A34A' : '#EF4444', textAlign: 'right' }}>{formatCurrency(profit)}</Text>}
    </View>
  );
}

function TotalRow({ seller, withSuperAdmin, grandProfit }: { seller: any; withSuperAdmin?: boolean; grandProfit?: number }) {
  const neto = seller.sellerTotal - seller.sellerPayout - (seller.sellerDistributorPayout ?? 0);
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#F7F8FC', alignItems: 'center' }}>
      <Text style={{ width: COL_PRODUCT, fontSize: 12, fontWeight: '800', color: '#A0A0BE' }}>Общо</Text>
      <Text style={{ width: COL_NUM }} />
      <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '800', color: '#1C1C2E', textAlign: 'right' }}>{formatCurrency(seller.sellerTotal)}</Text>
      <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: '#A0A0BE', textAlign: 'right' }}>{seller.sellerDelivery > 0 ? formatCurrency(seller.sellerDelivery) : '—'}</Text>
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '800', color: seller.sellerUnpaidCount === 0 ? '#16A34A' : '#F59E0B', textAlign: 'right' }}>{formatCurrency(seller.sellerPayout)}</Text>}
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: (seller.sellerDistributorPayout ?? 0) > 0 ? '#F59E0B' : '#A0A0BE', textAlign: 'right' }}>{(seller.sellerDistributorPayout ?? 0) > 0 ? formatCurrency(seller.sellerDistributorPayout) : '—'}</Text>}
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '800', color: '#6366F1', textAlign: 'right' }}>{formatCurrency(neto)}</Text>}
      {withSuperAdmin && <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '800', color: (grandProfit ?? 0) >= 0 ? '#16A34A' : '#EF4444', textAlign: 'right' }}>{formatCurrency(grandProfit ?? 0)}</Text>}
    </View>
  );
}

function SellerTotalRow({ grandTotal, grandDelivery }: { grandTotal: number; grandDelivery: number }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, backgroundColor: '#F7F8FC', alignItems: 'center' }}>
      <Text style={{ width: COL_PRODUCT, fontSize: 12, fontWeight: '800', color: '#A0A0BE' }}>Общо</Text>
      <Text style={{ width: COL_NUM }} />
      <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '800', color: '#6366F1', textAlign: 'right' }}>{formatCurrency(grandTotal)}</Text>
      <Text style={{ width: COL_VAL, fontSize: 12, fontWeight: '700', color: '#A0A0BE', textAlign: 'right' }}>{grandDelivery > 0 ? formatCurrency(grandDelivery) : '—'}</Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SummaryTab() {
  const { summary, isSummaryLoading, loadSummary, markSellerAsPaid } = useClientOrderStore();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'Super Admin';

  const [preset, setPreset]         = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo]     = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState<null | 'from' | 'to'>(null);
  const [aiInsight, setAiInsight]   = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setPickerOpen(null);
    if (event.type === 'dismissed') return;
    if (!selected) return;
    if (pickerOpen === 'from') setCustomFrom(selected);
    else if (pickerOpen === 'to') setCustomTo(selected);
  };

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
    const amount = seller.sellerUnpaidPayout ?? seller.sellerPayout ?? 0;
    Alert.alert(
      'Изплати хонорар',
      `${seller.sellerName}\n\nСума за изплащане: ${formatCurrency(amount)}\nНеизплатени поръчки: ${seller.sellerUnpaidCount ?? 0}`,
      [
        { text: 'Отмени', style: 'cancel' },
        { text: 'Изплати', onPress: () => markSellerAsPaid(seller._id) },
      ]
    );
  };

  const grandDistributorPayout = (summary as any)?.grandDistributorPayout ?? 0;
  const grandNetRevenue = ((summary as any)?.grandTotal ?? 0) - ((summary as any)?.grandPayout ?? 0) - grandDistributorPayout;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F5F6FA' }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>

      {/* ── PERIOD FILTER ── */}
      <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.5 }}>ПЕРИОД</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(({ key, label }) => {
            const active = preset === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePreset(key)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: active ? '#6366F1' : '#F4F4F8',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : '#52527A' }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {preset === 'custom' && (
          <View style={{ gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F8' }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <DateField
                label="ОТ"
                value={customFrom}
                onPress={() => setPickerOpen('from')}
                onClear={() => setCustomFrom(null)}
              />
              <DateField
                label="ДО"
                value={customTo}
                onPress={() => setPickerOpen('to')}
                onClear={() => setCustomTo(null)}
              />
            </View>
            <TouchableOpacity
              onPress={() => applyFilter(
                'custom',
                customFrom ? dayjs(customFrom).startOf('day').toISOString() : undefined,
                customTo ? dayjs(customTo).endOf('day').toISOString() : undefined,
              )}
              disabled={!customFrom && !customTo}
              style={{
                backgroundColor: (!customFrom && !customTo) ? '#C7CDE8' : '#6366F1',
                borderRadius: 12, paddingVertical: 12, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Приложи</Text>
            </TouchableOpacity>

            {/* Native picker — iOS shows a sheet, Android opens a system dialog */}
            {pickerOpen && Platform.OS === 'ios' && (
              <Modal transparent animationType="fade" onRequestClose={() => setPickerOpen(null)}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
                  activeOpacity={1}
                  onPress={() => setPickerOpen(null)}
                />
                <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#A0A0BE', letterSpacing: 0.4 }}>
                      {pickerOpen === 'from' ? 'ОТ' : 'ДО'}
                    </Text>
                    <TouchableOpacity onPress={() => setPickerOpen(null)}>
                      <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 14 }}>Готово</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <DateTimePicker
                      value={(pickerOpen === 'from' ? customFrom : customTo) ?? new Date()}
                      mode="date"
                      display="inline"
                      locale="bg-BG"
                      onChange={onPickerChange}
                      accentColor="#6366F1"
                      themeVariant="light"
                      maximumDate={pickerOpen === 'from' && customTo ? customTo : undefined}
                      minimumDate={pickerOpen === 'to' && customFrom ? customFrom : undefined}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {pickerOpen && Platform.OS === 'android' && (
              <DateTimePicker
                value={(pickerOpen === 'from' ? customFrom : customTo) ?? new Date()}
                mode="date"
                onChange={onPickerChange}
                maximumDate={pickerOpen === 'from' && customTo ? customTo : undefined}
                minimumDate={pickerOpen === 'to' && customFrom ? customFrom : undefined}
              />
            )}
          </View>
        )}
      </View>

      {/* ── STATES ── */}
      {isSummaryLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
          <ActivityIndicator color="#6366F1" size="large" />
          <Text style={{ color: '#A0A0BE', fontSize: 14 }}>Зареждане...</Text>
        </View>
      ) : !summary ? (
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="bar-chart-outline" size={30} color="#6366F1" />
          </View>
          <Text style={{ color: '#1C1C2E', fontSize: 15, fontWeight: '700' }}>Избери период</Text>
          <Text style={{ color: '#A0A0BE', fontSize: 13 }}>Натисни някой от периодите горе</Text>
        </View>

      ) : summary.bySeller ? (
        // ── ADMIN / SUPER ADMIN VIEW ──
        <>
          {/* AI Insight */}
          {(summary as any).grandTotal > 0 && (
            aiInsight ? (
              <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="flash" size={15} color="#6366F1" />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#6366F1' }}>AI Обобщение</Text>
                </View>
                <Text style={{ color: '#52527A', fontSize: 13, lineHeight: 21 }}>{aiInsight}</Text>
                <TouchableOpacity onPress={() => { setAiInsight(null); handleAiAnalysis(); }}>
                  <Text style={{ color: '#A0A0BE', fontSize: 12, fontWeight: '600' }}>Обнови анализа</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleAiAnalysis}
                disabled={isAnalyzing}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 18, padding: 16 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  {isAnalyzing
                    ? <ActivityIndicator size="small" color="#6366F1" />
                    : <Ionicons name="flash" size={18} color="#6366F1" />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#1C1C2E', fontWeight: '700', fontSize: 14 }}>
                    {isAnalyzing ? 'Анализирам...' : 'AI Обобщение'}
                  </Text>
                  <Text style={{ color: '#A0A0BE', fontSize: 12, marginTop: 1 }}>Анализ на продажбите за периода</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C0C0D8" />
              </TouchableOpacity>
            )
          )}

          {/* Grand stat cards */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard label="Оборот" value={formatCurrency((summary as any).grandTotal)} color="#6366F1" icon="trending-up-outline" />
            <StatCard
              label="Доставки"
              value={formatCurrency((summary as any).sellers?.reduce((s: number, x: any) => s + (x.sellerDelivery ?? 0), 0) ?? 0)}
              color="#7878A0"
              icon="car-outline"
            />
          </View>

          {isSuperAdmin && (
            <>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Хонорари" value={formatCurrency((summary as any).grandPayout)} color="#EF4444" icon="cash-outline" />
                <StatCard label="Изплатени" value={formatCurrency((summary as any).grandPaidPayout ?? 0)} color="#16A34A" icon="checkmark-circle-outline" />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Нето" value={formatCurrency(grandNetRevenue)} color="#8B5CF6" icon="analytics-outline" />
                <StatCard label="Печалба" value={formatCurrency(grandNetRevenue - ((summary as any).sellers?.reduce((s: number, x: any) => s + x.items.reduce((si: number, item: any) => si + (item.product?.price ?? 0) * item.totalQuantity, 0), 0) ?? 0))} color="#16A34A" icon="trending-up-outline" />
              </View>
            </>
          )}

          {/* Per seller */}
          {(summary as any).sellers.map((seller: any) => (
            <View key={seller._id ?? 'unassigned'} style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' }}>

              {/* Seller header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#6366F1', fontWeight: '800', fontSize: 15 }}>
                    {seller.sellerName?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#1C1C2E', fontWeight: '700', fontSize: 15 }}>{seller.sellerName}</Text>
                  <Text style={{ color: '#A0A0BE', fontSize: 12, marginTop: 2 }}>
                    {formatCurrency(seller.sellerTotal)}
                    {isSuperAdmin && ` · ${formatCurrency(seller.sellerPayout)} хонорар`}
                  </Text>
                </View>
                {isSuperAdmin && seller._id && (
                  seller.sellerUnpaidCount > 0 ? (
                    <TouchableOpacity
                      onPress={() => handlePayout(seller)}
                      style={{ backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Изплати</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                      <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                      <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>Изплатен</Text>
                    </View>
                  )
                )}
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: '#F4F4F8' }} />

              {/* Table */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <TableHeader withSuperAdmin={isSuperAdmin} />
                  {seller.items.slice().sort((a: any, b: any) => b.totalRevenue - a.totalRevenue).map((item: any, i: number) => {
                    const cost = (item.product?.price ?? 0) * item.totalQuantity;
                    return (
                      <TableRow key={i} item={item} withSuperAdmin={isSuperAdmin} last={i === seller.items.length - 1} productCost={cost} />
                    );
                  })}
                  <TotalRow
                    seller={seller}
                    withSuperAdmin={isSuperAdmin}
                    grandProfit={seller.items.reduce((acc: number, item: any) => {
                      const cost = (item.product?.price ?? 0) * item.totalQuantity;
                      const neto = item.totalRevenue - item.totalPayout - (item.totalDistributorPayout ?? 0);
                      return acc + neto - cost;
                    }, 0)}
                  />
                </View>
              </ScrollView>
            </View>
          ))}
        </>

      ) : (
        // ── SELLER VIEW ──
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard label="Оборот" value={formatCurrency((summary as any).grandTotal)} color="#6366F1" icon="trending-up-outline" />
            <StatCard label="Доставки" value={formatCurrency((summary as any).grandDelivery ?? 0)} color="#7878A0" icon="car-outline" />
          </View>
          <StatCard label="Изплатени" value={formatCurrency((summary as any).grandPaidPayout ?? 0)} color="#16A34A" icon="checkmark-circle-outline" />

          {!(summary as any).items?.length ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#F4F4F8', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="receipt-outline" size={26} color="#A0A0BE" />
              </View>
              <Text style={{ color: '#A0A0BE', fontSize: 13 }}>Няма доставени поръчки</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <TableHeader />
                  {(summary as any).items.map((item: any, i: number) => (
                    <TableRow key={i} item={item} last={i === (summary as any).items.length - 1} />
                  ))}
                  <SellerTotalRow grandTotal={(summary as any).grandTotal} grandDelivery={(summary as any).grandDelivery ?? 0} />
                </View>
              </ScrollView>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

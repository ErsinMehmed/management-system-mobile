import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Animated, Pressable, FlatList, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

/* ─── Types ─── */
type CardKey = 'incomes' | 'expenses' | 'profit';

interface Product {
  _id: string;
  name: string;
  weight?: number;
  puffs?: number;
  flavor?: string;
  count?: number;
  availability: number;
  units_per_box: number;
  price: number;
  image_url?: string;
  hidden?: boolean;
  category: { name: string };
}

interface StockRow {
  id: string;
  name: string;
  image_url?: string;
  cartons: number;
  bottles: number;
  value: number;
}

type Period = 'today' | 'yesterday' | 'last7days' | 'lastMonth' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today',     label: 'Днес' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'last7days', label: '7 дни' },
  { key: 'lastMonth', label: '30 дни' },
  { key: 'all',       label: 'Всичко' },
];

interface CategoryProductRow {
  _id: string;
  name: string;
  weight?: number;
  puffs?: number;
  flavor?: string;
  count?: number;
  category: string;
  quantity: number;
  total: number;
}

interface IncomesResponse {
  incomes: number;
  incomes_by_products: Array<Omit<CategoryProductRow, 'total'> & { total_incomes: number }>;
}

interface AdditionalIncomesResponse {
  incomes: number;
}

interface ExpensesResponse {
  total_ad_expenses: number;
  total_order_expenses: number;
  total_fuel_expenses: number;
  total_additional_expenses: number;
  expenses_by_products: Array<Omit<CategoryProductRow, 'total'> & { total_expenses: number }>;
}

interface CategoryItem { _id: string; name: string }

const CARD_THEMES: Record<CardKey, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; iconColor: string; iconBg: string; borderColor: string; valueColor: string }> = {
  incomes:  { label: 'Приходи',  icon: 'trending-up-outline',   iconColor: '#16A34A', iconBg: '#F0FDF4', borderColor: '#16A34A', valueColor: '#16A34A' },
  expenses: { label: 'Разходи',  icon: 'trending-down-outline', iconColor: '#DC2626', iconBg: '#FEF2F2', borderColor: '#DC2626', valueColor: '#DC2626' },
  profit:   { label: 'Печалба',  icon: 'bar-chart-outline',     iconColor: '#6366F1', iconBg: '#EEF2FF', borderColor: '#6366F1', valueColor: '#1C1C2E' },
};

function productLabel(p: { name: string; weight?: number; puffs?: number; flavor?: string; count?: number; category?: string }) {
  switch (p.category) {
    case 'Бутилки': return `${p.name}${p.weight ? ` ${p.weight}гр.` : ''}`;
    case 'Балони': return `${p.name}${p.count ? ` ${p.count}бр.` : ''}`;
    case 'Вейпове': return `${p.name}${p.puffs ? ` ${p.puffs}k` : ''}`;
    default: return p.name;
  }
}

/* ─── Category Detail Modal ─── */
interface OtherRow { label: string; amount: number }

function CategoryDetailModal({
  visible, kind, onClose, products, categories, otherRows,
}: {
  visible: boolean;
  kind: 'incomes' | 'expenses';
  onClose: () => void;
  products: CategoryProductRow[];
  categories: string[];
  otherRows: OtherRow[];
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const theme     = CARD_THEMES[kind];
  const allTabs   = otherRows.length > 0 ? [...categories, 'Други'] : categories;
  const [activeTab, setActiveTab] = useState<string>(allTabs[0] ?? '');

  useEffect(() => {
    if (!activeTab && allTabs.length) setActiveTab(allTabs[0]);
    if (activeTab && !allTabs.includes(activeTab) && allTabs.length) setActiveTab(allTabs[0]);
  }, [allTabs.join(',')]);

  const open = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 260, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const rows = activeTab === 'Други'
    ? []
    : products.filter((p) => p.category === activeTab);
  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
  const totalAmt = rows.reduce((s, r) => s + r.total, 0);
  const otherTotal = otherRows.reduce((s, r) => s + r.amount, 0);

  return (
    <Modal visible={visible} transparent statusBarTranslucent onShow={open} onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', opacity: fadeAnim }}>
        <Pressable style={{ flex: 1 }} onPress={close} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: insets.bottom + 16,
        ...shadow.lg,
        transform: [{ translateY: slideAnim }],
        maxHeight: '88%',
      }}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: colors.divider,
        }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: theme.iconBg,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons name={theme.icon} size={20} color={theme.iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 }}>
              {kind === 'incomes' ? 'ПРИХОДИ ПО КАТЕГОРИИ' : 'РАЗХОДИ ПО КАТЕГОРИИ'}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textPrimary }}>
              {theme.label}
            </Text>
          </View>
          <TouchableOpacity
            onPress={close}
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}
        >
          {allTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                  backgroundColor: isActive ? theme.iconColor : colors.bgInput,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#fff' : colors.textSecondary }}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Body */}
        {activeTab === 'Други' ? (
          <FlatList
            data={otherRows}
            keyExtractor={(_, i) => String(i)}
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}
            ListFooterComponent={otherRows.length > 1 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
                marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider,
              }}>
                <View style={{ backgroundColor: theme.iconBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.iconColor }}>
                    {otherTotal.toFixed(2)} €
                  </Text>
                </View>
              </View>
            ) : null}
            renderItem={({ item }) => (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.iconColor }}>{item.amount.toFixed(2)} €</Text>
              </View>
            )}
            ListEmptyComponent={(
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Няма налични данни</Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item._id}
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}
            ListFooterComponent={rows.length > 1 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.divider,
              }}>
                <View style={{ backgroundColor: colors.bgInput, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>{totalQty} бр.</Text>
                </View>
                <View style={{ backgroundColor: theme.iconBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.iconColor }}>
                    {totalAmt.toFixed(2)} €
                  </Text>
                </View>
              </View>
            ) : null}
            renderItem={({ item }) => {
              const unit = item.quantity > 0 ? item.total / item.quantity : 0;
              return (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                      {productLabel(item)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {item.quantity} бр. · {unit.toFixed(2)} € / бр.
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.iconColor }}>
                    {item.total.toFixed(2)} €
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={(
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Няма налични данни</Text>
              </View>
            )}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

/* ─── Stock Table ─── */
const COL_PRODUCT = 160;
const COL_CARTONS = 72;
const COL_BOTTLES = 72;
const COL_VALUE   = 88;

function SectionHeader({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: colors.primary }} />
      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function TableColHeaders({ showValue }: { showValue: boolean }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bgElevated, paddingVertical: 8 }}>
      <Text style={[styles.colHeader, { width: COL_PRODUCT }]}>ПРОДУКТ</Text>
      <Text style={[styles.colHeader, { width: COL_CARTONS }]}>КАШОНИ</Text>
      <Text style={[styles.colHeader, { width: COL_BOTTLES }]}>БУТИЛКИ</Text>
      {showValue && <Text style={[styles.colHeader, { width: COL_VALUE }]}>СТОЙНОСТ</Text>}
    </View>
  );
}

function ProductRow({ row, showValue, accentColor }: { row: StockRow; showValue: boolean; accentColor: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      {/* Product */}
      <View style={{ width: COL_PRODUCT, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, gap: 8 }}>
        {row.image_url ? (
          <Image
            source={{ uri: row.image_url }}
            style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
          </View>
        )}
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary, flex: 1 }} numberOfLines={2}>
          {row.name}
        </Text>
      </View>

      {/* Cartons */}
      <Text style={[styles.colCell, { width: COL_CARTONS }]}>{row.cartons.toFixed(1)} бр.</Text>

      {/* Bottles */}
      <Text style={[styles.colCell, { width: COL_BOTTLES, color: accentColor, fontWeight: '700' }]}>{row.bottles} бр.</Text>

      {/* Value */}
      {showValue && (
        <Text style={[styles.colCell, { width: COL_VALUE, color: colors.textSecondary }]}>
          {row.value.toFixed(2)} €
        </Text>
      )}
    </View>
  );
}

function SubtotalRow({ rows, showValue, label = 'Сума:' }: { rows: StockRow[]; showValue: boolean; label?: string }) {
  const totalCartons = rows.reduce((s, r) => s + r.cartons, 0);
  const totalBottles = rows.reduce((s, r) => s + r.bottles, 0);
  const totalValue   = rows.reduce((s, r) => s + r.value, 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FF', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
      <Text style={{ width: COL_PRODUCT, paddingLeft: 12, fontSize: 11, fontWeight: '700', color: colors.textMuted }}>{label}</Text>
      <Text style={[styles.colCell, { width: COL_CARTONS, color: colors.textSecondary }]}>{totalCartons.toFixed(1)} бр.</Text>
      <Text style={[styles.colCell, { width: COL_BOTTLES, color: colors.textSecondary }]}>{totalBottles} бр.</Text>
      {showValue && <Text style={[styles.colCell, { width: COL_VALUE, color: colors.textSecondary }]}>{totalValue.toFixed(2)} €</Text>}
    </View>
  );
}

function StockTable({ products, isAdmin }: { products: Product[]; isAdmin: boolean }) {
  const bottles = products
    .filter((p) => p.category?.name === 'Бутилки' && !p.hidden && p.availability > 0)
    .map((p): StockRow => ({
      id: p._id,
      name: `${p.name}${p.weight ? ` ${p.weight}гр.` : ''}`,
      image_url: p.image_url,
      cartons: p.units_per_box ? p.availability / p.units_per_box : 0,
      bottles: p.availability,
      value: p.price * p.availability,
    }));

  const vapes = products
    .filter((p) => p.category?.name === 'Вейпове' && !p.hidden && p.availability > 0)
    .map((p): StockRow => ({
      id: p._id,
      name: `${p.name}${p.puffs ? ` ${p.puffs}k` : ''}`,
      image_url: p.image_url,
      cartons: p.units_per_box ? p.availability / p.units_per_box : 0,
      bottles: p.availability,
      value: p.price * p.availability,
    }));

  const totalValue = [...bottles, ...vapes].reduce((s, r) => s + r.value, 0);

  if (!bottles.length && !vapes.length) {
    return (
      <View style={{ padding: 32, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Няма налични продукти</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <TableColHeaders showValue={isAdmin} />

        {bottles.length > 0 && (
          <>
            <SectionHeader label="Бутилки" />
            {bottles.map((row) => (
              <ProductRow key={row.id} row={row} showValue={isAdmin} accentColor="#16A34A" />
            ))}
            <SubtotalRow rows={bottles} showValue={isAdmin} />
          </>
        )}

        {vapes.length > 0 && (
          <>
            <SectionHeader label="Вейпове" />
            {vapes.map((row) => (
              <ProductRow key={row.id} row={row} showValue={isAdmin} accentColor="#6366F1" />
            ))}
            <SubtotalRow rows={vapes} showValue={isAdmin} />
          </>
        )}

        {isAdmin && (
          <View style={{ flexDirection: 'row', backgroundColor: colors.textPrimary, paddingVertical: 10 }}>
            <Text style={{ width: COL_PRODUCT + COL_CARTONS + COL_BOTTLES, paddingLeft: 12, fontSize: 12, fontWeight: '800', color: '#fff' }}>
              ОБЩО:
            </Text>
            <Text style={{ width: COL_VALUE, fontSize: 12, fontWeight: '800', color: '#fff', textAlign: 'center' }}>
              {totalValue.toFixed(2)} €
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = {
  colHeader: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.textMuted,
    letterSpacing: 0.5,
    paddingLeft: 10,
  },
  colCell: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    paddingLeft: 10,
  },
};

/* ─── Main Screen ─── */
export default function DashboardScreen() {
  const user    = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin';

  const [period, setPeriod]                       = useState<Period>('lastMonth');
  const [products, setProducts]                   = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts]     = useState(true);
  const [incomes, setIncomes]                     = useState<IncomesResponse | null>(null);
  const [additionalIncomes, setAdditional]        = useState<AdditionalIncomesResponse | null>(null);
  const [expenses, setExpenses]                   = useState<ExpensesResponse | null>(null);
  const [categories, setCategories]               = useState<string[]>([]);
  const [loadingStats, setLoadingStats]           = useState(true);
  const [openCard, setOpenCard]                   = useState<'incomes' | 'expenses' | null>(null);

  useEffect(() => {
    api.get<Product[]>('/api/products')
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));

    api.get<CategoryItem[]>('/api/categories')
      .then((res) => setCategories(res.data.map((c) => c.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingStats(true);
    const params = { period };
    Promise.all([
      api.get<IncomesResponse>('/api/incomes', { params }).then((r) => r.data).catch(() => null),
      isAdmin ? api.get<AdditionalIncomesResponse>('/api/incomes/additional', { params }).then((r) => r.data).catch(() => null) : Promise.resolve(null),
      isAdmin ? api.get<ExpensesResponse>('/api/expenses', { params }).then((r) => r.data).catch(() => null) : Promise.resolve(null),
    ]).then(([inc, addInc, exp]) => {
      setIncomes(inc);
      setAdditional(addInc);
      setExpenses(exp);
    }).finally(() => setLoadingStats(false));
  }, [period, isAdmin]);

  const totalIncomes = incomes?.incomes ?? 0;
  const totalExpenses =
    (expenses?.total_order_expenses ?? 0) +
    (expenses?.total_fuel_expenses ?? 0) +
    (expenses?.total_ad_expenses ?? 0) +
    (expenses?.total_additional_expenses ?? 0);
  const totalProfit = totalIncomes - totalExpenses;

  const incomesProducts: CategoryProductRow[] = (incomes?.incomes_by_products ?? []).map((p) => ({
    _id: String(p._id),
    name: p.name,
    weight: p.weight,
    puffs: p.puffs,
    flavor: p.flavor,
    count: p.count,
    category: p.category,
    quantity: p.quantity,
    total: p.total_incomes,
  }));

  const incomesOtherRows: OtherRow[] = (additionalIncomes?.incomes ?? 0) > 0
    ? [{ label: 'Допълнителни приходи', amount: additionalIncomes!.incomes }]
    : [];

  const expensesProducts: CategoryProductRow[] = (expenses?.expenses_by_products ?? []).map((p) => ({
    _id: String(p._id),
    name: p.name,
    weight: p.weight,
    puffs: p.puffs,
    flavor: p.flavor,
    count: p.count,
    category: p.category,
    quantity: p.quantity,
    total: p.total_expenses,
  }));

  const expensesOtherRows: OtherRow[] = [
    expenses?.total_fuel_expenses && expenses.total_fuel_expenses > 0
      ? { label: 'Гориво', amount: expenses.total_fuel_expenses }
      : null,
    expenses?.total_ad_expenses && expenses.total_ad_expenses > 0
      ? { label: 'Реклами', amount: expenses.total_ad_expenses }
      : null,
    expenses?.total_additional_expenses && expenses.total_additional_expenses > 0
      ? { label: 'Допълнителни', amount: expenses.total_additional_expenses }
      : null,
  ].filter(Boolean) as OtherRow[];

  const cards: { key: CardKey; value: number; clickable: boolean }[] = isAdmin
    ? [
        { key: 'incomes',  value: totalIncomes,  clickable: true  },
        { key: 'expenses', value: totalExpenses, clickable: true  },
        { key: 'profit',   value: totalProfit,   clickable: false },
      ]
    : [
        { key: 'incomes', value: totalIncomes, clickable: true },
      ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Табло" icon="home" />

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Period chips */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
          >
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
                    backgroundColor: active ? colors.primary : '#fff',
                    ...shadow.sm,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {cards.map(({ key, value, clickable }) => {
              const theme = CARD_THEMES[key];
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={clickable ? 0.7 : 1}
                  onPress={() => clickable ? setOpenCard(key as 'incomes' | 'expenses') : null}
                  disabled={!clickable}
                  style={{
                    flex: 1, backgroundColor: '#fff', borderRadius: 18,
                    padding: 14, borderTopWidth: 3, borderTopColor: theme.borderColor,
                    ...shadow.sm,
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: theme.iconBg,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 10,
                  }}>
                    <Ionicons name={theme.icon} size={18} color={theme.iconColor} />
                  </View>
                  {loadingStats ? (
                    <View style={{ height: 22, marginBottom: 4, backgroundColor: colors.bgInput, borderRadius: 6 }} />
                  ) : (
                    <Text style={{ fontSize: 17, fontWeight: '800', color: theme.valueColor, marginBottom: 2, letterSpacing: -0.3 }} numberOfLines={1}>
                      {value.toFixed(2)} €
                    </Text>
                  )}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stock table */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', ...shadow.sm }}>
            {/* Table header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 16, paddingVertical: 14,
              borderBottomWidth: 1, borderBottomColor: colors.divider,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: colors.primaryLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="cube-outline" size={17} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                  Наличности
                </Text>
              </View>
              {loadingProducts && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {loadingProducts ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <StockTable products={products} isAdmin={isAdmin} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomTabBar />

      <CategoryDetailModal
        visible={openCard !== null}
        kind={openCard ?? 'incomes'}
        onClose={() => setOpenCard(null)}
        products={openCard === 'expenses' ? expensesProducts : incomesProducts}
        categories={categories}
        otherRows={openCard === 'expenses' ? expensesOtherRows : incomesOtherRows}
      />
    </View>
  );
}

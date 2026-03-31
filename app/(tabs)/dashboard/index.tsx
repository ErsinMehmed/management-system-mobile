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

/* ─── Stat cards ─── */
const STAT_CARDS: {
  key: CardKey;
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  borderColor: string;
}[] = [
  { key: 'incomes',  label: 'Приходи',  value: '—', icon: 'trending-up-outline',   iconColor: '#16A34A', iconBg: '#F0FDF4', borderColor: '#16A34A' },
  { key: 'expenses', label: 'Разходи',  value: '—', icon: 'trending-down-outline', iconColor: '#DC2626', iconBg: '#FEF2F2', borderColor: '#DC2626' },
  { key: 'profit',   label: 'Печалба',  value: '—', icon: 'bar-chart-outline',     iconColor: '#6366F1', iconBg: '#EEF2FF', borderColor: '#6366F1' },
];

/* ─── Dummy detail data ─── */
type TabKey = 'today' | 'week' | 'month';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: 'Днес' },
  { key: 'week',  label: 'Седмица' },
  { key: 'month', label: 'Месец' },
];

const DUMMY: Record<CardKey, Record<TabKey, { label: string; amount: string }[]>> = {
  incomes: {
    today: [
      { label: 'Продажба #1042', amount: '120.00 €' },
      { label: 'Продажба #1043', amount: '85.50 €' },
      { label: 'Продажба #1044', amount: '200.00 €' },
    ],
    week: [
      { label: 'Понеделник', amount: '540.00 €' },
      { label: 'Вторник',    amount: '320.00 €' },
      { label: 'Сряда',      amount: '410.00 €' },
      { label: 'Четвъртък',  amount: '290.00 €' },
      { label: 'Петък',      amount: '680.00 €' },
    ],
    month: [
      { label: 'Януари',   amount: '4 200.00 €' },
      { label: 'Февруари', amount: '3 850.00 €' },
      { label: 'Март',     amount: '5 100.00 €' },
    ],
  },
  expenses: {
    today: [
      { label: 'Доставка материали', amount: '55.00 €' },
      { label: 'Комунални услуги',   amount: '30.00 €' },
    ],
    week: [
      { label: 'Понеделник', amount: '120.00 €' },
      { label: 'Вторник',    amount: '95.00 €' },
      { label: 'Сряда',      amount: '140.00 €' },
      { label: 'Четвъртък',  amount: '60.00 €' },
      { label: 'Петък',      amount: '180.00 €' },
    ],
    month: [
      { label: 'Януари',   amount: '1 100.00 €' },
      { label: 'Февруари', amount: '980.00 €' },
      { label: 'Март',     amount: '1 340.00 €' },
    ],
  },
  profit: {
    today: [
      { label: 'Нетна печалба днес', amount: '320.50 €' },
      { label: 'Марж',               amount: '42%' },
    ],
    week: [
      { label: 'Понеделник', amount: '420.00 €' },
      { label: 'Вторник',    amount: '225.00 €' },
      { label: 'Сряда',      amount: '270.00 €' },
      { label: 'Четвъртък',  amount: '230.00 €' },
      { label: 'Петък',      amount: '500.00 €' },
    ],
    month: [
      { label: 'Януари',   amount: '3 100.00 €' },
      { label: 'Февруари', amount: '2 870.00 €' },
      { label: 'Март',     amount: '3 760.00 €' },
    ],
  },
};

/* ─── Detail Modal ─── */
function DetailModal({
  card,
  onClose,
}: {
  card: (typeof STAT_CARDS)[number] | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const open = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0,   duration: 320, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1,   duration: 260, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 260, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!card) return null;

  const rows = DUMMY[card.key][activeTab];

  return (
    <Modal visible transparent statusBarTranslucent onShow={open} onRequestClose={close}>
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
            backgroundColor: card.iconBg,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 12,
          }}>
            <Ionicons name={card.icon} size={20} color={card.iconColor} />
          </View>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
            {card.label}
          </Text>
          <TouchableOpacity
            onPress={close}
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 14 }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isActive ? card.iconColor : colors.bgInput,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#fff' : colors.textMuted }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          style={{ maxHeight: 280 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          renderItem={({ item }) => (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.bg, borderRadius: 14,
              paddingHorizontal: 16, paddingVertical: 14,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: card.iconColor, marginRight: 12 }} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{item.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: card.iconColor }}>{item.amount}</Text>
            </View>
          )}
        />
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

  const [selectedCard, setSelectedCard] = useState<(typeof STAT_CARDS)[number] | null>(null);
  const [products, setProducts]         = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    api.get<Product[]>('/api/products')
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title="Табло" icon="home" />

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Stat cards */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {STAT_CARDS.map((card) => (
              <TouchableOpacity
                key={card.key}
                activeOpacity={0.75}
                onPress={() => setSelectedCard(card)}
                style={{
                  flex: 1, backgroundColor: '#fff', borderRadius: 18,
                  padding: 14, borderTopWidth: 3, borderTopColor: card.borderColor,
                  ...shadow.sm,
                }}
              >
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: card.iconBg,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <Ionicons name={card.icon} size={18} color={card.iconColor} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 }}>
                  {card.value}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 }}>
                  {card.label}
                </Text>
              </TouchableOpacity>
            ))}
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

      {selectedCard && (
        <DetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </View>
  );
}

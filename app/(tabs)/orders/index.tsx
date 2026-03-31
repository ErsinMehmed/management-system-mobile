import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';

import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import OrdersTab from '@/components/orders/OrdersTab';
import SummaryTab from '@/components/orders/SummaryTab';
import HistoryTab from '@/components/orders/HistoryTab';
import StockTab from '@/components/orders/StockTab';
import ClientsTab from '@/components/orders/ClientsTab';
import CreateOrderModal from '@/components/orders/CreateOrderModal';
import RejectionModal from '@/components/orders/RejectionModal';

const ALL_TABS = [
  { key: 'orders',  label: 'Заявки',     icon: 'receipt-outline',   activeIcon: 'receipt',    roles: null },
  { key: 'summary', label: 'Обобщение',  icon: 'bar-chart-outline', activeIcon: 'bar-chart',  roles: null },
  { key: 'history', label: 'История',    icon: 'time-outline',      activeIcon: 'time',       roles: ['Admin', 'Super Admin'] },
  { key: 'stock',   label: 'Наличности', icon: 'cube-outline',      activeIcon: 'cube',       roles: ['Admin', 'Super Admin'] },
  { key: 'clients', label: 'Клиенти',    icon: 'people-outline',    activeIcon: 'people',     roles: ['Super Admin'] },
] as const;

type TabKey = typeof ALL_TABS[number]['key'];

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [createVisible, setCreateVisible] = useState(false);
  const [rejectionOrderId, setRejectionOrderId] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const { loadOrders, loadSummary, loadHistory, loadStock, loadClients } = useClientOrderStore();

  const tabScrollRef = useRef<ScrollView>(null);
  const tabWidths = useRef<Record<string, number>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const initDone = useRef(false);

  const isSuperAdmin = user?.role === 'Super Admin';
  const isAdmin = user?.role === 'Admin' || isSuperAdmin;
  const TABS = ALL_TABS.filter((t) => !t.roles || t.roles.includes(user?.role as any));

  useEffect(() => {
    loadOrders(1);
    loadSummary();
    if (isAdmin) loadHistory();
    if (isAdmin) loadStock();
    if (isSuperAdmin) loadClients(1, '', true);
  }, []);

  const handleTabPress = (key: TabKey, index: number) => {
    setActiveTab(key);
    const x = TABS.slice(0, index).reduce((sum, t) => sum + (tabWidths.current[t.key] ?? 80), 0);
    const w = tabWidths.current[key] ?? 80;
    Animated.parallel([
      Animated.spring(indicatorX, { toValue: x, useNativeDriver: false, damping: 20, stiffness: 200 }),
      Animated.spring(indicatorW, { toValue: w, useNativeDriver: false, damping: 20, stiffness: 200 }),
    ]).start();
    tabScrollRef.current?.scrollTo({ x: Math.max(0, x - 40), animated: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':  return <OrdersTab onCreatePress={() => setCreateVisible(true)} onRejection={setRejectionOrderId} />;
      case 'summary': return <SummaryTab />;
      case 'history': return <HistoryTab />;
      case 'stock':   return <StockTab />;
      case 'clients': return <ClientsTab />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <AppHeader title="Клиентски поръчки" />

      {/* Sub-tab bar */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 0, ...shadow.sm }}>
        {/* Tab bar */}
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 0 }}
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  tabWidths.current[tab.key] = w;
                  if (!initDone.current && tab.key === 'orders') {
                    initDone.current = true;
                    indicatorW.setValue(w);
                  }
                }}
                onPress={() => handleTabPress(tab.key, index)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 10, marginRight: 4 }}
              >
                <Ionicons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={14}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text style={{
                  fontSize: 13, fontWeight: isActive ? '700' : '500',
                  color: isActive ? colors.primary : colors.textMuted,
                  paddingHorizontal: 4,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <Animated.View style={{
            position: 'absolute', bottom: 0, height: 2.5, borderRadius: 2,
            backgroundColor: colors.primary,
            transform: [{ translateX: indicatorX }],
            width: indicatorW,
          }} />
        </ScrollView>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      <CreateOrderModal visible={createVisible} onClose={() => setCreateVisible(false)} />
      <RejectionModal
        visible={rejectionOrderId !== null}
        orderId={rejectionOrderId ?? ''}
        onClose={() => setRejectionOrderId(null)}
      />
      </SafeAreaView>

      <BottomTabBar />
    </View>
  );
}

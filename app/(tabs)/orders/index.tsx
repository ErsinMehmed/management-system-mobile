import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Pusher from 'pusher-js';
import { colors, shadow } from '@/constants/theme';
import { useClientOrderStore } from '@/store/clientOrderStore';
import { useAuthStore } from '@/store/authStore';

import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';
import Toast from '@/components/Toast';
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
  { key: 'history', label: 'История',    icon: 'time-outline',      activeIcon: 'time',       roles: null },
  { key: 'stock',   label: 'Наличности', icon: 'cube-outline',      activeIcon: 'cube',       roles: null },
  { key: 'clients', label: 'Клиенти',    icon: 'people-outline',    activeIcon: 'people',     roles: ['Super Admin'] },
] as const;

type TabKey = typeof ALL_TABS[number]['key'];

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('orders');
  const [createVisible, setCreateVisible] = useState(false);
  const [rejectionOrderId, setRejectionOrderId] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { loadOrders, loadSummary, loadHistory, loadStock, loadClients } = useClientOrderStore();

  const tabScrollRef = useRef<ScrollView>(null);
  const tabWidths = useRef<Record<string, number>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const initDone = useRef(false);

  const isSuperAdmin = user?.role === 'Super Admin';
  const TABS = ALL_TABS.filter((t) => !t.roles || t.roles.includes(user?.role as any));

  useEffect(() => {
    loadOrders(1);
    loadSummary();
    loadHistory();
    loadStock();
    if (isSuperAdmin) loadClients(1, '', true);
  }, []);

  useEffect(() => {
    const pusher = new Pusher(process.env.EXPO_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.EXPO_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe('client-orders');
    channel.bind('order-event', () => {
      loadOrders(1);
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe('client-orders');
      pusher.disconnect();
    };
  }, []);

  const handleTabPress = (key: TabKey, index: number) => {
    setActiveTab(key);
    const x = TABS.slice(0, index).reduce((sum, t) => sum + (tabWidths.current[t.key] ?? 80) + 4, 0);
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
      <AppHeader title="Клиентски поръчки" icon="receipt" />

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
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, paddingVertical: 14, marginRight: 6 }}
              >
                <Ionicons
                  name={(isActive ? tab.activeIcon : tab.icon) as any}
                  size={17}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text style={{
                  fontSize: 15, fontWeight: isActive ? '700' : '600',
                  color: isActive ? colors.primary : colors.textMuted,
                  paddingHorizontal: 2,
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

      <CreateOrderModal visible={createVisible} onClose={() => setCreateVisible(false)} onSuccess={() => setToastVisible(true)} />
      <Toast visible={toastVisible} message="Поръчката е добавена успешно!" onHide={() => setToastVisible(false)} />
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

import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  Platform, Easing,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const TABS = [
  {
    key: 'dashboard',
    label: 'Табло',
    icon: 'home-outline'        as const,
    activeIcon: 'home'          as const,
    route: '/(tabs)/dashboard',
  },
  {
    key: 'orders',
    label: 'Клиентски',
    icon: 'receipt-outline'     as const,
    activeIcon: 'receipt'       as const,
    route: '/(tabs)/orders',
  },
  {
    key: 'regular-orders',
    label: 'Поръчки',
    icon: 'cart-outline'        as const,
    activeIcon: 'cart'          as const,
    route: '/(tabs)/regular-orders',
  },
  {
    key: 'products',
    label: 'Продукти',
    icon: 'cube-outline'        as const,
    activeIcon: 'cube'          as const,
    route: '/(tabs)/products',
  },
  {
    key: 'sales',
    label: 'Продажби',
    icon: 'trending-up-outline' as const,
    activeIcon: 'trending-up'   as const,
    route: '/(tabs)/sales',
  },
  {
    key: 'incomes',
    label: 'Приходи',
    icon: 'wallet-outline'      as const,
    activeIcon: 'wallet'        as const,
    route: '/(tabs)/incomes',
  },
] as const;

function TabItem({ tab, active }: { tab: typeof TABS[number]; active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const dot   = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(scale, { toValue: 1,    duration: 160, useNativeDriver: true, easing: Easing.out(Easing.back(2)) }),
      ]).start();
    }
    Animated.timing(dot, {
      toValue: active ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [active]);

  return (
    <TouchableOpacity
      onPress={() => router.push(tab.route as any)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <Ionicons
          name={active ? tab.activeIcon : tab.icon}
          size={23}
          color={active ? colors.primary : colors.textMuted}
        />
        <Text style={{
          fontSize: 10, fontWeight: active ? '700' : '500',
          color: active ? colors.primary : colors.textMuted,
          marginTop: 4,
        }}>
          {tab.label}
        </Text>
        {/* Active dot */}
        <Animated.View style={{
          position: 'absolute', top: -6,
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: colors.primary,
          opacity: dot,
          transform: [{ scaleX: dot }],
        }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function BottomTabBar() {
  const pathname      = usePathname();
  const insets        = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const isSeller      = useAuthStore((s) => s.user?.role === 'Seller');

  const isActive = (route: string) => {
    const clean = route.replace('/(tabs)', '');
    return pathname === clean || pathname.startsWith(clean + '/');
  };

  if (isSeller) return null;

  return (
    <View style={{
      backgroundColor: '#fff',
      paddingBottom,
      ...shadow.md,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    }}>
      <View style={{ height: 1, backgroundColor: colors.divider }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingHorizontal: 4 }}>
        {TABS.map((tab) => (
          <TabItem key={tab.key} tab={tab} active={isActive(tab.route)} />
        ))}
      </View>
    </View>
  );
}

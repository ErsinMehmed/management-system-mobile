import { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  Platform, Easing,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadow, gradients } from '@/constants/theme';

const TABS = [
  {
    key: 'orders',
    label: 'Клиентски',
    icon: 'receipt-outline'  as const,
    activeIcon: 'receipt'    as const,
    route: '/(tabs)/orders',
  },
  {
    key: 'products',
    label: 'Продукти',
    icon: 'cube-outline'     as const,
    activeIcon: 'cube'       as const,
    route: '/(tabs)/products',
  },
  // center placeholder — rendered separately
  {
    key: 'dashboard',
    label: 'Табло',
    icon: 'home-outline'     as const,
    activeIcon: 'home'       as const,
    route: '/(tabs)/dashboard',
    center: true,
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
    icon: 'cash-outline'     as const,
    activeIcon: 'cash'       as const,
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

function CenterButton({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 200, useNativeDriver: true, easing: Easing.out(Easing.back(2)) }),
      ]).start();
    }
  }, [active]);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/dashboard' as any)}
      style={{ alignItems: 'center', justifyContent: 'flex-start', width: 72 }}
      activeOpacity={0.8}
    >
      {/* Elevated circle — sits above the bar */}
      <Animated.View style={{
        marginTop: -28,
        transform: [{ scale }],
        ...shadow.lg,
        borderRadius: 28,
      }}>
        <LinearGradient
          colors={active ? gradients.primary : ['#E8EAFF', '#D4D7FF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{
            width: 56, height: 56, borderRadius: 28,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 3, borderColor: '#fff',
          }}
        >
          <Ionicons name="home" size={26} color={active ? '#fff' : colors.primary} />
        </LinearGradient>
      </Animated.View>
      <Text style={{
        fontSize: 10, fontWeight: active ? '800' : '600',
        color: active ? colors.primary : colors.textMuted,
        marginTop: 6,
      }}>
        Табло
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomTabBar() {
  const pathname  = usePathname();
  const insets    = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  const isActive = (route: string) => {
    const clean = route.replace('/(tabs)', '');
    return pathname === clean || pathname.startsWith(clean + '/');
  };

  const left  = TABS.filter((t) => !('center' in t && t.center)).slice(0, 2);
  const right = TABS.filter((t) => !('center' in t && t.center)).slice(2);
  const center = TABS.find((t) => 'center' in t && t.center)!;

  return (
    <View style={{
      backgroundColor: '#fff',
      paddingBottom,
      borderTopWidth: 0,
      ...shadow.md,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    }}>
      {/* Top border accent */}
      <View style={{ height: 1, backgroundColor: colors.divider }} />

      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingTop: 4,
        paddingHorizontal: 8,
      }}>
        {left.map((tab) => (
          <TabItem key={tab.key} tab={tab} active={isActive(tab.route)} />
        ))}

        <CenterButton active={isActive(center.route)} />

        {right.map((tab) => (
          <TabItem key={tab.key} tab={tab} active={isActive(tab.route)} />
        ))}
      </View>
    </View>
  );
}

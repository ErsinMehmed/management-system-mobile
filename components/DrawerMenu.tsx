import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated,
  useWindowDimensions, TouchableWithoutFeedback,
  Platform, Easing,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDrawer } from '@/contexts/DrawerContext';
import { useAuthStore } from '@/store/authStore';
import { colors, shadow } from '@/constants/theme';

// ─── Menu config ─────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  {
    key: 'dashboard',
    label: 'Табло',
    icon: 'grid-outline' as const,
    activeIcon: 'grid' as const,
    route: '/(tabs)/dashboard',
  },
  {
    key: 'regular-orders',
    label: 'Поръчки',
    icon: 'cart-outline' as const,
    activeIcon: 'cart' as const,
    route: '/(tabs)/regular-orders',
  },
  {
    key: 'products',
    label: 'Продукти',
    icon: 'cube-outline' as const,
    activeIcon: 'cube' as const,
    route: '/(tabs)/products',
  },
  {
    key: 'sales',
    label: 'Продажби',
    icon: 'trending-up-outline' as const,
    activeIcon: 'trending-up' as const,
    route: '/(tabs)/sales',
  },
  {
    key: 'incomes',
    label: 'Приходи',
    icon: 'cash-outline' as const,
    activeIcon: 'cash' as const,
    route: '/(tabs)/incomes',
  },
];

const DIVIDER_ITEM = {
  key: 'client-orders',
  label: 'Клиентски поръчки',
  icon: 'receipt-outline' as const,
  activeIcon: 'receipt' as const,
  route: '/(tabs)/orders',
  accent: true,
};

// ─── Hamburger button ─────────────────────────────────────────────────────────

export function HamburgerButton() {
  const { toggle, isOpen } = useDrawer();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isOpen ? 1 : 0,
      duration: 260,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const top = {
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 7] }) },
      { rotate:     anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
    ],
  };
  const mid = {
    opacity:   anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] }),
    transform: [{ scaleX: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 0] }) }],
  };
  const bot = {
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
      { rotate:     anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] }) },
    ],
  };

  const barStyle = {
    width: 22, height: 2.5, borderRadius: 2,
    backgroundColor: colors.textPrimary, marginVertical: 2.5,
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ padding: 6, justifyContent: 'center', alignItems: 'center' }}
    >
      <Animated.View style={[barStyle, top]} />
      <Animated.View style={[barStyle, mid]} />
      <Animated.View style={[barStyle, bot]} />
    </TouchableOpacity>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function DrawerMenu() {
  const { isOpen, close } = useDrawer();
  const { width: screenW } = useWindowDimensions();
  const drawerW = Math.min(screenW * 0.78, 320);

  const user = useAuthStore((s) => s.user);
  const { logout } = useAuthStore();
  const pathname = usePathname();

  const slideX  = useRef(new Animated.Value(-drawerW)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -drawerW,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  const navigate = (route: string) => {
    close();
    setTimeout(() => router.push(route as any), 260);
  };

  const isActive = (route: string) => pathname.startsWith(route.replace('/(tabs)', '').split('?')[0]);

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 999, pointerEvents: isOpen ? 'auto' : 'none' }}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={close}>
        <Animated.View style={{
          position: 'absolute', inset: 0,
          backgroundColor: 'rgba(28,28,46,0.55)',
          opacity,
        }} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: drawerW,
        backgroundColor: '#fff',
        transform: [{ translateX: slideX }],
        ...shadow.lg,
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 20,
      }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* ── Header ── */}
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ padding: 24, paddingTop: 28, paddingBottom: 28 }}
          >
            {/* Close button */}
            <TouchableOpacity
              onPress={close}
              style={{
                position: 'absolute', top: Platform.OS === 'ios' ? 56 : 20, right: 16,
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>

            {/* Avatar */}
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
            }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{initials}</Text>
            </View>

            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
              {user?.name ?? '—'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>
              {user?.email ?? ''}
            </Text>
            <View style={{
              marginTop: 10, alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{user?.role}</Text>
            </View>
          </LinearGradient>

          {/* ── Nav items ── */}
          <View style={{ flex: 1, paddingTop: 12, paddingHorizontal: 12 }}>
            {MENU_ITEMS.map((item, i) => {
              const active = isActive(item.route);
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => navigate(item.route)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 14, paddingVertical: 14,
                    borderRadius: 14, marginBottom: 4,
                    backgroundColor: active ? colors.primaryLight : 'transparent',
                  }}
                >
                  {/* Active strip */}
                  {active && (
                    <View style={{
                      position: 'absolute', left: 0, top: 10, bottom: 10,
                      width: 3.5, borderRadius: 2,
                      backgroundColor: colors.primary,
                    }} />
                  )}
                  <View style={{
                    width: 38, height: 38, borderRadius: 12,
                    backgroundColor: active ? `${colors.primary}20` : colors.bgInput,
                    alignItems: 'center', justifyContent: 'center',
                    marginRight: 14,
                  }}>
                    <Ionicons
                      name={active ? item.activeIcon : item.icon}
                      size={20}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text style={{
                    fontSize: 15, fontWeight: active ? '800' : '500',
                    color: active ? colors.primary : colors.textPrimary,
                    flex: 1,
                  }}>
                    {item.label}
                  </Text>
                  {active && (
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Divider */}
            <View style={{
              marginHorizontal: 4, marginVertical: 8,
              borderTopWidth: 1, borderTopColor: colors.divider,
            }} />

            {/* Клиентски поръчки */}
            {(() => {
              const item = DIVIDER_ITEM;
              const active = isActive(item.route);
              return (
                <TouchableOpacity
                  onPress={() => navigate(item.route)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 14, paddingVertical: 14,
                    borderRadius: 14, marginBottom: 4,
                    backgroundColor: active ? colors.primaryLight : 'transparent',
                  }}
                >
                  {active && (
                    <View style={{
                      position: 'absolute', left: 0, top: 10, bottom: 10,
                      width: 3.5, borderRadius: 2, backgroundColor: colors.primary,
                    }} />
                  )}
                  <View style={{
                    width: 38, height: 38, borderRadius: 12,
                    backgroundColor: active ? `${colors.primary}20` : `${colors.primary}12`,
                    alignItems: 'center', justifyContent: 'center', marginRight: 14,
                  }}>
                    <Ionicons
                      name={active ? item.activeIcon : item.icon}
                      size={20}
                      color={active ? colors.primary : colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 15, fontWeight: active ? '800' : '600',
                      color: active ? colors.primary : colors.primary,
                    }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                      Заявки от клиенти
                    </Text>
                  </View>
                  {active && <Ionicons name="chevron-forward" size={14} color={colors.primary} />}
                </TouchableOpacity>
              );
            })()}
          </View>

          {/* ── Footer / Logout ── */}
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, marginBottom: 8 }} />
            <TouchableOpacity
              onPress={() => { close(); logout(); }}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 14, paddingVertical: 13,
                borderRadius: 14,
                backgroundColor: colors.rejectedBg,
              }}
            >
              <View style={{
                width: 38, height: 38, borderRadius: 12,
                backgroundColor: `${colors.rejected}20`,
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
              }}>
                <Ionicons name="log-out-outline" size={20} color={colors.rejected} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.rejected }}>Изход</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

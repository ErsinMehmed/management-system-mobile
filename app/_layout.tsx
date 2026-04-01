import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { View, Text, Modal } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';

function NoInternetModal() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);

  return (
    <Modal visible={offline} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center', padding: 32,
      }}>
        <View style={{
          backgroundColor: '#fff', borderRadius: 24, padding: 32,
          alignItems: 'center', gap: 16, width: '100%',
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="wifi-outline" size={30} color="#DC2626" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1C1C2E', textAlign: 'center' }}>
            Няма интернет връзка
          </Text>
          <Text style={{ fontSize: 14, color: '#A0A0C0', textAlign: 'center', lineHeight: 21 }}>
            Провери Wi-Fi или мобилните данни и опитай отново.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function AuthGuard({ pendingOrderId }: { pendingOrderId: React.MutableRefObject<string | null> }) {
  const { token, user, isInitialized } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuth = segments[0] === '(auth)';

    if (!token && !inAuth) {
      router.replace('/(auth)/login');
    } else if (token && inAuth) {
      const isSeller = user?.role === 'Seller';
      router.replace(isSeller ? '/(tabs)/orders' : '/(tabs)/dashboard');
    } else if (token && !inAuth && pendingOrderId.current) {
      const orderId = pendingOrderId.current;
      pendingOrderId.current = null;
      setTimeout(() => {
        router.push({ pathname: '/(tabs)/orders/[id]', params: { id: orderId } } as any);
      }, 300);
    }
  }, [token, isInitialized, segments]);

  return null;
}

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const pendingOrderId = useRef<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    // При студен старт от нотификация
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const orderId = response?.notification.request.content.data?.orderId;
      if (orderId) pendingOrderId.current = orderId;
    });

    // При тап докато приложението работи
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId;
      if (orderId) {
        router.push({ pathname: '/(tabs)/orders/[id]', params: { id: orderId } } as any);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AuthGuard pendingOrderId={pendingOrderId} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <NoInternetModal />
    </>
  );
}

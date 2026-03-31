import '../global.css';
import { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/authStore';

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
    </>
  );
}

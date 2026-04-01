import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { colors, shadow } from '@/constants/theme';
import NotificationsDrawer from './NotificationsDrawer';
import api from '@/services/api';

interface Props {
  title: string;
  icon?: string;
  right?: React.ReactNode;
}

export default function AppHeader({ title, icon = 'home', right }: Props) {
  const user = useAuthStore((s) => s.user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  useEffect(() => {
    if (!user) return;
    api.get<{ unreadCount: number }>('/api/notifications?page=1')
      .then((res) => setUnread(res.data.unreadCount ?? 0))
      .catch(() => {});
  }, [user]);

  return (
    <View style={{
      backgroundColor: '#fff',
      paddingHorizontal: 20,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...shadow.sm,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    }}>
      {/* Logo box */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={icon as any} size={18} color="#fff" />
      </LinearGradient>

      <Text style={{
        flex: 1, fontSize: 20, fontWeight: '800',
        color: colors.textPrimary, letterSpacing: -0.5,
      }}>
        {title}
      </Text>

      {right}

      {/* Bell */}
      <TouchableOpacity
        onPress={() => setDrawerOpen(true)}
        activeOpacity={0.75}
        style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
        {unread > 0 && (
          <View style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            backgroundColor: '#EF4444',
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 3,
            borderWidth: 1.5, borderColor: '#fff',
          }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Avatar */}
      <TouchableOpacity onPress={() => router.push('/(tabs)/account' as any)} activeOpacity={0.8}>
        {user?.profile_image ? (
          <Image
            source={{ uri: user.profile_image }}
            style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: colors.primary + '30' }}
          />
        ) : (
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{initials}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      <NotificationsDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userId={user?._id ?? user?.id ?? ''}
        onUnreadChange={setUnread}
      />
    </View>
  );
}

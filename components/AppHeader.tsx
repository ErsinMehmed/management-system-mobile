import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { colors, shadow } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, right }: Props) {
  const user = useAuthStore((s) => s.user);

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <View style={{
      backgroundColor: '#fff',
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...shadow.sm,
    }}>
      {/* Profile avatar */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/account' as any)}
        activeOpacity={0.75}
      >
        {user?.profile_image ? (
          <Image
            source={{ uri: user.profile_image }}
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.primaryLight }}
          />
        ) : (
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.primaryLight,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: `${colors.primary}30`,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>{initials}</Text>
          </View>
        )}
        {/* Online dot */}
        <View style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 11, height: 11, borderRadius: 6,
          backgroundColor: colors.delivered,
          borderWidth: 2, borderColor: '#fff',
        }} />
      </TouchableOpacity>

      {/* Title */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 19, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>{subtitle}</Text>
        )}
      </View>

      {right}
    </View>
  );
}

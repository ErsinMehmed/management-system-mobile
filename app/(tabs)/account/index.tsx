import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { colors, shadow, gradients } from '@/constants/theme';
import BottomTabBar from '@/components/BottomTabBar';

const ROLE_COLORS: Record<string, string> = {
  'Super Admin': colors.rejected,
  'Admin': colors.primary,
  'Seller': colors.delivered,
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 16,
      borderBottomWidth: 1, borderBottomColor: colors.divider,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 14,
      }}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 2, letterSpacing: 0.4 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function AccountScreen() {
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? colors.primary;

  const handleLogout = () => {
    Alert.alert('Изход', 'Сигурен ли си, че искаш да излезеш?', [
      { text: 'Отмени', style: 'cancel' },
      { text: 'Изход', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{
          backgroundColor: '#fff', paddingHorizontal: 16,
          paddingTop: 10, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center',
          ...shadow.sm,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bgInput, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.textPrimary, flex: 1 }}>Акаунт</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {/* Hero card */}
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 24, padding: 24, alignItems: 'center', ...shadow.lg }}
          >
            {/* Avatar */}
            {user?.profile_image ? (
              <Image
                source={{ uri: user.profile_image }}
                style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: 'rgba(255,255,255,0.5)', marginBottom: 16 }}
              />
            ) : (
              <View style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)',
                marginBottom: 16,
              }}>
                <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }}>{initials}</Text>
              </View>
            )}

            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>
              {user?.name ?? '—'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {user?.email ?? ''}
            </Text>

            <View style={{
              marginTop: 14, backgroundColor: 'rgba(255,255,255,0.22)',
              borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
            }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 }}>
                {user?.role}
              </Text>
            </View>
          </LinearGradient>

          {/* Info card */}
          <View style={{
            marginHorizontal: 16, marginTop: 20,
            backgroundColor: '#fff', borderRadius: 20,
            overflow: 'hidden', ...shadow.sm,
          }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 }}>
                ИНФОРМАЦИЯ ЗА ПРОФИЛА
              </Text>
            </View>
            <InfoRow icon="person-outline"     label="ИМЕ"     value={user?.name  ?? '—'} />
            <InfoRow icon="mail-outline"        label="ИМЕЙЛ"   value={user?.email ?? '—'} />
            <InfoRow icon="shield-checkmark-outline" label="РОЛЯ" value={user?.role ?? '—'} />
          </View>

          {/* Logout */}
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={{ marginHorizontal: 16, marginTop: 20 }}
          >
            <View style={{
              backgroundColor: colors.rejectedBg,
              borderRadius: 18, padding: 18,
              flexDirection: 'row', alignItems: 'center', gap: 14,
              borderWidth: 1, borderColor: `${colors.rejected}20`,
            }}>
              <View style={{
                width: 42, height: 42, borderRadius: 12,
                backgroundColor: `${colors.rejected}15`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="log-out-outline" size={22} color={colors.rejected} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.rejected }}>Изход от акаунта</Text>
                <Text style={{ fontSize: 12, color: `${colors.rejected}80`, marginTop: 2 }}>Ще трябва да влезеш отново</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.rejected} />
            </View>
          </TouchableOpacity>

          {/* App version */}
          <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 28 }}>
            Management System v1.0
          </Text>
        </ScrollView>
      </SafeAreaView>

      <BottomTabBar />
    </View>
  );
}

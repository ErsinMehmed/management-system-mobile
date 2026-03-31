import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadow, gradients } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import BottomTabBar from '@/components/BottomTabBar';

interface Props {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description?: string;
}

export default function PlaceholderScreen({ title, icon, description }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <AppHeader title={title} />

        {/* Content */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              width: 88, height: 88, borderRadius: 28,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, ...shadow.lg,
            }}
          >
            <Ionicons name={icon} size={40} color="#fff" />
          </LinearGradient>

          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 10, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
            {description ?? 'Тази страница е в процес на разработка.'}
          </Text>

          <View style={{
            marginTop: 32, backgroundColor: '#fff', borderRadius: 16,
            paddingHorizontal: 20, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center', gap: 10,
            ...shadow.sm,
          }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
              Очаквайте скоро
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <BottomTabBar />
    </View>
  );
}

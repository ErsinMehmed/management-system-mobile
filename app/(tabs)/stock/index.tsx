import { View, Text, StatusBar } from 'react-native';
import { colors } from '@/constants/theme';

export default function StockScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgCard} />
      <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>Наличности</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Предстои</Text>
    </View>
  );
}

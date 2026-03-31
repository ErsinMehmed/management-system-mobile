import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, StatusBar,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { colors, gradients, shadow } from '@/constants/theme';
import { useState } from 'react';

interface LoginForm { email: string; password: string }

export default function LoginScreen() {
  const { login, isLoading } = useAuthStore();
  const [showPass, setShowPass] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }: LoginForm) => {
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Грешка при вход', err?.response?.data?.message ?? 'Грешен имейл или парола.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6FA' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />

      {/* Top decoration */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 280,
        backgroundColor: colors.primary, borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
        opacity: 0.06,
      }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 44 }}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{
                width: 72, height: 72, borderRadius: 22,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, ...shadow.lg,
              }}
            >
              <Text style={{ fontSize: 32 }}>📦</Text>
            </LinearGradient>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 }}>
              Добре дошъл
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 6 }}>
              Влез в своя акаунт
            </Text>
          </View>

          {/* Card */}
          <View style={{
            backgroundColor: '#fff', borderRadius: 24, padding: 24, gap: 16,
            ...shadow.md,
          }}>
            {/* Email */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>
                ИМЕЙЛ
              </Text>
              <Controller
                control={control}
                name="email"
                rules={{ required: true, pattern: { value: /\S+@\S+\.\S+/, message: 'Невалиден имейл' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: colors.bgInput, borderRadius: 14,
                    paddingHorizontal: 14, paddingVertical: 12,
                    borderWidth: 1.5,
                    borderColor: errors.email ? colors.rejected : 'transparent',
                  }}>
                    <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={{ fontSize: 12, color: colors.rejected }}>{errors.email.message ?? 'Задължително'}</Text>}
            </View>

            {/* Password */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 }}>
                ПАРОЛА
              </Text>
              <Controller
                control={control}
                name="password"
                rules={{ required: true, minLength: { value: 6, message: 'Минимум 6 символа' } }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: colors.bgInput, borderRadius: 14,
                    paddingHorizontal: 14, paddingVertical: 12,
                    borderWidth: 1.5,
                    borderColor: errors.password ? colors.rejected : 'transparent',
                  }}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
                    <TextInput
                      style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showPass}
                      returnKeyType="done"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                    <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={{ padding: 2 }}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && <Text style={{ fontSize: 12, color: colors.rejected }}>{errors.password.message ?? 'Задължително'}</Text>}
            </View>

            {/* Button */}
            <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={isLoading} activeOpacity={0.85} style={{ marginTop: 4 }}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 14, paddingVertical: 16,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: isLoading ? 0.7 : 1,
                  ...shadow.lg,
                }}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 }}>Влез</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

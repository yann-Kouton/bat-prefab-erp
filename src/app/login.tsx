import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authErrorMessage, useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { Button, Field } from '@/components/ui';
import { COMPANY } from '@/lib/constants';
import { notify } from '@/lib/dialogs';
import { colors, font, radius, spacing } from '@/theme';

export default function LoginScreen() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Saisissez votre email et votre mot de passe.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError("Saisissez d'abord votre email, puis touchez « Mot de passe oublié ».");
      return;
    }
    try {
      await resetPassword(email);
      notify('Email envoyé', `Un lien de réinitialisation a été envoyé à ${email.trim()}.`);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.brand}>
              <Logo width={240} />
              <Text style={styles.title}>{COMPANY.appSubtitle}</Text>
              <View style={styles.rule} />
            </View>

            <View style={styles.form}>
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
              <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="password" onSubmitEditing={submit} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button label="Se connecter" onPress={submit} loading={loading} />
              <Pressable onPress={forgot} accessibilityRole="button" style={styles.forgot}>
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...font.display, color: colors.brand, marginTop: spacing.lg, textAlign: 'center' },
  rule: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: spacing.md },
  form: { backgroundColor: colors.canvas, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  error: { ...font.small, color: colors.danger, marginBottom: spacing.md },
  forgot: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  forgotText: { ...font.small, fontWeight: '600', color: colors.brand },
});

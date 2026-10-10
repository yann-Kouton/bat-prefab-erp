import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui';
import { colors, font, spacing } from '@/theme';

function Gate() {
  const { user, profile, loading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login';
  const blocked = !loading && !!user && !profile?.active;

  useEffect(() => {
    if (loading) return;
    if (!user && !onLogin) router.replace('/login');
    else if (user && profile?.active && onLogin) router.replace('/');
  }, [loading, user, profile, onLogin, router]);

  return (
    <>
      {/* Écrans blancs (connexion, chargement) : icônes sombres ; sinon en-tête bleu : icônes claires */}
      <StatusBar style={loading || blocked || onLogin ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }} />
      {loading ? (
        <View style={styles.overlay}>
          <Logo width={240} />
          <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
        </View>
      ) : blocked ? (
        <View style={styles.overlay}>
          <Logo width={200} />
          <Text style={styles.blockedTitle}>Compte en attente d'activation</Text>
          <Text style={styles.blockedText}>
            {profile ? 'Votre compte a été désactivé.' : "Votre profil n'est pas encore configuré."} Contactez un administrateur de BAT & PREFAB.
          </Text>
          <Button label="Se déconnecter" onPress={signOut} style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  blockedTitle: { ...font.display, color: colors.text, marginTop: spacing.xl, textAlign: 'center' },
  blockedText: { ...font.body, color: colors.muted, marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
});

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui';
import { colors, font, spacing } from '@/theme';

function Gate() {
  const { user, profile, loading, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const onLogin = segments[0] === 'login';

  useEffect(() => {
    if (loading) return;
    if (!user && !onLogin) router.replace('/login');
    else if (user && profile?.active && onLogin) router.replace('/');
  }, [loading, user, profile, onLogin, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {loading ? (
        <View style={styles.overlay}>
          <BrandMark size={72} />
          <ActivityIndicator color={colors.machine} style={{ marginTop: spacing.xl }} />
        </View>
      ) : user && !profile?.active ? (
        <View style={styles.overlay}>
          <BrandMark size={72} />
          <Text style={styles.blockedTitle}>Compte en attente d'activation</Text>
          <Text style={styles.blockedText}>
            {profile ? 'Votre compte a été désactivé.' : "Votre profil n'est pas encore configuré."} Contactez un administrateur de BAT & PREFAB.
          </Text>
          <Button label="Se déconnecter" variant="accent" onPress={signOut} style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Gate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.steel, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  blockedTitle: { ...font.title, color: '#FFFFFF', marginTop: spacing.xl, textAlign: 'center' },
  blockedText: { ...font.body, color: '#B8C4CE', marginTop: spacing.sm, textAlign: 'center', lineHeight: 22 },
});

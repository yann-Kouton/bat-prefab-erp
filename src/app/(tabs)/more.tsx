import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, InfoRow, Screen } from '@/components/ui';
import { COMPANY, COUNTRIES, ROLE_LABELS } from '@/lib/constants';
import { initials } from '@/lib/format';
import { colors, font, spacing } from '@/theme';

export default function MoreTab() {
  const { profile, user, signOut, can } = useAuth();
  return (
    <Screen title="Plus">
      <Card>
        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile?.displayName ?? user?.email ?? '?')}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{profile?.displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Badge label={profile ? ROLE_LABELS[profile.role] : '—'} tone="info" />
        </View>
        <InfoRow label="Pays" value={profile ? COUNTRIES[profile.country]?.label : undefined} />
      </Card>

      {can('users.manage') ? (
        <Button label="Gérer les utilisateurs" icon="shield-checkmark-outline" variant="secondary" onPress={() => router.push('/users')} style={{ marginBottom: spacing.md }} />
      ) : null}
      <Button label="Se déconnecter" icon="log-out-outline" variant="secondary" onPress={signOut} />

      <Text style={styles.footer}>
        {COMPANY.name} ERP · version {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.machine, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800', color: colors.steel },
  name: { ...font.heading, color: colors.text },
  email: { ...font.small, color: colors.muted, marginTop: 2 },
  footer: { ...font.small, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
});

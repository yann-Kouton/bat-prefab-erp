import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, IconName, InfoRow, Screen, SectionTitle } from '@/components/ui';
import { COMPANY, COUNTRIES, ROLE_LABELS } from '@/lib/constants';
import { initials } from '@/lib/format';
import { colors, font, spacing } from '@/theme';

const MODULES: { label: string; hint: string; icon: IconName; href: string; permission: Parameters<ReturnType<typeof useAuth>['can']>[0] }[] = [
  { label: 'Factures et paiements', hint: 'Acomptes, situations, encaissements', icon: 'cash-outline', href: '/invoices', permission: 'invoices.read' },
  { label: 'Stock', hint: 'Matériaux, entrées, sorties, alertes', icon: 'cube-outline', href: '/stock', permission: 'stock.read' },
  { label: 'Achats', hint: 'Bons de commande et réceptions', icon: 'cart-outline', href: '/purchases', permission: 'purchases.read' },
  { label: 'Fournisseurs', hint: 'Annuaire et conditions', icon: 'business-outline', href: '/suppliers', permission: 'purchases.read' },
];

function Modules() {
  const { can } = useAuth();
  const visible = MODULES.filter((m) => can(m.permission));
  if (visible.length === 0) return null;
  return (
    <View>
      <SectionTitle>Modules</SectionTitle>
      {visible.map((m) => (
        <Card key={m.href} onPress={() => router.push(m.href as never)}>
          <View style={styles.module}>
            <View style={styles.moduleIcon}><Ionicons name={m.icon} size={20} color={colors.brand} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.moduleLabel}>{m.label}</Text>
              <Text style={styles.moduleHint}>{m.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </Card>
      ))}
    </View>
  );
}

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

      <Modules />

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
  module: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  moduleIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  moduleLabel: { ...font.body, fontWeight: '700', color: colors.text },
  moduleHint: { ...font.small, color: colors.muted, marginTop: 2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800', color: colors.brand },
  name: { ...font.heading, color: colors.text },
  email: { ...font.small, color: colors.muted, marginTop: 2 },
  footer: { ...font.small, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
});

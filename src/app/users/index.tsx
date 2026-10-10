import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Card, Chips, EmptyState, Fab, Loading, Screen } from '@/components/ui';
import { COUNTRIES, ROLE_LABELS, ROLE_OPTIONS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { updateDocument, useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Role, UserProfile } from '@/types';

export default function UsersScreen() {
  const { can, user } = useAuth();
  const allowed = can('users.manage');
  const { data: users, loading } = useCollection<UserProfile>('users', { enabled: allowed, orderField: null });

  if (!allowed) {
    return (
      <Screen title="Utilisateurs" back>
        <EmptyState icon="lock-closed-outline" title="Accès réservé" text="Seuls les administrateurs peuvent gérer les utilisateurs." />
      </Screen>
    );
  }

  const sorted = [...users].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));

  async function toggle(u: UserProfile & { id: string }, active: boolean) {
    try {
      await updateDocument('users', u.id, { active });
    } catch (e) {
      notify('Mise à jour impossible', errorMessage(e));
    }
  }

  function changeRole(u: UserProfile & { id: string }, role: Role) {
    if (role === u.role) return;
    confirmAction('Changer le rôle ?', `${u.displayName} passera de « ${ROLE_LABELS[u.role]} » à « ${ROLE_LABELS[role]} ». Ses droits changent immédiatement.`, 'Confirmer', async () => {
      try { await updateDocument('users', u.id, { role }); } catch (e) { notify('Mise à jour impossible', errorMessage(e)); }
    });
  }

  return (
    <Screen title="Utilisateurs" subtitle={`${users.length} compte${users.length > 1 ? 's' : ''}`} back scroll={false} padded={false}>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
                  <Text style={styles.sub} numberOfLines={1}>{item.email}</Text>
                </View>
                <Switch
                  value={item.active}
                  disabled={item.id === user?.uid}
                  onValueChange={(v) => toggle(item, v)}
                  trackColor={{ true: colors.brand, false: colors.border }}
                  accessibilityLabel={`Compte actif : ${item.displayName}`}
                />
              </View>
              <View style={[styles.row, { marginTop: spacing.sm, justifyContent: 'flex-start' }]}>
                <Badge label={ROLE_LABELS[item.role]} tone="info" />
                <Text style={styles.sub}>{COUNTRIES[item.country]?.label}</Text>
                {!item.active ? <Badge label="Désactivé" tone="danger" /> : null}
              </View>
              {item.id !== user?.uid ? (
                <View style={{ marginTop: spacing.md }}>
                  <Chips<Role> scroll options={ROLE_OPTIONS} value={item.role} onChange={(r) => changeRole(item, r)} />
                </View>
              ) : null}
            </Card>
          )}
        />
      )}
      <Fab label="Nouvel utilisateur" icon="person-add-outline" onPress={() => router.push('/users/new')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { ...font.body, fontWeight: '700', color: colors.text },
  sub: { ...font.small, color: colors.muted, marginTop: 2 },
});

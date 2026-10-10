import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Card, EmptyState, IconName, Screen, SectionTitle } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { PROJECT_STATUS_LABELS, QUOTE_STATUS_LABELS, ROLE_LABELS } from '@/lib/constants';
import { formatDate, formatMoney, toDate } from '@/lib/format';
import { PROJECT_TONES, QUOTE_TONES } from '@/lib/tones';
import { useCollection } from '@/services/firestore';
import { colors, font, radius, spacing } from '@/theme';
import { payState, remaining } from '@/services/billing';
import { isLow } from '@/features/stock/utils';
import type { Client, Invoice, Product, Project, Quote } from '@/types';

function greeting() {
  const h = new Date().getHours();
  return h < 18 ? 'Bonjour' : 'Bonsoir';
}

export default function Dashboard() {
  const { profile, can } = useAuth();
  const canQuotes = can('quotes.read');
  const { data: quotes } = useCollection<Quote>('quotes', { enabled: canQuotes });
  const { data: projects } = useCollection<Project>('projects');
  const { data: clients } = useCollection<Client>('clients');
  const canInvoices = can('invoices.read');
  const canStock = can('stock.read');
  const { data: invoices } = useCollection<Invoice>('invoices', { enabled: canInvoices });
  const { data: products } = useCollection<Product>('products', { enabled: canStock, orderField: null });

  const stats = useMemo(() => {
    const now = new Date();
    const pending = quotes.filter((q) => q.status === 'envoye');
    const acceptedThisMonth = quotes.filter((q) => {
      const d = toDate(q.statusChangedAt ?? q.updatedAt);
      return q.status === 'accepte' && d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const running = projects.filter((p) => p.status === 'en_cours');
    const open = invoices.filter((i) => ['a_payer', 'partielle', 'en_retard'].includes(payState(i)));
    const late = invoices.filter((i) => payState(i) === 'en_retard');
    return {
      outstanding: open.reduce((s, i) => s + remaining(i), 0),
      lateCount: late.length,
      lateAmount: late.reduce((s, i) => s + remaining(i), 0),
      lowStock: products.filter(isLow).length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, q) => s + q.totalTTC, 0),
      acceptedAmount: acceptedThisMonth.reduce((s, q) => s + q.totalTTC, 0),
      acceptedCount: acceptedThisMonth.length,
      runningCount: running.length,
      runningBudget: running.reduce((s, p) => s + p.budget, 0),
      clientCount: clients.filter((c) => c.status === 'client').length,
      prospectCount: clients.filter((c) => c.status === 'prospect').length,
    };
  }, [quotes, projects, clients, invoices, products]);

  const firstName = profile?.displayName?.split(' ')[0] ?? '';
  const recentQuotes = quotes.slice(0, 3);
  const runningProjects = projects.filter((p) => p.status === 'en_cours').slice(0, 3);

  return (
    <Screen title={`${greeting()}${firstName ? ', ' + firstName : ''}`} subtitle={profile ? ROLE_LABELS[profile.role] : undefined}>
      <View style={styles.grid}>
        {canQuotes ? (
          <>
            <Stat icon="paper-plane-outline" label="Devis en attente" value={String(stats.pendingCount)} detail={formatMoney(stats.pendingAmount)} />
            <Stat icon="checkmark-done-outline" label="Acceptés ce mois" value={String(stats.acceptedCount)} detail={formatMoney(stats.acceptedAmount)} />
          </>
        ) : null}
        {canInvoices ? (
          <Stat icon="cash-outline" label="À encaisser" value={formatMoney(stats.outstanding).replace(' FCFA', '')} detail={stats.lateCount > 0 ? `${stats.lateCount} en retard · ${formatMoney(stats.lateAmount)}` : 'Aucun retard'} />
        ) : null}
        {canStock ? (
          <Stat icon="cube-outline" label="Stock bas" value={String(stats.lowStock)} detail={stats.lowStock > 0 ? 'article(s) à réapprovisionner' : 'Tout est au-dessus du seuil'} />
        ) : null}
        <Stat icon="construct-outline" label="Projets en cours" value={String(stats.runningCount)} detail={canQuotes ? formatMoney(stats.runningBudget) : undefined} />
        <Stat icon="people-outline" label="Clients" value={String(stats.clientCount)} detail={`${stats.prospectCount} prospect${stats.prospectCount > 1 ? 's' : ''}`} />
      </View>

      {canQuotes ? (
        <>
          <SectionTitle>Devis récents</SectionTitle>
          {recentQuotes.length === 0 ? (
            <Card><EmptyState icon="document-text-outline" title="Aucun devis pour l'instant" text="Créez votre premier devis depuis l'onglet Devis." /></Card>
          ) : (
            recentQuotes.map((q) => (
              <Card key={q.id} onPress={() => router.push(`/quotes/${q.id}`)}>
                <View style={styles.rowBetween}>
                  <Text style={styles.strong}>{q.number}</Text>
                  <Badge label={QUOTE_STATUS_LABELS[q.status]} tone={QUOTE_TONES[q.status]} />
                </View>
                <Text style={styles.sub} numberOfLines={1}>{q.clientName} · {q.projectTitle}</Text>
                <Text style={styles.amount}>{formatMoney(q.totalTTC)}</Text>
              </Card>
            ))
          )}
        </>
      ) : null}

      <SectionTitle>Chantiers en cours</SectionTitle>
      {runningProjects.length === 0 ? (
        <Card><EmptyState icon="construct-outline" title="Aucun chantier en cours" text="Les projets au statut « En cours » apparaissent ici." /></Card>
      ) : (
        runningProjects.map((p) => (
          <Card key={p.id} onPress={() => router.push(`/projects/${p.id}`)}>
            <View style={styles.rowBetween}>
              <Text style={styles.strong}>{p.code}</Text>
              <Badge label={PROJECT_STATUS_LABELS[p.status]} tone={PROJECT_TONES[p.status]} />
            </View>
            <Text style={styles.sub} numberOfLines={1}>{p.title}</Text>
            <Text style={styles.sub}>{p.clientName} · {p.progress}% · depuis le {formatDate(p.startDate)}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

function Stat({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail?: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIcon}><Ionicons name={icon} size={18} color={colors.brand} /></View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail ? <Text style={styles.statDetail} numberOfLines={1}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  statIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  statLabel: { ...font.small, color: colors.muted, marginTop: 2 },
  statDetail: { ...font.small, fontWeight: '600', color: colors.text, marginTop: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  strong: { ...font.body, fontWeight: '700', color: colors.text },
  sub: { ...font.small, color: colors.muted, marginTop: 4 },
  amount: { ...font.body, fontWeight: '700', color: colors.text, marginTop: 8 },
});

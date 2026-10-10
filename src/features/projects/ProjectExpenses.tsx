import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { BudgetBar } from '@/components/charts';
import { Badge, Button, Card, SectionTitle } from '@/components/ui';
import { summarize } from '@/lib/finance';
import { formatMoney } from '@/lib/format';
import { useCollection } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Cashflow, Expense, Project } from '@/types';

/** Résumé budget / dépenses sur la fiche chantier ; le détail est dans le tableau de bord financier. */
export function ProjectExpenses({ project }: { project: Project }) {
  const { can } = useAuth();
  const canRead = can('expenses.read');
  const { data: expenses } = useCollection<Expense>(`projects/${project.id}/expenses`, { enabled: canRead, orderField: 'date' });
  const { data: flows } = useCollection<Cashflow>(`projects/${project.id}/cashflows`, { enabled: canRead, orderField: 'date' });
  if (!canRead) return null;

  const s = summarize(project, expenses, flows);
  const over = s.budget > 0 && s.spent > s.budget;
  const drift = s.budget > 0 && !over && s.consumption - s.progress > 15;

  return (
    <View>
      <SectionTitle>Budget et finances</SectionTitle>
      <Card>
        <View style={styles.row}>
          <View>
            <Text style={styles.small}>Dépensé</Text>
            <Text style={[styles.big, over && { color: colors.danger }]}>{formatMoney(s.spent)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.small}>Budget prévu</Text>
            <Text style={styles.mid}>{formatMoney(s.budget)}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md }}><BudgetBar spent={s.spent} budget={s.budget} progress={s.progress} /></View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.small}>{s.budget > 0 ? `${Math.round(s.consumption)} % consommé · ${s.progress} % réalisé` : 'Budget non renseigné'}</Text>
          {over ? <Badge label="Dépassement" tone="danger" /> : drift ? <Badge label="À surveiller" tone="warning" /> : null}
        </View>
        <View style={[styles.row, { marginTop: spacing.md }]}>
          <Text style={styles.small}>Reste à payer : {formatMoney(s.due)}</Text>
          <Text style={styles.small}>Trésorerie : {formatMoney(s.treasury)}</Text>
        </View>
      </Card>
      <Button label="Tableau de bord financier" icon="stats-chart-outline" onPress={() => router.push(`/projects/${project.id}/finance`)} style={{ marginBottom: spacing.sm }} />
      {can('expenses.write') ? (
        <Button label="Ajouter une dépense" icon="add" variant="secondary" onPress={() => router.push(`/projects/${project.id}/expenses/new`)} style={{ marginBottom: spacing.md }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  small: { ...font.small, color: colors.muted },
  big: { fontSize: 24, fontWeight: '800', color: colors.text },
  mid: { ...font.heading, color: colors.text },
});

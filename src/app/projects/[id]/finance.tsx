import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { BudgetBar, Donut, MonthBars } from '@/components/charts';
import { Badge, Button, Card, Chips, EmptyState, Loading, Screen, SectionTitle } from '@/components/ui';
import { EXPENSE_LABELS, PAYMENT_LABELS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import {
  byCategory, byMonth, bySupplier, CATEGORY_COLORS, inPeriod, isIncomplete, lacksArticlePhotos, lacksInvoice, monthLabel,
  payStateOf, PERIOD_OPTIONS, summarize, dueOf, type Period,
} from '@/lib/finance';
import { formatDate, formatMoney } from '@/lib/format';
import { deleteCashflow } from '@/services/finance';
import { useCollection, useDocument } from '@/services/firestore';
import { colors, font, radius, spacing } from '@/theme';
import type { Cashflow, Expense, ExpenseCategory, Project } from '@/types';

type Quick = 'a_payer' | 'incomplet' | null;
type Tab = 'depenses' | 'tresorerie';
type Tone = 'neutral' | 'good' | 'warn' | 'bad';

const PAGE = 25;
const toneColor: Record<Tone, string> = { neutral: colors.text, good: colors.success, warn: colors.warningText, bad: colors.danger };

export default function ProjectFinance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const canRead = can('expenses.read');
  const { data: project, loading } = useDocument<Project>('projects', id);
  const { data: expenses } = useCollection<Expense>(`projects/${id}/expenses`, { enabled: canRead, orderField: 'date' });
  const { data: flows } = useCollection<Cashflow>(`projects/${id}/cashflows`, { enabled: canRead, orderField: 'date' });

  const [period, setPeriod] = useState<Period>('all');
  const [tab, setTab] = useState<Tab>('depenses');
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [quick, setQuick] = useState<Quick>(null);
  const [visible, setVisible] = useState(PAGE);

  const summary = useMemo(() => (project ? summarize(project, expenses, flows) : null), [project, expenses, flows]);
  const inRange = useMemo(() => expenses.filter((e) => inPeriod(e.date, period)), [expenses, period]);
  const cats = useMemo(() => byCategory(inRange), [inRange]);
  const suppliers = useMemo(() => bySupplier(inRange), [inRange]);
  const months = useMemo(() => byMonth(expenses, flows), [expenses, flows]);

  const listExpenses = useMemo(() => inRange.filter((e) =>
    (!category || e.category === category) && (!month || e.date.startsWith(month))
    && (quick === null || (quick === 'a_payer' ? dueOf(e) > 0 : isIncomplete(e)))), [inRange, category, month, quick]);
  const listFlows = useMemo(() => flows.filter((f) => inPeriod(f.date, period) && (!month || f.date.startsWith(month))), [flows, period, month]);

  if (loading) return <Screen title="Finances" back><Loading /></Screen>;
  if (!project || !summary || !canRead) {
    return (
      <Screen title="Finances" back>
        <EmptyState icon="lock-closed-outline" title="Accès limité" text="Ce chantier est introuvable ou votre rôle ne donne pas accès aux finances." />
      </Screen>
    );
  }

  const s = summary;
  const alerts: string[] = [];
  if (s.budget > 0 && s.spent > s.budget) alerts.push(`Budget dépassé de ${formatMoney(s.spent - s.budget)}.`);
  else if (s.budget > 0 && s.consumption - s.progress > 15) alerts.push(`${Math.round(s.consumption)} % du budget consommé pour ${s.progress} % d'avancement.`);
  if (s.forecastGap !== null && s.forecastGap < 0 && s.spent <= s.budget) alerts.push(`Au rythme actuel, le chantier coûtera ${formatMoney(-s.forecastGap)} de plus que prévu.`);
  if (s.due > 0 && s.treasury < s.due) alerts.push(`Trésorerie (${formatMoney(s.treasury)}) inférieure au reste à payer (${formatMoney(s.due)}).`);
  if (s.incomplete > 0) alerts.push(`${s.incomplete} dépense(s) sans justificatif complet.`);

  const filtersOn = !!category || !!month || quick !== null;
  const resetFilters = () => { setCategory(null); setMonth(null); setQuick(null); setVisible(PAGE); };
  const toggleQuick = (q: Exclude<Quick, null>) => { setTab('depenses'); setQuick(quick === q ? null : q); setVisible(PAGE); };

  const canWrite = can('expenses.write');
  const canIncome = can('finance.income');

  function removeFlow(f: Cashflow) {
    confirmAction('Supprimer ce mouvement ?', `${f.label} · ${formatMoney(f.amount)}`, 'Supprimer', async () => {
      try { await deleteCashflow(id, f); } catch (e) { notify('Suppression impossible', errorMessage(e)); }
    });
  }

  return (
    <Screen
      title="Finances du chantier" subtitle={`${project.code} · ${project.title}`} back
      footer={canWrite || canIncome ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {canWrite ? <Button label="Dépense" icon="add" style={{ flex: 1 }} onPress={() => router.push(`/projects/${id}/expenses/new`)} /> : null}
          {canWrite ? <Button label="Décaisser" icon="arrow-up" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/projects/${id}/cashflows/new?type=decaissement`)} /> : null}
          {canIncome ? <Button label="Entrée" icon="arrow-down" variant="accent" style={{ flex: 1 }} onPress={() => router.push(`/projects/${id}/cashflows/new?type=entree`)} /> : null}
        </View>
      ) : undefined}
    >
      <Card>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.small}>Dépensé</Text>
            <Text style={[styles.big, s.spent > s.budget && s.budget > 0 && { color: colors.danger }]}>{formatMoney(s.spent)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.small}>Budget prévu</Text>
            <Text style={styles.mid}>{s.budget > 0 ? formatMoney(s.budget) : 'Non renseigné'}</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.md }}><BudgetBar spent={s.spent} budget={s.budget} progress={s.progress} /></View>
        <Text style={[styles.small, { marginTop: 6 }]}>
          {s.budget > 0 ? `${Math.round(s.consumption)} % du budget consommé · repère noir : ${s.progress} % d'avancement` : 'Renseignez le budget dans la fiche du projet pour activer les écarts.'}
        </Text>
      </Card>

      {alerts.map((a) => (
        <View key={a} style={styles.alert}>
          <Ionicons name="warning-outline" size={18} color={colors.warningText} />
          <Text style={styles.alertText}>{a}</Text>
        </View>
      ))}

      <View style={styles.grid}>
        <Tile label="Reste du budget" value={s.budget > 0 ? formatMoney(s.remaining) : '—'} tone={s.budget === 0 ? 'neutral' : s.remaining < 0 ? 'bad' : 'good'} sub={s.remaining < 0 ? 'Dépassement' : 'Budget − dépensé'} />
        <Tile label="Projection finale" value={s.forecast !== null ? formatMoney(s.forecast) : '—'} tone={s.forecastGap === null ? 'neutral' : s.forecastGap < 0 ? 'bad' : 'good'} sub={s.forecastGap === null ? 'Il faut de l\'avancement' : `Écart ${formatMoney(s.forecastGap)}`} />
        <Tile label="Indice de coût" value={s.cpi !== null ? s.cpi.toFixed(2).replace('.', ',') : '—'} tone={s.cpi === null ? 'neutral' : s.cpi >= 1 ? 'good' : s.cpi >= 0.85 ? 'warn' : 'bad'} sub={s.cpi === null ? '—' : s.cpi >= 1 ? 'Sous contrôle' : 'Coûts supérieurs à l\'avancement'} />
        <Tile label="Décaissé" value={formatMoney(s.paid)} sub="Argent déjà sorti" />
        <Tile label="Reste à payer" value={formatMoney(s.due)} tone={s.due > 0 ? 'warn' : 'good'} sub={s.due > 0 ? 'Toucher pour filtrer' : 'Tout est réglé'} active={quick === 'a_payer'} onPress={() => toggleQuick('a_payer')} />
        <Tile label="Entrées" value={formatMoney(s.income)} tone="good" sub="Argent reçu" />
        <Tile label="Trésorerie" value={formatMoney(s.treasury)} tone={s.treasury < 0 ? 'bad' : 'neutral'} sub="Entrées − décaissé" />
        <Tile label="Justificatifs manquants" value={String(s.incomplete)} tone={s.incomplete > 0 ? 'warn' : 'good'} sub={s.incomplete > 0 ? 'Toucher pour filtrer' : 'Tout est justifié'} active={quick === 'incomplet'} onPress={() => toggleQuick('incomplet')} />
      </View>

      <SectionTitle>Analyse</SectionTitle>
      <Chips scroll options={PERIOD_OPTIONS} value={period} onChange={(p) => { setPeriod(p); setVisible(PAGE); }} />

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.cardTitle}>Dépenses par catégorie</Text>
        {cats.length === 0 ? <Text style={styles.small}>Aucune dépense sur cette période.</Text> : (
          <View style={styles.donutRow}>
            <Donut
              slices={cats.map((c) => ({ key: c.category, value: c.amount, color: CATEGORY_COLORS[c.category] }))}
              selected={category} centerTop="Total" centerBottom={formatMoney(inRange.reduce((t, e) => t + e.amount, 0)).replace(' FCFA', '')}
            />
            <View style={{ flex: 1 }}>
              {cats.map((c) => (
                <Pressable key={c.category} onPress={() => { setTab('depenses'); setCategory(category === c.category ? null : c.category); setVisible(PAGE); }} style={[styles.legendRow, category === c.category && { backgroundColor: colors.brandSoft }]}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[c.category] }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>{EXPENSE_LABELS[c.category]}</Text>
                  <Text style={styles.legendValue}>{formatMoney(c.amount).replace(' FCFA', '')}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Dépenses et entrées par mois</Text>
        {months.length === 0 ? <Text style={styles.small}>Aucune donnée.</Text> : <MonthBars data={months} selected={month} onSelect={(m) => { setMonth(m); setVisible(PAGE); }} />}
      </Card>

      {suppliers.length > 0 ? (
        <Card>
          <Text style={styles.cardTitle}>Principaux fournisseurs</Text>
          {suppliers.map((f) => (
            <View key={f.name} style={[styles.rowBetween, { paddingVertical: 4 }]}>
              <Text style={styles.legendLabel} numberOfLines={1}>{f.name}</Text>
              <Text style={styles.legendValue}>{formatMoney(f.amount)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionTitle>Détail</SectionTitle>
      <Chips options={[{ value: 'depenses', label: `Dépenses (${listExpenses.length})` }, { value: 'tresorerie', label: `Trésorerie (${listFlows.length})` }]} value={tab} onChange={(t) => { setTab(t); setVisible(PAGE); }} />
      {filtersOn ? (
        <Pressable onPress={resetFilters} style={styles.filterBar}>
          <Text style={styles.filterText} numberOfLines={2}>
            Filtre : {[category && EXPENSE_LABELS[category], month && monthLabel(month), quick === 'a_payer' && 'à payer', quick === 'incomplet' && 'justificatifs manquants'].filter(Boolean).join(' · ')}
          </Text>
          <Ionicons name="close-circle" size={18} color={colors.brand} />
        </Pressable>
      ) : null}

      {tab === 'depenses' ? (
        listExpenses.length === 0 ? (
          <EmptyState icon="receipt-outline" title="Aucune dépense" text={filtersOn || period !== 'all' ? 'Aucune dépense ne correspond aux filtres.' : "Enregistrez les achats, la main-d'œuvre et les locations pour suivre la marge."} />
        ) : (
          <>
            {listExpenses.slice(0, visible).map((e) => <ExpenseRow key={e.id} e={e} onPress={() => router.push(`/projects/${id}/expenses/${e.id}`)} />)}
            {listExpenses.length > visible ? <Button label={`Voir plus (${listExpenses.length - visible})`} variant="secondary" onPress={() => setVisible(visible + PAGE)} /> : null}
          </>
        )
      ) : listFlows.length === 0 ? (
        <EmptyState icon="swap-vertical-outline" title="Aucun mouvement" text="Les entrées et décaissements apparaissent ici." />
      ) : (
        <>
          {listFlows.slice(0, visible).map((f) => (
            <Card key={f.id} onPress={f.expenseId ? () => router.push(`/projects/${id}/expenses/${f.expenseId}`) : can('expenses.delete') ? () => removeFlow(f) : undefined}>
              <View style={styles.rowBetween}>
                <View style={[styles.rowBetween, { flex: 1, justifyContent: 'flex-start' }]}>
                  <Ionicons name={f.type === 'entree' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={22} color={f.type === 'entree' ? colors.success : colors.danger} />
                  <Text style={styles.rowLabel} numberOfLines={1}>{f.label}</Text>
                </View>
                <Text style={[styles.rowAmount, { color: f.type === 'entree' ? colors.success : colors.danger }]}>{f.type === 'entree' ? '+' : '−'}{formatMoney(f.amount)}</Text>
              </View>
              <Text style={styles.small}>{formatDate(f.date)} · {PAYMENT_LABELS[f.method]}{f.reference ? ` · ${f.reference}` : ''}{f.proofPhotos?.length ? ' · preuve jointe' : ''}</Text>
            </Card>
          ))}
          {listFlows.length > visible ? <Button label={`Voir plus (${listFlows.length - visible})`} variant="secondary" onPress={() => setVisible(visible + PAGE)} /> : null}
        </>
      )}
    </Screen>
  );
}

function Tile({ label, value, sub, tone = 'neutral', onPress, active }: { label: string; value: string; sub?: string; tone?: Tone; onPress?: () => void; active?: boolean }) {
  const body = (
    <>
      <Text style={styles.small}>{label}</Text>
      <Text style={[styles.tileValue, { color: toneColor[tone] }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={styles.tileSub} numberOfLines={2}>{sub}</Text> : null}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.tile, active && { borderColor: colors.brand, borderWidth: 2 }, pressed && { opacity: 0.85 }]}>{body}</Pressable>
  ) : <View style={styles.tile}>{body}</View>;
}

function ExpenseRow({ e, onPress }: { e: Expense; onPress: () => void }) {
  const state = payStateOf(e);
  return (
    <Card onPress={onPress}>
      <View style={styles.rowBetween}>
        <Text style={styles.rowLabel} numberOfLines={1}>{e.label}</Text>
        <Text style={styles.rowAmount}>{formatMoney(e.amount)}</Text>
      </View>
      <Text style={styles.small}>{formatDate(e.date)} · {EXPENSE_LABELS[e.category]}{e.supplierName ? ` · ${e.supplierName}` : ''}</Text>
      <View style={styles.badges}>
        <Badge label={state === 'paye' ? 'Payée' : state === 'partiel' ? 'Partielle' : 'À payer'} tone={state === 'paye' ? 'success' : state === 'partiel' ? 'warning' : 'danger'} />
        {lacksInvoice(e) ? <Badge label="Sans facture" tone="warning" /> : null}
        {lacksArticlePhotos(e) ? <Badge label="Sans photo" tone="warning" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  small: { ...font.small, color: colors.muted },
  big: { fontSize: 26, fontWeight: '800', color: colors.text },
  mid: { ...font.heading, color: colors.text },
  alert: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.goldSoft, borderRadius: radius.input, padding: spacing.md, marginBottom: spacing.sm },
  alertText: { ...font.small, color: colors.warningText, flex: 1, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  tile: { flexGrow: 1, flexBasis: '45%', backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  tileValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  tileSub: { ...font.small, color: colors.muted, marginTop: 4 },
  cardTitle: { ...font.body, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 6, borderRadius: radius.input },
  legendLabel: { ...font.small, color: colors.text, flex: 1 },
  legendValue: { ...font.small, fontWeight: '700', color: colors.text },
  dot: { width: 10, height: 10, borderRadius: 5 },
  filterBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: colors.brandSoft, borderRadius: radius.input, padding: spacing.md, marginTop: spacing.md },
  filterText: { ...font.small, color: colors.brand, fontWeight: '700', flex: 1 },
  rowLabel: { ...font.body, fontWeight: '600', color: colors.text, flex: 1 },
  rowAmount: { ...font.body, fontWeight: '700', color: colors.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
});

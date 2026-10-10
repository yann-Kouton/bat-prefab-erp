import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/auth/AuthContext';
import { Badge, Button, Card, EmptyState, IconButton, InfoRow, Loading, Screen, SectionTitle } from '@/components/ui';
import { COUNTRIES, QUOTE_STATUS_LABELS } from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { formatDate, formatMoney, formatNumber, toDate } from '@/lib/format';
import { QUOTE_TONES } from '@/lib/tones';
import { lineTotal } from '@/features/quotes/calc';
import { shareQuotePdf } from '@/features/quotes/pdf';
import { createDocument, nextNumber, removeDocument, updateDocument, useDocument } from '@/services/firestore';
import { colors, font, spacing } from '@/theme';
import type { Quote, QuoteStatus } from '@/types';

export default function QuoteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const { data: quote, loading } = useDocument<Quote>('quotes', id);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <Screen title="Devis" back><Loading /></Screen>;
  if (!quote) {
    return (
      <Screen title="Devis" back>
        <EmptyState icon="alert-circle-outline" title="Devis introuvable" text="Ce devis a peut-être été supprimé." />
      </Screen>
    );
  }

  const canWrite = can('quotes.write');
  const locked = !!quote.projectId;

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      notify('Action impossible', errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: QuoteStatus) =>
    run(status, () => updateDocument('quotes', quote.id, { status, statusChangedAt: serverTimestamp() }));

  const createProject = () =>
    run('project', async () => {
      const code = await nextNumber('PRJ');
      const projectId = await createDocument('projects', {
        code,
        title: quote.projectTitle,
        clientId: quote.clientId,
        clientName: quote.clientName,
        quoteId: quote.id,
        country: quote.country,
        currency: quote.currency,
        location: '',
        type: 'autre',
        status: 'etude',
        budget: quote.netHT,
        progress: 0,
        notes: `Créé depuis le devis ${quote.number}.`,
      });
      await updateDocument('quotes', quote.id, { projectId });
      router.push(`/projects/${projectId}`);
    });

  const remove = () =>
    confirmAction('Supprimer ce devis ?', `${quote.number} sera supprimé définitivement.`, 'Supprimer', async () => {
      try {
        await removeDocument('quotes', quote.id);
        router.back();
      } catch (e) {
        notify('Suppression impossible', errorMessage(e));
      }
    });

  return (
    <Screen
      title={quote.number}
      subtitle={quote.clientName}
      back
      right={canWrite && !locked ? <IconButton name="create-outline" color="#FFFFFF" label="Modifier le devis" onPress={() => router.push(`/quotes/${quote.id}/edit`)} /> : undefined}
      footer={<Button label="Générer le PDF" icon="document-attach-outline" variant="accent" loading={busy === 'pdf'} onPress={() => run('pdf', () => shareQuotePdf(quote))} />}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title} numberOfLines={2}>{quote.projectTitle}</Text>
          <Badge label={QUOTE_STATUS_LABELS[quote.status]} tone={QUOTE_TONES[quote.status]} />
        </View>
        <InfoRow label="Client" value={quote.clientName} />
        <InfoRow label="Pays" value={COUNTRIES[quote.country].label} />
        <InfoRow label="Créé le" value={formatDate(toDate(quote.createdAt))} />
        <InfoRow label="Validité" value={`${quote.validityDays} jours`} />
      </Card>

      <SectionTitle>Lignes</SectionTitle>
      <Card>
        {quote.items.map((item, i) => (
          <View key={item.id} style={[styles.item, i > 0 && styles.itemBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.description}</Text>
              <Text style={styles.itemSub}>
                {formatNumber(item.quantity)} {item.unit} × {formatMoney(item.unitPrice)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatMoney(lineTotal(item))}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <TotalRow label="Total HT" value={formatMoney(quote.subtotal)} />
        {quote.discountPct > 0 ? <TotalRow label={`Remise (${formatNumber(quote.discountPct)} %)`} value={`- ${formatMoney(quote.discountAmount)}`} /> : null}
        {quote.discountPct > 0 ? <TotalRow label="Net HT" value={formatMoney(quote.netHT)} /> : null}
        <TotalRow label={`TVA (${formatNumber(quote.vatPct)} %)`} value={formatMoney(quote.vatAmount)} />
        <TotalRow label="Total TTC" value={formatMoney(quote.totalTTC)} strong />
      </Card>

      {quote.conditions ? (
        <Card>
          <Text style={styles.noteTitle}>Conditions</Text>
          <Text style={styles.note}>{quote.conditions}</Text>
        </Card>
      ) : null}
      {quote.notes ? (
        <Card>
          <Text style={styles.noteTitle}>Remarques</Text>
          <Text style={styles.note}>{quote.notes}</Text>
        </Card>
      ) : null}

      {canWrite ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {quote.status === 'brouillon' ? (
            <Button label="Marquer comme envoyé" icon="paper-plane-outline" onPress={() => setStatus('envoye')} loading={busy === 'envoye'} />
          ) : null}
          {quote.status === 'envoye' ? (
            <>
              <Button label="Marquer comme accepté" icon="checkmark-circle-outline" onPress={() => setStatus('accepte')} loading={busy === 'accepte'} />
              <Button label="Marquer comme refusé" icon="close-circle-outline" variant="secondary" onPress={() => setStatus('refuse')} loading={busy === 'refuse'} />
            </>
          ) : null}
          {(quote.status === 'accepte' || quote.status === 'refuse') && !locked ? (
            <Button label="Repasser en brouillon" icon="refresh-outline" variant="secondary" onPress={() => setStatus('brouillon')} loading={busy === 'brouillon'} />
          ) : null}
          {quote.status === 'accepte' && !quote.projectId && can('projects.write') ? (
            <Button label="Créer le projet" icon="construct-outline" variant="accent" onPress={createProject} loading={busy === 'project'} />
          ) : null}
          {quote.projectId ? (
            <Button label="Voir le projet" icon="construct-outline" variant="secondary" onPress={() => router.push(`/projects/${quote.projectId}`)} />
          ) : null}
        </View>
      ) : null}

      {can('quotes.delete') && !locked ? (
        <View style={{ marginTop: spacing.xl }}>
          <Button label="Supprimer le devis" icon="trash-outline" variant="danger" onPress={remove} />
        </View>
      ) : null}
    </Screen>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.rowBetween, { paddingVertical: 5 }]}>
      <Text style={{ ...font.body, color: strong ? colors.text : colors.muted, fontWeight: strong ? '700' : '400' }}>{label}</Text>
      <Text style={{ ...font.body, color: colors.text, fontWeight: strong ? '700' : '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  title: { ...font.heading, color: colors.text, flex: 1 },
  item: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.neutralSoft },
  itemTitle: { ...font.body, color: colors.text, fontWeight: '600' },
  itemSub: { ...font.small, color: colors.muted, marginTop: 2 },
  itemTotal: { ...font.body, fontWeight: '700', color: colors.text },
  noteTitle: { ...font.small, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  note: { ...font.body, color: colors.text, lineHeight: 22 },
});

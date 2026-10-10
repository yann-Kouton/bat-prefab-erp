import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { Button, Chips, EmptyState, Field, Screen } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { WEATHER_OPTIONS } from '@/lib/constants';
import { errorMessage, notify } from '@/lib/dialogs';
import { isISODate, parseNumber, todayISO } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { createDocument } from '@/services/firestore';
import type { Weather } from '@/types';

const schema = z.object({
  date: z.string().trim().refine(isISODate, 'Format attendu : AAAA-MM-JJ.'),
  headcount: z.number().int('Nombre entier requis.').min(0, 'Effectif invalide.'),
  notes: z.string().trim().min(3, "Décrivez les travaux réalisés."),
});

export default function NewDailyLog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, profile } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [weather, setWeather] = useState<Weather>('soleil');
  const [headcount, setHeadcount] = useState('');
  const [notes, setNotes] = useState('');
  const [issues, setIssues] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  if (!can('logs.write')) {
    return (
      <Screen title="Rapport du jour" back>
        <EmptyState icon="lock-closed-outline" title="Accès limité" text="Votre rôle ne permet pas de rédiger le journal de chantier." />
      </Screen>
    );
  }

  async function save() {
    const result = validate(schema, { date, headcount: parseNumber(headcount), notes });
    setErrors(result.errors);
    if (!result.ok) return;
    setSaving(true);
    try {
      await createDocument(`projects/${id}/dailyLogs`, {
        date: date.trim(), weather, headcount: parseNumber(headcount), notes: notes.trim(),
        issues: issues.trim(), authorName: profile?.displayName ?? '',
      });
      router.back();
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen title="Rapport du jour" back footer={<Button label="Enregistrer le rapport" onPress={save} loading={saving} />}>
      <DateField label="Date" value={date} onChange={setDate} error={errors.date} />
      <Chips label="Météo" options={WEATHER_OPTIONS} value={weather} onChange={setWeather} />
      <Field label="Effectif présent sur le chantier" value={headcount} onChangeText={setHeadcount} keyboardType="number-pad" error={errors.headcount} />
      <Field label="Travaux réalisés" value={notes} onChangeText={setNotes} error={errors.notes} multiline />
      <Field label="Incidents, retards, blocages (facultatif)" value={issues} onChangeText={setIssues} multiline />
    </Screen>
  );
}

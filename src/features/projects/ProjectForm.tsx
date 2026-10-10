import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { ClientPicker } from '@/components/ClientPicker';
import { Button, Chips, Field, Screen } from '@/components/ui';
import {
  COUNTRIES, COUNTRY_OPTIONS, PROJECT_STATUS_OPTIONS, PROJECT_TYPE_OPTIONS,
} from '@/lib/constants';
import { confirmAction, errorMessage, notify } from '@/lib/dialogs';
import { isISODate, parseNumber } from '@/lib/format';
import { FieldErrors, validate } from '@/lib/validation';
import { createDocument, nextNumber, removeDocument, updateDocument } from '@/services/firestore';
import type { CountryCode, Project, ProjectStatus, ProjectType } from '@/types';

const optionalDate = (msg: string) => z.string().trim().refine((v) => v === '' || isISODate(v), msg);

const schema = z.object({
  clientId: z.string().min(1, 'Choisissez un client.'),
  title: z.string().trim().min(3, 'Donnez un nom au projet.'),
  budget: z.number().min(0, 'Budget invalide.'),
  startDate: optionalDate('Format attendu : AAAA-MM-JJ.'),
  endDate: optionalDate('Format attendu : AAAA-MM-JJ.'),
});

export function ProjectForm({ project }: { project?: Project }) {
  const { can, profile } = useAuth();
  const [client, setClient] = useState<{ id: string; name: string } | null>(
    project ? { id: project.clientId, name: project.clientName } : null,
  );
  const [title, setTitle] = useState(project?.title ?? '');
  const [type, setType] = useState<ProjectType>(project?.type ?? 'prefabrique');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'etude');
  const [country, setCountry] = useState<CountryCode>(project?.country ?? profile?.country ?? 'CI');
  const [location, setLocation] = useState(project?.location ?? '');
  const [budget, setBudget] = useState(project ? String(project.budget) : '');
  const [startDate, setStartDate] = useState(project?.startDate ?? '');
  const [endDate, setEndDate] = useState(project?.endDate ?? '');
  const [managerName, setManagerName] = useState(project?.managerName ?? '');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = validate(schema, { clientId: client?.id ?? '', title, budget: parseNumber(budget), startDate, endDate });
    setErrors(result.errors);
    if (!result.ok || !client) return;
    setSaving(true);
    try {
      const data = {
        title: title.trim(), clientId: client.id, clientName: client.name, type, status, country,
        currency: COUNTRIES[country].currency, location: location.trim(), budget: parseNumber(budget),
        startDate: startDate.trim(), endDate: endDate.trim(), managerName: managerName.trim(), notes: notes.trim(),
      };
      if (project) {
        await updateDocument('projects', project.id, data);
        router.back();
      } else {
        const code = await nextNumber('PRJ');
        const id = await createDocument('projects', { ...data, code, progress: 0 });
        router.replace(`/projects/${id}`);
      }
    } catch (e) {
      notify('Enregistrement impossible', errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    if (!project) return;
    confirmAction('Supprimer ce projet ?', `${project.code} · ${project.title} sera supprimé définitivement.`, 'Supprimer', async () => {
      try {
        await removeDocument('projects', project.id);
        router.dismissAll();
      } catch (e) {
        notify('Suppression impossible', errorMessage(e));
      }
    });
  }

  return (
    <Screen
      title={project ? `Modifier ${project.code}` : 'Nouveau projet'}
      back
      footer={<Button label={project ? 'Enregistrer les modifications' : 'Créer le projet'} onPress={save} loading={saving} />}
    >
      <Field label="Nom du projet" value={title} onChangeText={setTitle} error={errors.title} placeholder="Ex. Base-vie mine d'or – Lot 1" />
      <ClientPicker label="Client" value={client} onChange={(c) => setClient({ id: c.id, name: c.name })} error={errors.clientId} />
      <Chips label="Type de construction" options={PROJECT_TYPE_OPTIONS} value={type} onChange={setType} />
      <Chips label="Statut" options={PROJECT_STATUS_OPTIONS} value={status} onChange={setStatus} />
      <Chips label="Pays" options={COUNTRY_OPTIONS} value={country} onChange={setCountry} />
      <Field label="Lieu du chantier" value={location} onChangeText={setLocation} placeholder="Ville, commune, site…" />
      <Field label="Budget (FCFA)" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" error={errors.budget} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Début" value={startDate} onChangeText={setStartDate} placeholder="AAAA-MM-JJ" error={errors.startDate} autoCapitalize="none" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Fin prévue" value={endDate} onChangeText={setEndDate} placeholder="AAAA-MM-JJ" error={errors.endDate} autoCapitalize="none" />
        </View>
      </View>
      <Field label="Responsable de chantier" value={managerName} onChangeText={setManagerName} autoCapitalize="words" />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      {project && can('projects.delete') ? <Button label="Supprimer le projet" variant="danger" icon="trash-outline" onPress={remove} /> : null}
    </Screen>
  );
}

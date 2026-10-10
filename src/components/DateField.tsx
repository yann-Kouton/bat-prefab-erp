import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, isISODate, todayISO } from '@/lib/format';
import { colors, font, radius, spacing } from '@/theme';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // semaine commençant le lundi

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parse(iso: string): { y: number; m: number; d: number } | null {
  if (!isISODate(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}

interface Props {
  label: string;
  value: string; // AAAA-MM-JJ, ou '' si vide
  onChange: (iso: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean; // champ facultatif : affiche « Effacer »
  placeholder?: string;
  disabled?: boolean;
}

/** Champ date avec calendrier (remplace la saisie manuelle AAAA-MM-JJ). Garde la valeur au format AAAA-MM-JJ. */
export function DateField({ label, value, onChange, error, hint, optional, placeholder = 'Choisir une date', disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(new Date().getFullYear());
  const [viewM, setViewM] = useState(new Date().getMonth());
  const [yearMode, setYearMode] = useState(false);

  const selected = parse(value);
  const today = parse(todayISO())!;

  const openPicker = () => {
    const base = selected ?? today;
    setViewY(base.y);
    setViewM(base.m);
    setYearMode(false);
    setOpen(true);
  };
  const close = () => setOpen(false);
  const pick = (iso: string) => { onChange(iso); close(); };

  const shiftMonth = (delta: number) => {
    const total = viewY * 12 + viewM + delta;
    setViewY(Math.floor(total / 12));
    setViewM(((total % 12) + 12) % 12);
  };

  // Grille du mois : cases vides avant le 1er, puis les jours.
  const offset = (new Date(viewY, viewM, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const years = Array.from({ length: 12 }, (_, i) => viewY - 5 + i);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value ? formatDate(value) : 'non renseignée'}`}
        style={[styles.field, error ? { borderColor: colors.danger } : null, disabled && { backgroundColor: colors.canvas }]}
      >
        <Text style={[styles.value, !selected && { color: colors.muted }]} numberOfLines={1}>
          {selected ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.brand} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          {/* Pressable interne : un appui dans la carte ne ferme pas la fenêtre */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.navRow}>
              <Pressable
                onPress={() => (yearMode ? setViewY(viewY - 12) : shiftMonth(-1))}
                accessibilityRole="button"
                accessibilityLabel={yearMode ? 'Années précédentes' : 'Mois précédent'}
                hitSlop={8}
                style={styles.navBtn}
              >
                <Ionicons name="chevron-back" size={22} color={colors.brand} />
              </Pressable>
              <Pressable onPress={() => setYearMode(!yearMode)} accessibilityRole="button" accessibilityLabel="Changer d'année" style={styles.titleBtn}>
                <Text style={styles.title}>{yearMode ? 'Choisir l\'année' : `${MONTHS[viewM]} ${viewY}`}</Text>
                <Ionicons name={yearMode ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
              </Pressable>
              <Pressable
                onPress={() => (yearMode ? setViewY(viewY + 12) : shiftMonth(1))}
                accessibilityRole="button"
                accessibilityLabel={yearMode ? 'Années suivantes' : 'Mois suivant'}
                hitSlop={8}
                style={styles.navBtn}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.brand} />
              </Pressable>
            </View>

            {yearMode ? (
              <View style={styles.yearGrid}>
                {years.map((y) => {
                  const isSel = y === viewY;
                  return (
                    <Pressable key={y} onPress={() => { setViewY(y); setYearMode(false); }} accessibilityRole="button" style={[styles.yearCell, isSel && styles.cellSelected]}>
                      <Text style={[styles.yearText, isSel && { color: '#FFFFFF' }]}>{y}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={styles.weekRow}>
                  {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
                </View>
                {rows.map((row, r) => (
                  <View key={r} style={styles.weekRow}>
                    {row.map((day, c) => {
                      if (day === null) return <View key={c} style={styles.dayCell} />;
                      const iso = toISO(viewY, viewM, day);
                      const isSel = iso === value;
                      const isToday = iso === todayISO();
                      return (
                        <Pressable
                          key={c}
                          onPress={() => pick(iso)}
                          accessibilityRole="button"
                          accessibilityLabel={formatDate(iso)}
                          accessibilityState={{ selected: isSel }}
                          style={styles.dayCell}
                        >
                          <View style={[styles.dayInner, isToday && !isSel && styles.dayToday, isSel && styles.cellSelected]}>
                            <Text style={[styles.dayText, isSel && { color: '#FFFFFF', fontWeight: '700' }]}>{day}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </>
            )}

            <View style={styles.actions}>
              <Pressable onPress={() => pick(todayISO())} accessibilityRole="button" hitSlop={8}>
                <Text style={styles.actionText}>Aujourd'hui</Text>
              </Pressable>
              {optional && value ? (
                <Pressable onPress={() => pick('')} accessibilityRole="button" hitSlop={8}>
                  <Text style={[styles.actionText, { color: colors.danger }]}>Effacer</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={close} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.actionText, { color: colors.muted }]}>Annuler</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { ...font.small, fontWeight: '600', color: colors.text, marginBottom: 6 },
  field: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { flex: 1, fontSize: 15, color: colors.text },
  error: { ...font.small, color: colors.danger, marginTop: 4 },
  hint: { ...font.small, color: colors.muted, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(18,35,63,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: CELL * 7 + spacing.lg * 2, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8 },
  title: { ...font.heading, color: colors.text },
  weekRow: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', ...font.small, fontWeight: '700', color: colors.muted, paddingVertical: 6 },
  dayCell: { width: `${100 / 7}%`, height: CELL, alignItems: 'center', justifyContent: 'center' },
  dayInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayToday: { borderWidth: 1, borderColor: colors.brand },
  cellSelected: { backgroundColor: colors.brand },
  dayText: { fontSize: 15, color: colors.text },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  yearCell: { width: '30%', minHeight: 42, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  yearText: { fontSize: 15, fontWeight: '600', color: colors.text },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.brand },
});

import { ReactNode, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput,
  TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, font, radius, spacing } from '@/theme';
import type { Tone } from '@/lib/tones';

export type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------------------------------------------ Screen */

interface ScreenProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

export function Screen({ title, subtitle, back, right, scroll = true, padded = true, footer, children }: ScreenProps) {
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.headerWrap}>
        <View style={styles.header}>
          {back ? <IconButton name="chevron-back" color="#FFFFFF" label="Retour" onPress={goBack} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
      </SafeAreaView>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[padded && styles.content, !footer && padded && { paddingBottom: spacing.xxl * 2 }]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padded && styles.content]}>{children}</View>
        )}
        {footer ? (
          <SafeAreaView edges={['bottom']} style={styles.footer}>
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/* ------------------------------------------------------------------ Boutons */

export function IconButton({
  name, onPress, color = colors.brand, size = 24, label,
}: { name: IconName; onPress: () => void; color?: string; size?: number; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'danger';

export function Button({
  label, onPress, variant = 'primary', icon, loading, disabled, style,
}: {
  label: string; onPress: () => void; variant?: ButtonVariant; icon?: IconName; loading?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button, { backgroundColor: v.bg, borderColor: v.border }, pressed && { opacity: 0.85 }, inactive && { opacity: 0.5 }, style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonText, { color: v.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.brand, fg: '#FFFFFF', border: colors.brand },
  accent: { bg: colors.gold, fg: colors.brand, border: colors.gold },
  secondary: { bg: colors.surface, fg: colors.brand, border: colors.border },
  danger: { bg: colors.surface, fg: colors.danger, border: colors.danger },
};

export function Fab({ onPress, icon = 'add', label }: { onPress: () => void; icon?: IconName; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={28} color={colors.brand} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ Saisie */

export function Field({
  label, error, hint, style, multiline, ...rest
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          multiline && { minHeight: 88, paddingTop: 10, textAlignVertical: 'top' },
          focused && { borderColor: colors.brand },
          error ? { borderColor: colors.danger } : null,
          rest.editable === false && { backgroundColor: colors.canvas },
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chips<T extends string>({
  label, options, value, onChange, scroll, disabled, error,
}: {
  label?: string; options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void;
  scroll?: boolean; disabled?: boolean; error?: string;
}) {
  const chips = options.map((o) => {
    const selected = o.value === value;
    return (
      <Pressable
        key={o.value}
        disabled={disabled}
        onPress={() => onChange(o.value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[styles.chip, selected && styles.chipSelected, disabled && !selected && { opacity: 0.5 }]}
      >
        <Text style={[styles.chipText, selected && { color: '#FFFFFF' }]}>{o.label}</Text>
      </Pressable>
    );
  });
  return (
    <View style={label ? styles.fieldWrap : undefined}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>{chips}</ScrollView>
      ) : (
        <View style={[styles.chipRow, { flexWrap: 'wrap' }]}>{chips}</View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (t: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? <IconButton name="close-circle" size={20} color={colors.muted} label="Effacer la recherche" onPress={() => onChangeText('')} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ Affichage */

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutralSoft, fg: colors.text },
  info: { bg: colors.infoSoft, fg: colors.info },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.goldSoft, fg: colors.warningText },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{children}</Text>
      {right}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={[styles.trackFill, { width: `${pct}%` }]} />
    </View>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={[styles.empty, { paddingVertical: spacing.xxl * 2 }]}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

/* ------------------------------------------------------------------ Styles */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.canvas },
  headerWrap: { backgroundColor: colors.brand },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 60, gap: spacing.sm },
  headerText: { flex: 1 },
  headerTitle: { ...font.display, color: '#FFFFFF' },
  headerSubtitle: { ...font.small, color: colors.onBrandMuted, marginTop: 2 },
  content: { padding: spacing.lg },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 48, borderRadius: radius.input, borderWidth: 1, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fieldWrap: { marginBottom: spacing.lg },
  label: { ...font.small, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, backgroundColor: colors.surface, paddingHorizontal: 12, fontSize: 15, color: colors.text },
  error: { ...font.small, color: colors.danger, marginTop: 4 },
  hint: { ...font.small, color: colors.muted, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: { paddingHorizontal: 14, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...font.small, fontWeight: '600', color: colors.text },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, minHeight: 44, fontSize: 15, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.md },
  sectionTitleText: { ...font.heading, color: colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, gap: spacing.lg },
  infoLabel: { ...font.small, color: colors.muted, flexShrink: 0 },
  infoValue: { ...font.body, color: colors.text, flex: 1, textAlign: 'right' },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.neutralSoft, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.gold },
  empty: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { ...font.heading, color: colors.text, textAlign: 'center' },
  emptyText: { ...font.body, color: colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 21 },
});

import { useState, type ReactNode, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/icons';
import { font, lift, palette } from '@/constants/theme';
import { activeBarangays } from '@/data/catalog';

export function Seal({ size = 44 }: { size?: number }) {
  return (
    <View style={[styles.seal, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        style={{
          width: size * 0.38,
          height: size * 0.38,
          borderRadius: size * 0.19,
          borderWidth: 2,
          borderColor: '#E4C88A',
        }}
      />
    </View>
  );
}

export function Screen({
  children,
  title,
  subtitle,
  onBack,
  footer,
  tab = false,
  scroll = true,
  avoidKeyboard = false,
  scrollRef,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  footer?: ReactNode;
  tab?: boolean;
  scroll?: boolean;
  avoidKeyboard?: boolean;
  scrollRef?: RefObject<ScrollViewInstance | null>;
}) {
  const insets = useSafeAreaInsets();
  const body = (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {onBack || title ? (
        <View style={styles.header}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.backCircle}>
              <AppIcon name="back" color={palette.palm} size={18} />
            </Pressable>
          ) : null}
          {title ? <Text style={styles.screenTitle}>{title}</Text> : null}
          {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: footer ? 28 : tab ? 108 : insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>
      ) : null}
    </View>
  );
  if (!avoidKeyboard) return body;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && lift,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextDark,
          variant === 'danger' && styles.buttonTextDanger,
          variant === 'ghost' && styles.buttonTextDark,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  selected = false,
  onPress,
  tone = 'paper',
}: {
  children: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'paper' | 'sun';
}) {
  const toneStyle = tone === 'sun' ? styles.cardSun : null;
  if (!onPress) return <View style={[styles.card, toneStyle, selected && styles.cardOn]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, toneStyle, selected && styles.cardOn, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function Pill({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'warn' | 'bad' | 'ink' | 'neutral';
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'good' && styles.pillGood,
        tone === 'warn' && styles.pillWarn,
        tone === 'bad' && styles.pillBad,
        tone === 'ink' && styles.pillInk,
        tone === 'neutral' && styles.pillNeutral,
      ]}>
      <Text
        style={[
          styles.pillText,
          tone === 'good' && styles.pillTextGood,
          tone === 'warn' && styles.pillTextWarn,
          tone === 'bad' && styles.pillTextBad,
          tone === 'ink' && styles.pillTextInk,
          tone === 'neutral' && styles.pillTextNeutral,
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Choice({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceOn]}>
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>{label}</Text>
        {detail ? <Text style={[styles.choiceDetail, selected && styles.choiceDetailOn]}>{detail}</Text> : null}
      </View>
      {selected ? <Text style={styles.choiceCheck}>✓</Text> : null}
    </Pressable>
  );
}

export function BarangaySelect({
  label = 'Barangay',
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const matches = activeBarangays().filter((barangay) => barangay.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((current) => !current)}
        style={styles.input}>
        <Text style={{ color: value ? palette.ink : palette.muted, fontSize: 16 }}>
          {value || 'Select Barangay'}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search barangay"
            placeholderTextColor={palette.muted}
            autoCorrect={false}
            style={styles.menuSearch}
          />
          <ScrollView style={styles.menuList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {matches.map((barangay) => {
            const selected = barangay === value;
            return (
              <Pressable
                key={barangay}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  onChange(barangay);
                  setOpen(false);
                }}
                style={[styles.menuItem, selected && styles.menuItemOn]}>
                <Text style={{ color: selected ? palette.palm : palette.ink, fontWeight: selected ? '700' : '500' }}>
                  {barangay}
                </Text>
              </Pressable>
            );
          })}
          {matches.length === 0 ? <Text style={styles.hint}>No barangay matches that search.</Text> : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  maxLength,
  hint,
  multiline = false,
  secure = false,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
  maxLength?: number;
  hint?: string;
  multiline?: boolean;
  secure?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        secureTextEntry={secure}
        editable={editable}
        autoCapitalize={keyboardType === 'default' ? 'sentences' : 'none'}
        autoCorrect={false}
        style={[styles.input, multiline && styles.inputMulti]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: 'info' | 'bad' | 'good' | 'warn';
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.notice,
        tone === 'info' && styles.noticeInfo,
        tone === 'bad' && styles.noticeBad,
        tone === 'good' && styles.noticeGood,
        tone === 'warn' && styles.noticeWarn,
      ]}>
      <Text
        style={[
          styles.noticeText,
          tone === 'info' && styles.noticeTextInfo,
          tone === 'bad' && styles.noticeTextBad,
          tone === 'good' && styles.noticeTextGood,
          tone === 'warn' && styles.noticeTextWarn,
        ]}>
        {children}
      </Text>
    </View>
  );
}

export function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, strong && styles.lineStrong]}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]}>{value}</Text>
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.screenSubtitle}>{body}</Text> : null}
    </View>
  );
}

export function ToggleRow({
  label,
  detail,
  value,
  onValueChange,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {detail ? <Text style={styles.hint}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.line, true: palette.leaf }}
        thumbColor={palette.paper}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: 20, paddingBottom: 8, gap: 6 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E4D5BE',
    alignItems: 'center',
    justifyContent: 'center',
    ...lift,
  },
  screenTitle: {
    fontFamily: font.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
    fontWeight: '700',
    color: palette.palm,
  },
  screenSubtitle: { color: palette.muted, fontSize: 15, lineHeight: 22 },
  content: { paddingHorizontal: 22, paddingTop: 12, gap: 16 },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 8,
    gap: 10,
    backgroundColor: palette.bg,
  },
  titleBlock: { gap: 6 },
  pageTitle: {
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontWeight: '700',
    color: palette.palm,
  },
  kicker: {
    color: palette.palm,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonSecondary: { backgroundColor: palette.paper, borderWidth: 0 },
  buttonDanger: { backgroundColor: palette.dangerBg },
  buttonGhost: { backgroundColor: 'transparent', minHeight: 44 },
  buttonText: { color: '#FFFBF6', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  buttonTextDark: { color: palette.ink },
  buttonTextDanger: { color: palette.clay },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.45 },
  card: {
    backgroundColor: palette.paper,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: palette.paper,
    padding: 18,
    gap: 8,
    ...lift,
  },
  cardOn: { borderColor: palette.orange },
  cardSun: { backgroundColor: palette.warn, borderColor: palette.warn },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pillGood: { backgroundColor: palette.mist },
  pillWarn: { backgroundColor: palette.warn },
  pillBad: { backgroundColor: palette.dangerBg },
  pillInk: { backgroundColor: palette.ink },
  pillNeutral: { backgroundColor: palette.mist },
  pillText: { fontSize: 12, fontWeight: '700' },
  pillTextGood: { color: palette.leaf },
  pillTextWarn: { color: '#6B4E16' },
  pillTextBad: { color: palette.clay },
  pillTextInk: { color: palette.cream },
  pillTextNeutral: { color: palette.palm },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.paper,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: palette.orange, borderColor: palette.orange },
  chipText: { color: palette.ink, fontWeight: '600' },
  chipTextOn: { color: '#FFFBF6' },
  choice: {
    flex: 1,
    minHeight: 88,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: palette.paper,
    backgroundColor: palette.paper,
    padding: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceCopy: { flex: 1, gap: 4 },
  choiceCheck: { color: palette.palm, fontSize: 18, fontWeight: '700' },
  choiceOn: { borderColor: palette.orange },
  choiceLabel: { color: palette.palm, fontWeight: '700', fontSize: 16 },
  choiceLabelOn: { color: palette.palm },
  choiceDetail: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  choiceDetailOn: { color: palette.muted },
  field: { gap: 8 },
  fieldLabel: { color: palette.palm, fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: '#E4D5BE',
    paddingHorizontal: 16,
    color: palette.ink,
    fontSize: 16,
  },
  inputMulti: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  menu: { backgroundColor: palette.paper, borderRadius: 16, ...lift },
  menuSearch: {
    minHeight: 44,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  menuList: { maxHeight: 220 },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  menuItemOn: { backgroundColor: '#E4D5BE' },
  hint: { color: palette.muted, fontSize: 13, lineHeight: 18 },
  notice: { borderRadius: 16, padding: 14 },
  noticeInfo: { backgroundColor: palette.mist },
  noticeBad: { backgroundColor: '#F4C7C7' },
  noticeGood: { backgroundColor: '#D7EBD4' },
  noticeWarn: { backgroundColor: palette.warn },
  noticeText: { fontSize: 14, lineHeight: 20 },
  noticeTextInfo: { color: palette.palm },
  noticeTextBad: { color: palette.clay },
  noticeTextGood: { color: palette.leaf },
  noticeTextWarn: { color: '#6B4E16' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  lineLabel: { color: palette.muted, fontSize: 15, flex: 1 },
  lineValue: { color: palette.ink, fontSize: 15, fontWeight: '600' },
  lineStrong: { color: palette.ink, fontWeight: '700' },
  stat: {
    flex: 1,
    backgroundColor: palette.paper,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    ...lift,
  },
  statValue: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  statLabel: { color: palette.muted, fontSize: 12 },
  empty: { gap: 6, paddingVertical: 12 },
  emptyTitle: { fontFamily: font.serif, fontSize: 24, color: palette.palm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  toggleCopy: { flex: 1, gap: 4 },
  toggleLabel: { color: palette.ink, fontSize: 16, fontWeight: '700' },
  seal: { backgroundColor: palette.palm, alignItems: 'center', justifyContent: 'center' },
});

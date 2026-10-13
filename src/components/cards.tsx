import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill, VerifyPill } from '@/components/status';
import { Card } from '@/components/ui';
import { font, lift, palette } from '@/constants/theme';
import { CITY_NAME, getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { formatDate, formatDuration, formatTime, peso } from '@/lib/format';
import { CATEGORY_LABEL, MODE_LABEL, ratingLabel } from '@/lib/labels';
import { quoted } from '@/lib/rules';
import { push } from '@/lib/nav';
import type { Booking, Therapist, Treatment } from '@/types/domain';

export function TreatmentCard({
  treatment,
  onPress,
  selected = false,
  layout = 'row',
  actionLabel = 'View Details',
}: {
  treatment: Treatment;
  onPress?: () => void;
  selected?: boolean;
  layout?: 'row' | 'circle';
  actionLabel?: string;
}) {
  const shortest = Math.min(...treatment.durationOptions);
  const from = quoted(treatment, shortest).serviceTotal;
  if (layout === 'circle') {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.circleWrap}>
        <View style={[styles.orb, selected && styles.orbOn]}>
          <Text style={styles.orbPrice}>{peso(from)}</Text>
          <Text style={styles.orbMins}>{shortest} minutes</Text>
        </View>
        <Text style={styles.circleName}>{treatment.name}</Text>
        <Text style={styles.viewDetails}>{actionLabel}</Text>
      </Pressable>
    );
  }
  return (
    <Card selected={selected} onPress={onPress}>
      <Text style={styles.category}>{CATEGORY_LABEL[treatment.category]}</Text>
      <Text style={styles.cardTitle}>{treatment.name}</Text>
      <Text style={styles.muted}>{treatment.summary}</Text>
      <Text style={styles.price}>
        {peso(from)} · {formatDuration(shortest)}
      </Text>
    </Card>
  );
}

export function TherapistRow({
  therapist,
  detail,
  selected = false,
  onPress,
}: {
  therapist: Therapist;
  detail?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const initials = therapist.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  return (
    <Card selected={selected} onPress={onPress}>
      <View style={styles.person}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.personCopy}>
          <View style={styles.personTop}>
            <Text style={styles.cardTitle}>{therapist.name}</Text>
            <VerifyPill status={therapist.verification} />
          </View>
          <Text style={styles.muted}>{therapist.title}</Text>
          <Text style={styles.price}>
            {ratingLabel(therapist)} · {therapist.years} years
          </Text>
          {detail ? <Text style={styles.muted}>{detail}</Text> : null}
        </View>
      </View>
    </Card>
  );
}

export function VisitCard({ booking, highlight = false }: { booking: Booking; highlight?: boolean }) {
  const { role, therapists } = useApp();
  const treatment = getTreatment(booking.treatmentId);
  const therapist = therapists.find((item) => item.id === booking.therapistId);
  const who = role === 'therapist' ? booking.customerName : therapist?.name ?? 'Therapist';
  return (
    <Card tone={highlight ? 'sun' : 'paper'} onPress={() => push(`/booking/${booking.id}`)}>
      <Text style={styles.upcoming}>{highlight ? 'Upcoming Appointment' : 'Appointment'}</Text>
      <View style={styles.personTop}>
        <Text style={styles.cardTitle}>{treatment?.name ?? 'Session'}</Text>
        <StatusPill status={booking.status} />
      </View>
      <Text style={styles.price}>{who}</Text>
      <Text style={styles.muted}>
        {formatDate(booking.date)} · {formatTime(booking.time)} · {formatDuration(booking.duration)}
      </Text>
      <Text style={styles.muted}>
        {MODE_LABEL[booking.mode]} · {booking.city}, {CITY_NAME}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  category: { color: palette.palm, fontSize: 13, fontWeight: '700' },
  cardTitle: { color: palette.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  muted: { color: palette.muted, fontSize: 14, lineHeight: 20 },
  price: { color: palette.palm, fontWeight: '700' },
  circleWrap: { alignItems: 'center', gap: 6, paddingVertical: 6 },
  orb: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...lift,
  },
  orbOn: { borderWidth: 2, borderColor: palette.orange },
  orbPrice: { fontFamily: font.serif, color: palette.palm, fontSize: 22 },
  orbMins: { color: palette.muted, fontSize: 12 },
  circleName: { color: palette.ink, fontWeight: '700', textAlign: 'center', fontSize: 14 },
  viewDetails: { color: palette.orange, fontWeight: '700', fontSize: 13 },
  person: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  personCopy: { flex: 1, gap: 4 },
  personTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E4D5BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: palette.palm, fontWeight: '700', fontSize: 16 },
  upcoming: { color: palette.palm, fontWeight: '700', fontSize: 13 },
});

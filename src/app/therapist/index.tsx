import { Text, View } from 'react-native';

import { VisitCard } from '@/components/cards';
import { VerifyPill } from '@/components/status';
import { Button, Card, Kicker, Notice, PageTitle, Screen, Stat } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { peso, sessionDate, thisWeekLabel } from '@/lib/format';
import { buildReport, PLATFORM_FEE_PERCENT } from '@/lib/rules';
import { push } from '@/lib/nav';

export default function TherapistHome() {
  const { bookings, activeTherapist, acceptBooking } = useApp();
  if (!activeTherapist) {
    return (
      <Screen tab>
        <PageTitle title="Desk unavailable" />
      </Screen>
    );
  }
  const report = buildReport(bookings, activeTherapist.id, (id) => getTreatment(id)?.name ?? 'Session');
  const open = bookings
    .filter((booking) => booking.therapistId === activeTherapist.id && booking.status === 'assigned')
    .sort((a, b) => sessionDate(a).getTime() - sessionDate(b).getTime());

  return (
    <Screen tab>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Kicker>Therapist desk</Kicker>
        <VerifyPill status={activeTherapist.verification} />
      </View>
      <PageTitle title={activeTherapist.name || 'Your desk'} subtitle={activeTherapist.title || 'Add your details on Profile'} />
      {activeTherapist.verification === 'verified' ? (
        <Notice tone="info">{activeTherapist.verificationNote}</Notice>
      ) : activeTherapist.verification === 'pending' ? (
        <Notice tone="warn">Your license is in review. Clients cannot book you until it is approved.</Notice>
      ) : (
        <Notice tone="warn">Open Profile and enter your license, services, and hours before clients can book you.</Notice>
      )}
      <Card onPress={() => push('/therapist/reports')}>
        <Kicker>This week</Kicker>
        <Text style={{ fontFamily: font.serif, color: palette.ink, fontSize: 36 }}>{peso(report.weekNet)}</Text>
        <Text style={{ color: palette.muted }}>
          Net after the {PLATFORM_FEE_PERCENT}% Hilotcare fee · {thisWeekLabel()}
        </Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Waiting" value={String(open.length)} />
        <Stat label="Confirmed" value={String(report.completedCount)} />
      </View>
      <Kicker>New bookings</Kicker>
      {open.length === 0 ? (
        <Text style={{ color: palette.muted, lineHeight: 22 }}>
          Nothing here until a customer books a session.
        </Text>
      ) : null}
      {open.map((booking) => (
        <View key={booking.id} style={{ gap: 8 }}>
          <VisitCard booking={booking} />
          <Button label="Accept payment and confirm" onPress={() => acceptBooking(booking.id)} />
        </View>
      ))}
    </Screen>
  );
}

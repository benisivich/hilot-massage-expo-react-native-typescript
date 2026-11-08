import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, Field, Kicker, PageTitle, Screen } from '@/components/ui';
import { palette } from '@/constants/theme';
import { useAdminData } from '@/hooks/use-admin';
import { exportCsv, exportPdf } from '@/lib/export-csv';
import { peso, toISODate } from '@/lib/format';
import { back } from '@/lib/nav';
import { simplePdf } from '@/lib/simple-pdf';
import type { Booking, SessionStatus } from '@/types/domain';

type ReportKind = 'appointments' | 'completion' | 'earnings';
type Range = 'all' | 'today' | 'month' | 'custom';

const STATUS: Record<SessionStatus, string> = {
  assigned: 'Waiting',
  confirmed: 'Accepted',
  en_route: 'On the way',
  arrived: 'Arrived',
  in_session: 'In session',
  completed: 'Finished',
  cancelled: 'Cancelled',
};

const REPORTS: { id: ReportKind; label: string; help: string }[] = [
  { id: 'appointments', label: 'All visits', help: 'Every booking in the dates you pick.' },
  { id: 'completion', label: 'Finished visits', help: 'Only visits that already happened.' },
  { id: 'earnings', label: 'Money earned', help: 'Only visits that were paid.' },
];

export default function AdminReports() {
  const { bookings, therapists, treatments } = useAdminData();
  const [kind, setKind] = useState<ReportKind>('appointments');
  const [range, setRange] = useState<Range>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [therapistId, setTherapistId] = useState('all');
  const [treatmentId, setTreatmentId] = useState('all');

  const fromOk = from === '' || /^\d{4}-\d{2}-\d{2}$/.test(from);
  const toOk = to === '' || /^\d{4}-\d{2}-\d{2}$/.test(to);
  const help = REPORTS.find((item) => item.id === kind)?.help ?? '';

  const rows = useMemo(() => {
    return bookings.filter((booking) => {
      if (fromOk && from && booking.date < from) return false;
      if (toOk && to && booking.date > to) return false;
      if (therapistId !== 'all' && booking.therapistId !== therapistId) return false;
      if (treatmentId !== 'all' && booking.treatmentId !== treatmentId) return false;
      if (kind === 'completion') return booking.status === 'completed';
      if (kind === 'earnings') return booking.paymentStatus === 'paid';
      return true;
    });
  }, [bookings, from, to, fromOk, toOk, therapistId, treatmentId, kind]);

  const total = rows.reduce((sum, booking) => sum + booking.amountPaid, 0);

  const pickRange = (next: Exclude<Range, 'custom'>) => {
    setRange(next);
    if (next === 'all') {
      setFrom('');
      setTo('');
      return;
    }
    if (next === 'today') {
      const today = toISODate(new Date());
      setFrom(today);
      setTo(today);
      return;
    }
    const now = new Date();
    setFrom(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  };

  const share = async (format: 'pdf' | 'excel') => {
    if (!fromOk || !toOk) {
      Alert.alert('Check the dates', 'Type each date as year-month-day, like 2026-11-06. Or tap All dates, Today, or This month.');
      return;
    }
    const title = kind === 'completion' ? 'Finished visits' : kind === 'earnings' ? 'Money earned' : 'All visits';
    const lines = rows.map((booking) => plainLine(booking, therapists, treatments));
    try {
      if (format === 'excel') {
        const csv = [
          'Customer,Therapist,Service,Date,Time,Status,Amount paid',
          ...rows.map((booking) => csvFor(booking, therapists, treatments)),
        ].join('\n');
        await exportCsv('hilotcare-report.csv', csv);
      } else {
        await exportPdf(
          'hilotcare-report.pdf',
          simplePdf([title, `${rows.length} visits`, `Money paid PHP ${Math.round(total)}`, ...lines]),
        );
      }
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'The file could not be shared.');
    }
  };

  return (
    <Screen onBack={back}>
      <PageTitle title="Reports" subtitle="Pick a report, then save it if you need a copy." />

      <Kicker>1. What do you want to see?</Kicker>
      <View style={styles.choices}>
        {REPORTS.map((item) => (
          <Chip key={item.id} label={item.label} selected={kind === item.id} onPress={() => setKind(item.id)} />
        ))}
      </View>
      <Text style={styles.help}>{help}</Text>

      <Kicker>2. Which dates?</Kicker>
      <View style={styles.choices}>
        <Chip label="All dates" selected={range === 'all'} onPress={() => pickRange('all')} />
        <Chip label="Today" selected={range === 'today'} onPress={() => pickRange('today')} />
        <Chip label="This month" selected={range === 'month'} onPress={() => pickRange('month')} />
      </View>
      <Field
        label="Start date"
        value={from}
        onChangeText={(value) => {
          setRange('custom');
          setFrom(value.trim());
        }}
        placeholder="2026-11-01"
        hint="Optional. Year-month-day, like 2026-11-01. Leave blank to start from the oldest visit."
      />
      <Field
        label="End date"
        value={to}
        onChangeText={(value) => {
          setRange('custom');
          setTo(value.trim());
        }}
        placeholder="2026-11-30"
        hint="Optional. Leave blank to include today and later visits."
      />
      {!fromOk || !toOk ? <Text style={styles.warn}>Those dates need to look like 2026-11-06.</Text> : null}

      <Kicker>3. Narrow it down</Kicker>
      <Text style={styles.help}>Leave these on Everyone and Every service unless you want one person or one massage.</Text>
      <Text style={styles.label}>Therapist</Text>
      <View style={styles.choices}>
        <Chip label="Everyone" selected={therapistId === 'all'} onPress={() => setTherapistId('all')} />
        {therapists.map((therapist) => (
          <Chip
            key={therapist.id}
            label={therapist.name}
            selected={therapistId === therapist.id}
            onPress={() => setTherapistId(therapist.id)}
          />
        ))}
      </View>
      <Text style={styles.label}>Service</Text>
      <View style={styles.choices}>
        <Chip label="Every service" selected={treatmentId === 'all'} onPress={() => setTreatmentId('all')} />
        {treatments.map((treatment) => (
          <Chip
            key={treatment.id}
            label={treatment.name}
            selected={treatmentId === treatment.id}
            onPress={() => setTreatmentId(treatment.id)}
          />
        ))}
      </View>

      <Kicker>Results</Kicker>
      <Text style={styles.summary}>
        {rows.length === 1 ? '1 visit' : `${rows.length} visits`} · Money paid {peso(total)}
      </Text>
      {rows.length === 0 ? (
        <Text style={styles.help}>Nothing matches. Try All dates, Everyone, and Every service.</Text>
      ) : null}
      {rows.slice(0, 30).map((booking) => {
        const who = names(booking, therapists, treatments);
        return (
          <Card key={booking.id}>
            <Text style={styles.name}>{booking.customerName}</Text>
            <Text style={styles.meta}>
              {friendlyDate(booking.date)} at {booking.time}
            </Text>
            <Text style={styles.meta}>
              {who.therapist || 'No therapist'} · {who.treatment}
            </Text>
            <Text style={styles.meta}>
              {STATUS[booking.status]} · {peso(booking.amountPaid)}
            </Text>
          </Card>
        );
      })}
      {rows.length > 30 ? <Text style={styles.help}>The screen shows 30 visits. Save the file to get the full list.</Text> : null}

      <Button label="Save as PDF" onPress={() => void share('pdf')} />
      <Button label="Save for Excel" variant="secondary" onPress={() => void share('excel')} />
      <Text style={styles.help}>PDF is easy to print. The Excel file opens in Excel or Google Sheets.</Text>
    </Screen>
  );
}

function names(booking: Booking, therapists: { id: string; name: string }[], treatments: { id: string; name: string }[]) {
  return {
    therapist: therapists.find((item) => item.id === booking.therapistId)?.name ?? '',
    treatment: treatments.find((item) => item.id === booking.treatmentId)?.name ?? 'Service',
  };
}

function plainLine(booking: Booking, therapists: { id: string; name: string }[], treatments: { id: string; name: string }[]) {
  const who = names(booking, therapists, treatments);
  return `${friendlyDate(booking.date)} ${booking.time} ${booking.customerName}, ${who.therapist}, ${who.treatment}, ${STATUS[booking.status]}`;
}

function csvFor(booking: Booking, therapists: { id: string; name: string }[], treatments: { id: string; name: string }[]) {
  const who = names(booking, therapists, treatments);
  const cells = [
    booking.customerName,
    who.therapist,
    who.treatment,
    booking.date,
    booking.time,
    STATUS[booking.status],
    String(booking.amountPaid),
  ];
  return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',');
}

function friendlyDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[month - 1]} ${year}`;
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  help: { color: palette.muted, lineHeight: 20 },
  warn: { color: palette.clay, lineHeight: 20 },
  label: { color: palette.ink, fontWeight: '700' },
  summary: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  name: { color: palette.ink, fontWeight: '700', fontSize: 16 },
  meta: { color: palette.muted, marginTop: 2 },
});

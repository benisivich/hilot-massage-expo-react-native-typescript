import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button, Card, Empty, Kicker, Line, PageTitle, Screen, Stat } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { getTreatment } from '@/data/catalog';
import { useApp } from '@/context/store';
import { exportCsv } from '@/lib/export-csv';
import { peso, thisWeekLabel, toISODate } from '@/lib/format';
import { STATUS_LABEL } from '@/lib/labels';
import { reportCsv } from '@/lib/report-csv';
import { buildReport, PLATFORM_FEE_PERCENT, therapistNet } from '@/lib/rules';

export default function ReportsScreen() {
  const { bookings, activeTherapist } = useApp();
  const [exporting, setExporting] = useState(false);
  if (!activeTherapist) {
    return (
      <Screen tab>
        <PageTitle title="Reports" />
      </Screen>
    );
  }
  const report = buildReport(bookings, activeTherapist.id, (id) => getTreatment(id)?.name ?? 'Session');
  const maxGross = Math.max(...report.byTreatment.map((item) => item.gross), 1);
  const mine = bookings
    .filter((booking) => booking.therapistId === activeTherapist.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const exportReport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const csv = reportCsv({ therapistName: activeTherapist.name || 'Therapist', bookings: mine, report });
      await exportCsv(`hilotcare-report-${toISODate(new Date())}.csv`, csv);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The report could not be exported.';
      Alert.alert('Export failed', message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen tab>
      <PageTitle title="Reports" subtitle={`${thisWeekLabel()}. Clients pay the session price. Hilotcare keeps ${PLATFORM_FEE_PERCENT}%.`} />
      <Button
        label={exporting ? 'Preparing the file…' : 'Export report to CSV'}
        variant="secondary"
        disabled={exporting}
        onPress={() => {
          void exportReport();
        }}
      />
      <Card>
        <Kicker>Net this week</Kicker>
        <Text style={{ fontFamily: font.serif, fontSize: 40, color: palette.ink }}>{peso(report.weekNet)}</Text>
        <Line label="Gross" value={peso(report.weekGross)} />
        <Line label="Hilotcare fee" value={peso(report.weekFee)} />
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="All-time net" value={peso(report.allNet)} />
        <Stat label="Confirmed" value={String(report.completedCount)} />
        <Stat label="Kept fees" value={peso(report.keptFees)} />
      </View>
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        Kept fees are reservation amounts from cancellations inside 3 hours of the start time.
      </Text>
      <Kicker>This week’s confirmed sessions</Kicker>
      {report.weekBookings.length === 0 ? <Empty title="No confirmed session this week yet." /> : null}
      {report.weekBookings.map((booking) => (
        <Line
          key={booking.id}
          label={`${booking.customerName} · ${getTreatment(booking.treatmentId)?.name ?? 'Session'}`}
          value={peso(therapistNet(booking.amountPaid))}
        />
      ))}
      <Kicker>Appointments</Kicker>
      <Card>
        {report.byStatus.map((item) => (
          <Line key={item.status} label={STATUS_LABEL[item.status]} value={String(item.count)} />
        ))}
      </Card>
      <Kicker>Services</Kicker>
      {report.byTreatment.length === 0 ? <Empty title="Service totals appear after you confirm a visit." /> : null}
      {report.byTreatment.map((item) => (
        <View key={item.name} style={{ gap: 6 }}>
          <Line label={`${item.name} · ${item.count}`} value={peso(item.gross)} />
          <View style={{ height: 8, borderRadius: 4, backgroundColor: palette.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(8, Math.round((item.gross / maxGross) * 100))}%`, height: 8, backgroundColor: palette.palm }} />
          </View>
        </View>
      ))}
      <Text style={{ color: palette.muted, lineHeight: 20 }}>
        {report.upcoming} visits are still open. Earnings above include every client on this desk, not only the signed-in customer.
      </Text>
    </Screen>
  );
}

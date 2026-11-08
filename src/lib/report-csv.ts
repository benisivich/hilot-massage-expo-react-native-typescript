import { formatDate, formatTime, thisWeekLabel, toISODate } from '@/lib/format';
import { MODE_LABEL, PAYMENT_LABEL, STATUS_LABEL } from '@/lib/labels';
import { buildReport, PLATFORM_FEE_PERCENT, therapistNet } from '@/lib/rules';
import { getTreatment } from '@/data/catalog';
import type { Booking } from '@/types/domain';

function cell(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function row(values: (string | number)[]) {
  return values.map(cell).join(',');
}

type Report = ReturnType<typeof buildReport>;

export function reportCsv(input: { therapistName: string; bookings: Booking[]; report: Report }) {
  const lines = [
    row(['Hilotcare report']),
    row(['Therapist', input.therapistName]),
    row(['Week', thisWeekLabel()]),
    row(['Exported', toISODate(new Date())]),
    row(['Hilotcare fee percent', PLATFORM_FEE_PERCENT]),
    '',
    row(['Summary']),
    row(['Metric', 'Amount PHP']),
    row(['Gross this week', input.report.weekGross]),
    row(['Hilotcare fee this week', input.report.weekFee]),
    row(['Net this week', input.report.weekNet]),
    row(['All-time net', input.report.allNet]),
    row(['Confirmed sessions', input.report.completedCount]),
    row(['Kept fees', input.report.keptFees]),
    row(['Open visits', input.report.upcoming]),
    '',
    row(['Appointments']),
    row(['Status', 'Count']),
    ...input.report.byStatus.map((item) => row([STATUS_LABEL[item.status], item.count])),
    '',
    row(['Services']),
    row(['Service', 'Sessions', 'Gross PHP']),
    ...input.report.byTreatment.map((item) => row([item.name, item.count, item.gross])),
    '',
    row(['Visits']),
    row(['Date', 'Time', 'Client', 'Service', 'Place', 'Status', 'Payment', 'Amount paid PHP', 'Therapist net PHP']),
    ...input.bookings.map((booking) =>
      row([
        formatDate(booking.date),
        formatTime(booking.time),
        booking.customerName,
        getTreatment(booking.treatmentId)?.name ?? 'Session',
        `${MODE_LABEL[booking.mode]} · ${booking.barangay ? `${booking.barangay}, ` : ''}${booking.city}`,
        STATUS_LABEL[booking.status],
        PAYMENT_LABEL[booking.paymentStatus],
        booking.amountPaid,
        therapistNet(booking.amountPaid),
      ]),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\n`;
}

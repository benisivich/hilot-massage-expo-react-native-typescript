import { Text, View } from 'react-native';

import { Pill } from '@/components/ui';
import { palette } from '@/constants/theme';
import { STATUS_LABEL } from '@/lib/labels';
import type { Booking, SessionStatus } from '@/types/domain';

const FLOW: SessionStatus[] = ['assigned', 'confirmed', 'in_session', 'completed'];

export function StatusPill({ status }: { status: SessionStatus }) {
  const tone =
    status === 'cancelled' ? 'bad' : status === 'assigned' ? 'warn' : status === 'confirmed' || status === 'in_session' || status === 'completed' ? 'good' : 'neutral';
  return <Pill label={STATUS_LABEL[status]} tone={tone} />;
}

export function Timeline({ booking }: { booking: Booking }) {
  if (booking.status === 'cancelled') {
    return (
      <Text style={{ color: palette.clay, fontSize: 15, lineHeight: 21 }}>
        {booking.cancelNote ?? 'This visit was cancelled.'}
      </Text>
    );
  }
  const current = FLOW.indexOf(booking.status);
  return (
    <View>
      {FLOW.map((status, index) => {
        const done = index <= current;
        const active = index === current;
        return (
          <View key={status} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 16, alignItems: 'center' }}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: done ? palette.palm : palette.line,
                  borderWidth: active ? 2 : 0,
                  borderColor: palette.gold,
                }}
              />
              {index < FLOW.length - 1 ? (
                <View style={{ width: 2, height: 18, backgroundColor: index < current ? palette.palm : palette.line }} />
              ) : null}
            </View>
            <Text
              style={{
                flex: 1,
                paddingBottom: 8,
                color: done ? palette.ink : palette.muted,
                fontWeight: active ? '700' : '500',
              }}>
              {STATUS_LABEL[status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function CheckInCode({ code }: { code: string }) {
  return (
    <View accessibilityLabel={`Check-in code ${code.split('').join(' ')}`} style={{ flexDirection: 'row', gap: 8 }}>
      {code.split('').map((digit, index) => (
        <View
          key={`${digit}-${index}`}
          style={{
            width: 56,
            height: 68,
            borderRadius: 14,
            backgroundColor: palette.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ color: palette.cream, fontSize: 28, fontWeight: '700' }}>{digit}</Text>
        </View>
      ))}
    </View>
  );
}

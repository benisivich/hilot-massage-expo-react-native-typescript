import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { getTreatment } from '@/data/catalog';
import { formatDate, formatTime, peso } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Booking, Role } from '@/types/domain';

export type BookingNotice = 'created' | 'confirmed' | 'payment_received' | 'cancelled' | 'completed';

const handled = new Set<string>();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function inExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

function noticeCopy(booking: Booking, event: BookingNotice) {
  const treatment = getTreatment(booking.treatmentId)?.name ?? 'session';
  const when = `${formatDate(booking.date)} at ${formatTime(booking.time)}`;
  if (event === 'created') {
    return { title: 'New booking', body: `${booking.customerName} booked ${treatment} for ${when}.` };
  }
  if (event === 'confirmed') {
    return { title: 'Booking confirmed', body: `Your ${treatment} on ${when} is confirmed.` };
  }
  if (event === 'payment_received') {
    return { title: 'Payment received', body: `${booking.customerName} paid ${peso(booking.amountPaid)} for ${treatment} on ${when}.` };
  }
  if (event === 'completed') {
    return { title: 'Session finished', body: `The ${treatment} on ${when} is finished.` };
  }
  return {
    title: 'Booking cancelled',
    body: booking.cancelNote?.trim() || `The ${treatment} on ${when} was cancelled.`,
  };
}

function noticesFor(before: Booking | undefined, booking: Booking): BookingNotice[] {
  const notices: BookingNotice[] = [];
  if (!before && booking.status === 'assigned') notices.push('created');
  else if (before && before.status !== booking.status) {
    if (booking.status === 'confirmed') notices.push('confirmed');
    if (booking.status === 'cancelled') notices.push('cancelled');
    if (booking.status === 'completed') notices.push('completed');
  }
  const becamePaid = booking.paymentStatus === 'paid' && (!before || before.paymentStatus !== 'paid');
  if (becamePaid && booking.status !== 'cancelled') notices.push('payment_received');
  return notices;
}

async function showLocal(title: string, body: string) {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
  if (granted.status !== 'granted') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking updates',
      importance: AndroidImportance.MAX,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: 'bookings' } : {}),
    },
    trigger: null,
  });
}

async function sendExpoPush(token: string, title: string, body: string) {
  if (!token.startsWith('ExponentPushToken')) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: 'default',
      channelId: 'bookings',
    }),
  });
}

export function rememberBooking(id: string, event: BookingNotice) {
  handled.add(`${id}:${event}`);
}

export async function registerPushToken(role: Role, userId: string) {
  if (Platform.OS === 'web') return;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('bookings', {
        name: 'Booking updates',
        importance: AndroidImportance.MAX,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
    if (granted.status !== 'granted') return;
    if (inExpoGo()) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const table = role === 'customer' ? 'customers' : 'therapists';
    await supabase.from(table).update({ push_token: token }).eq('id', userId);
  } catch {
    // Permission, Expo Go, or a missing column should not block sign-in.
  }
}

async function sendBookingEmail(booking: Booking, event: BookingNotice) {
  await supabase.functions.invoke('booking-email', {
    body: { bookingId: booking.id, event },
  });
}

export async function notifyBooking(booking: Booking, event: BookingNotice) {
  const copy = noticeCopy(booking, event);
  try {
    await showLocal(copy.title, copy.body);
  } catch {
    // A missed banner does not undo the booking.
  }
  try {
    const { data, error } = await supabase.rpc('other_push_token', { target_booking: booking.id });
    if (!error && typeof data === 'string' && data) await sendExpoPush(data, copy.title, copy.body);
  } catch {
    // The other open phone still gets a local alert from its own refresh.
  }
  try {
    await sendBookingEmail(booking, event);
  } catch {
    // Email is sent by the clinic mailbox. A missing sender does not undo the booking.
  }
}

export async function watchBookingChanges(role: Role, userId: string, previous: Booking[], next: Booking[]) {
  if (!inExpoGo()) return;
  for (const booking of next) {
    const mine = role === 'customer' ? booking.customerId === userId : booking.therapistId === userId;
    if (!mine) continue;
    const events = noticesFor(
      previous.find((item) => item.id === booking.id),
      booking,
    );
    for (const event of events) {
      const key = `${booking.id}:${event}`;
      if (handled.has(key)) {
        handled.delete(key);
        continue;
      }
      const copy = noticeCopy(booking, event);
      await showLocal(copy.title, copy.body);
    }
  }
}

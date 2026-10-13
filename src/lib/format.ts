export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function peso(amount: number) {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString();
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₱${withCommas}`;
}

export function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(offset: number, from = new Date()) {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

export function upcomingDates(count = 7) {
  return Array.from({ length: count }, (_, index) => addDays(index));
}

export function weekdayIndex(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function sessionDate(booking: { date: string; time: string }) {
  const [year, month, day] = booking.date.split('-').map(Number);
  const [hour, minute] = booking.time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function isPastSlot(date: string, time: string) {
  return sessionDate({ date, time }).getTime() <= Date.now();
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[month - 1]} ${day}`;
}

export function formatTime(time: string) {
  const [hourValue, minuteValue] = time.split(':').map(Number);
  const suffix = hourValue >= 12 ? 'PM' : 'AM';
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, '0')} ${suffix}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = hours === 1 ? '1 hour' : `${hours} hours`;
  if (rest === 0) return hourLabel;
  return `${hourLabel} ${rest} min`;
}

export function formatMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function startOfWeek(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

export function inThisWeek(iso: string) {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const [year, month, day] = iso.split('-').map(Number);
  const current = new Date(year, month - 1, day, 12);
  return current >= start && current < end;
}

export function thisWeekLabel() {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatDate(toISODate(start))} – ${formatDate(toISODate(end))}`;
}

export function isValidFutureDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  date.setHours(23, 59, 59, 0);
  return date.getTime() >= Date.now();
}

export function isFutureExpiry(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1).getTime() > Date.now();
}

export function durationSpan(options: number[]) {
  const shortest = Math.min(...options);
  const longest = Math.max(...options);
  if (shortest === longest) return formatDuration(shortest);
  return `${formatDuration(shortest)}–${formatDuration(longest)}`;
}

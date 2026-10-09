/**
 * Date and Timezone Utilities for QueueLess India.
 * All daily counters and token sequences rollover at IST midnight (UTC+05:30).
 */

export function getIstDateString(date: Date = new Date()): string {
  // Asia/Kolkata is UTC+05:30. en-CA returns YYYY-MM-DD format.
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getIstDateMidnight(date: Date = new Date()): Date {
  const istString = getIstDateString(date);
  return new Date(`${istString}T00:00:00.000Z`);
}

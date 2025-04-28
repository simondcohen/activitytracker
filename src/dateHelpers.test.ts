import { 
  toISO, 
  toLocal, 
  formatClock, 
  formatRange, 
  isSameDay, 
  getTodayISO,
  formatForDateTimeInput,
  parseFromDateTimeInput,
  calculateDuration
} from './dateHelpers';
import { format } from 'date-fns';

describe('dateHelpers', () => {
  describe('toISO', () => {
    test('converts Date object to ISO string in UTC', () => {
      const date = new Date('2023-06-15T14:30:00');
      const result = toISO(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    test('converts time string to ISO string', () => {
      const result = toISO('14:30');
      // Should be today with the specified time, in UTC
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    test('converts timestamp to ISO string', () => {
      const timestamp = 1686842056000; // 2023-06-15T14:27:36.000Z
      const result = toISO(timestamp);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe('toLocal', () => {
    test('converts ISO string to local Date object', () => {
      const isoString = '2023-06-15T14:30:00Z';
      const result = toLocal(isoString);
      expect(result).toBeInstanceOf(Date);
    });

    test('returns current date for invalid input', () => {
      const result = toLocal('invalid');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('formatClock', () => {
    test('formats ISO string as HH:MM in local time', () => {
      const isoString = '2023-06-15T14:30:00Z';
      const result = formatClock(isoString);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    test('returns "Invalid Time" for invalid input', () => {
      const result = formatClock('invalid');
      expect(result).toBe('Invalid Time');
    });
  });

  describe('formatRange', () => {
    test('formats time range as "HH:MM – HH:MM" in local time', () => {
      const startIso = '2023-06-15T14:30:00Z';
      const endIso = '2023-06-15T15:45:00Z';
      const result = formatRange(startIso, endIso);
      expect(result).toMatch(/^\d{2}:\d{2} – \d{2}:\d{2}$/);
    });

    test('returns "Invalid Time Range" for invalid input', () => {
      const result = formatRange('invalid', '2023-06-15T15:45:00Z');
      expect(result).toBe('Invalid Time Range');
    });
  });

  describe('isSameDay', () => {
    test('returns true for ISO strings on the same local calendar day', () => {
      const aIso = '2023-06-15T14:30:00Z';
      const bIso = '2023-06-15T23:45:00Z';
      const result = isSameDay(aIso, bIso);
      expect(result).toBe(true);
    });

    test('returns false for ISO strings on different local calendar days', () => {
      // These are on different days in local time
      const aIso = '2023-06-15T14:30:00Z';
      const bIso = '2023-06-16T14:30:00Z';
      const result = isSameDay(aIso, bIso);
      expect(result).toBe(false);
    });
  });

  describe('getTodayISO', () => {
    test('returns current date in ISO format (UTC)', () => {
      const result = getTodayISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe('formatForDateTimeInput', () => {
    test('formats ISO string for datetime-local input', () => {
      const isoString = '2023-06-15T14:30:00Z';
      const result = formatForDateTimeInput(isoString);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });
  });

  describe('parseFromDateTimeInput', () => {
    test('parses datetime-local input value to ISO string', () => {
      const inputValue = '2023-06-15T14:30';
      const result = parseFromDateTimeInput(inputValue);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    test('throws error for invalid input', () => {
      expect(() => {
        parseFromDateTimeInput('invalid');
      }).toThrow();
    });
  });

  describe('calculateDuration', () => {
    test('calculates duration between two ISO strings in seconds', () => {
      const startIso = '2023-06-15T14:30:00Z';
      const endIso = '2023-06-15T15:30:00Z';
      const result = calculateDuration(startIso, endIso);
      expect(result).toBe(3600); // 1 hour = 3600 seconds
    });

    test('returns 0 for invalid input', () => {
      const result = calculateDuration('invalid', '2023-06-15T15:30:00Z');
      expect(result).toBe(0);
    });

    test('returns 0 for end time before start time', () => {
      const startIso = '2023-06-15T15:30:00Z';
      const endIso = '2023-06-15T14:30:00Z';
      const result = calculateDuration(startIso, endIso);
      expect(result).toBe(0);
    });
  });
}); 
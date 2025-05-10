import { format, parseISO, isValid, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

/**
 * Converts any date representation to an ISO string in UTC
 */
export const toISO = (date: Date | number | string): string => {
  let parsedDate: Date;

  if (typeof date === 'string') {
    // Handle HH:MM format
    if (/^\d{1,2}:\d{2}$/.test(date)) {
      const [hours, minutes] = date.split(':').map(Number);
      const now = new Date();
      parsedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    } else {
      parsedDate = new Date(date);
    }
  } else if (typeof date === 'number') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }

  if (!isValid(parsedDate)) {
    console.warn('Invalid date:', date);
    return formatISO(new Date());
  }

  return formatISO(parsedDate, { representation: 'complete' });
};

/**
 * Converts an ISO string to a Date object in local time
 */
export const toLocal = (iso: string): Date => {
  if (!iso) return new Date();
  
  try {
    const date = parseISO(iso);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return utcToZonedTime(date, timeZone);
  } catch (error) {
    console.warn('Error parsing date:', error);
    return new Date();
  }
};

/**
 * Formats an ISO string as HH:MM in local time
 */
export const formatClock = (iso: string): string => {
  try {
    const localDate = toLocal(iso);
    return format(localDate, 'HH:mm');
  } catch (error) {
    console.warn('Error formatting clock time:', error);
    return 'Invalid Time';
  }
};

/**
 * Formats a time range as "HH:MM – HH:MM" in local time
 */
export const formatRange = (startIso: string, endIso: string): string => {
  if (!startIso || !endIso) {
    return 'Invalid Time Range';
  }

  try {
    return `${formatClock(startIso)} – ${formatClock(endIso)}`;
  } catch (error) {
    console.warn('Error formatting time range:', error);
    return 'Invalid Time Range';
  }
};

/**
 * Checks if two ISO strings represent the same local calendar day,
 * with days starting at 4am instead of midnight.
 * 
 * For example, 2023-05-08T03:00:00 is considered part of the "day" of 2023-05-07,
 * because it's after midnight but before 4am.
 */
export const isSameDay = (aIso: string, bIso: string): boolean => {
  try {
    const aLocal = toLocal(aIso);
    const bLocal = toLocal(bIso);
    
    // Adjust dates if time is between midnight and 4am
    // These times belong to the previous calendar day for grouping purposes
    const adjustDate = (date: Date): Date => {
      const hours = date.getHours();
      const isAfterMidnightBeforeFourAM = hours >= 0 && hours < 4;
      
      if (isAfterMidnightBeforeFourAM) {
        // Create a new date that's 1 day earlier to represent the "display day"
        const adjustedDate = new Date(date);
        adjustedDate.setDate(adjustedDate.getDate() - 1);
        return adjustedDate;
      }
      
      return date;
    };
    
    // Apply the adjustment to both dates
    const adjustedA = adjustDate(aLocal);
    const adjustedB = adjustDate(bLocal);
    
    // Compare the adjusted dates
    return (
      adjustedA.getFullYear() === adjustedB.getFullYear() &&
      adjustedA.getMonth() === adjustedB.getMonth() &&
      adjustedA.getDate() === adjustedB.getDate()
    );
  } catch (error) {
    console.warn('Error comparing dates:', error);
    return false;
  }
};

/**
 * Gets today's date in ISO format (UTC), accounting for 4am day boundary
 * If current time is between midnight and 4am, returns previous calendar day
 */
export const getTodayISO = (): string => {
  const now = new Date();
  const hours = now.getHours();
  
  // If it's after midnight but before 4am, consider it the previous day
  // for display and grouping purposes
  if (hours >= 0 && hours < 4) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return toISO(yesterday);
  }
  
  return toISO(now);
};

/**
 * Formats a date for datetime-local input
 */
export const formatForDateTimeInput = (iso: string): string => {
  try {
    const localDate = toLocal(iso);
    return format(localDate, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.warn('Error formatting for datetime input:', error);
    return format(new Date(), "yyyy-MM-dd'T'HH:mm");
  }
};

/**
 * Parse a datetime-local input value to ISO string in UTC
 */
export const parseFromDateTimeInput = (inputValue: string): string => {
  try {
    const localDate = new Date(inputValue);
    if (!isValid(localDate)) {
      throw new Error('Invalid date input');
    }
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const utcDate = zonedTimeToUtc(localDate, timeZone);
    return formatISO(utcDate);
  } catch (error) {
    console.warn('Error parsing from datetime input:', error);
    throw error;
  }
};

/**
 * Calculate duration between two ISO strings in seconds
 */
export const calculateDuration = (startIso: string, endIso: string): number => {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    return duration >= 0 ? duration : 0;
  } catch (error) {
    console.warn('Error calculating duration:', error);
    return 0;
  }
}; 
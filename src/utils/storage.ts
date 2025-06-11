import { Activity } from '../types';

export function withActivitiesAtomic(fn: (activities: Activity[]) => Activity[]): void {
  const KEY = 'activities';
  const REV_KEY = 'activitiesRevision';
  for (let i = 0; i < 5; i++) {
    let data: Activity[] = [];
    let rev = 0;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) data = JSON.parse(saved) || [];
    } catch {
      // ignore
    }
    try {
      rev = parseInt(localStorage.getItem(REV_KEY) || '0', 10);
    } catch {
      // ignore
    }
    const updated = fn([...data]);
    try {
      localStorage.setItem(KEY, JSON.stringify(updated));
      localStorage.setItem(REV_KEY, String(rev + 1));
    } catch {
      // ignore
    }
    const verify = parseInt(localStorage.getItem(REV_KEY) || '0', 10);
    if (verify === rev + 1) return;
  }
}

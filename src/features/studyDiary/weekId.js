// Stable week identifiers, e.g. "2026-W24" (ISO-8601 week).
// We key a reference Date to the Monday of its week and derive everything else.

export function mondayOf(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function shiftWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

// ISO week-numbering year + week number for a date.
function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
  return { year: d.getUTCFullYear(), week };
}

export function weekIdFromDate(date) {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function currentWeekId() {
  return weekIdFromDate(new Date());
}

// Human label like "2026/06/08 〜 06/14".
export function weekRangeLabel(date) {
  const mon = mondayOf(date);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const fmt = (d, withYear) =>
    (withYear ? d.getFullYear() + "/" : "") +
    String(d.getMonth() + 1).padStart(2, "0") + "/" +
    String(d.getDate()).padStart(2, "0");
  return `${fmt(mon, true)} 〜 ${fmt(sun, false)}`;
}

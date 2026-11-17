// Keep in sync with the table in index.html and the JSON-LD.
// Day index: 0 = Sunday. Times are decimal hours, Europe/London; a close past 24 runs into the next day.
export const HOURS = {
  0: [17, 22],
  1: [18, 22],
  2: null,
  3: null,
  4: [17, 23],
  5: [17, 24],
  6: [17, 24],
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmt = h => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  const suffix = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${suffix}`;
};

function londonNow() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t)?.value;
  return { day: DAYS.indexOf(get('weekday')), time: (Number(get('hour')) % 24) + Number(get('minute')) / 60 };
}

export function status() {
  const { day, time } = londonNow();
  const today = HOURS[day];
  const yesterday = HOURS[(day + 6) % 7];
  // still open from last night?
  if (yesterday && yesterday[1] > 24 && time < yesterday[1] - 24) return { open: true, day, short: `Open now, til ${fmt(yesterday[1])}` };
  if (today && time >= today[0] && time < today[1]) return { open: true, day, short: `Open now, til ${fmt(today[1])}` };
  if (today && time < today[0]) return { open: false, day, short: `Closed. Open ${fmt(today[0])}` };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (HOURS[d]) return { open: false, day, short: `Closed. Back ${i === 1 ? 'tomorrow' : DAYS[d]} ${fmt(HOURS[d][0])}` };
  }
  return { open: false, day, short: 'Closed' };
}

export function initHours() {
  const s = status();
  document.documentElement.classList.add(s.open ? 'is-open-now' : 'is-closed-now');
  document.querySelectorAll('[data-status]').forEach(el => (el.textContent = s.short));
  document.querySelectorAll('[data-status-long]').forEach(el => (el.textContent = s.short));
  document.querySelector(`.hours tr[data-day="${s.day}"]`)?.classList.add('is-today');
  document.querySelectorAll('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
}

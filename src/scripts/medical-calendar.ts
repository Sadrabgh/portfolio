import { doctors } from "../data/brands";
export type Appointment = {
  id: string;
  doctor: string;
  date: string;
  time: string;
  status: "booked" | "cancelled";
};
const zone = "Asia/Tehran";
export const appointmentKey = "neva-demo-appointments-v10";
export function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((x) => x.type === "year")!.value}-${parts.find((x) => x.type === "month")!.value}-${parts.find((x) => x.type === "day")!.value}`;
}
export function dayISO(offset: number) {
  const date = new Date(`${todayISO()}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function persianDate(iso: string, style: "short" | "full" = "full") {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: zone,
    weekday: style === "full" ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: style === "full" ? "numeric" : undefined,
  }).format(new Date(`${iso}T12:00:00Z`));
}
export function weekday(iso: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: zone,
    weekday: "short",
  }).format(new Date(`${iso}T12:00:00Z`));
}
export function persianDay(iso: string) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: zone,
    day: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`));
}
export function persianTime(time: string) {
  return time.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
export function readAppointments(): Appointment[] {
  try {
    const rows = JSON.parse(localStorage.getItem(appointmentKey) || "[]");
    if (!Array.isArray(rows)) return [];
    return rows
      .filter(
        (a) =>
          a &&
          typeof a.id === "string" &&
          /^[A-Za-z0-9-]{1,64}$/.test(a.id) &&
          doctors.some((d) => d.id === a.doctor) &&
          typeof a.date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(a.date) &&
          !isNaN(Date.parse(`${a.date}T12:00:00Z`)) &&
          typeof a.time === "string" &&
          /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) &&
          (a.status === "booked" || a.status === "cancelled"),
      )
      .slice(-100)
      .map((a) => ({
        id: a.id,
        doctor: a.doctor,
        date: a.date,
        time: a.time,
        status: a.status,
      }));
  } catch {
    return [];
  }
}
export function writeAppointments(rows: Appointment[]) {
  try {
    localStorage.setItem(appointmentKey, JSON.stringify(rows.slice(-100)));
    return true;
  } catch {
    return false;
  }
}
export function availableSlots(id: string, date: string, ignoreId = "") {
  const doctor = doctors.find((d) => d.id === id);
  if (!doctor || date < todayISO() || date > dayISO(20)) return [];
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (
    dow === 5 ||
    (id === "dental" && dow === 0) ||
    (id === "skin" && dow === 2)
  )
    return [];
  let hash = 0;
  for (const char of `${id}${date}`) hash += char.charCodeAt(0);
  const booked = readAppointments().filter(
    (a) =>
      a.id !== ignoreId &&
      a.status === "booked" &&
      a.doctor === id &&
      a.date === date,
  );
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const nowMinutes =
    Number(timeParts.find((p) => p.type === "hour")!.value) * 60 +
    Number(timeParts.find((p) => p.type === "minute")!.value);
  const slots: string[] = [];
  for (let i = 0; i < 10; i++) {
    if ((i + hash) % 5 === 0) continue;
    const minute = 9 * 60 + i * doctor.duration;
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (date === todayISO() && minute <= nowMinutes + 10) continue;
    if (!booked.some((a) => a.time === time)) slots.push(time);
  }
  return slots;
}
export function nearestSlot(id: string, ignoreId = "") {
  for (let offset = 0; offset < 21; offset++) {
    const date = dayISO(offset);
    const slots = availableSlots(id, date, ignoreId);
    if (slots.length) return { date, time: slots[0] };
  }
  return;
}
export function isUpcoming(a: Appointment) {
  if (a.date > todayISO()) return true;
  if (a.date < todayISO()) return false;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return a.time > time;
}

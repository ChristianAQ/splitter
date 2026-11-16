import { addDays, addMonthsClamped, daysInMonth, formatISO, parseISO } from "../domain/date";

/** One-tap deadlines offered wherever something can be due "whenever" or on
 * a date. An empty value means no deadline. */
export function duePresets(today: string): { label: string; value: string }[] {
  const now = parseISO(today);
  const endOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), daysInMonth(now.getUTCFullYear(), now.getUTCMonth()))
  );
  return [
    { label: "Cuando se pueda", value: "" },
    { label: "En una semana", value: formatISO(addDays(now, 7)) },
    { label: "Fin de mes", value: formatISO(endOfMonth) },
    { label: "El mes que viene", value: formatISO(addMonthsClamped(now, 1, now.getUTCDate())) },
  ];
}

import type { LucideIcon } from "lucide-react";

// Core domain types, shared between the Firestore data layer, the pure
// calculation modules in `domain/`, and the UI.
//
// Firestore documents mirror these shapes closely; timestamps are stored as
// Firestore Timestamps server-side and converted to epoch millis (`number`)
// at the service boundary so the rest of the app never touches the SDK's
// Timestamp class directly.

export type ISODate = string; // "YYYY-MM-DD" — always calendar-local, no time component.
export type EpochMillis = number;

export type Currency = "EUR" | "USD" | "GBP";

export const CURRENCIES: Currency[] = ["EUR", "USD", "GBP"];

export const DEFAULT_CATEGORIES = [
  "alimentacion",
  "transporte",
  "vivienda",
  "ocio",
  "compras",
  "viajes",
  "salud",
  "suscripciones",
  "otros",
] as const;

export type DefaultCategoryId = (typeof DEFAULT_CATEGORIES)[number];

export interface Category {
  id: string; // one of DEFAULT_CATEGORIES, or a custom id for user-defined categories
  label: string;
  icon: LucideIcon;
  color: string; // identifying color, shown consistently in the category picker, expense lists and stats
  custom?: boolean;
}

export type RecurringPeriodicity = "weekly" | "monthly" | "yearly";

export type ExpenseStatus = "future" | "pending" | "done" | "cancelled";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** A hex color assignable to a user; kept in a fixed palette so contrast against
 * light/dark backgrounds and text is guaranteed (see lib/userColors.ts). */
export type UserColor = string;

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  color: UserColor;
  currency: Currency;
  theme: "light" | "dark" | "system";
  // The app's global accent color (buttons, active tabs...) — one of
  // ACCENT_COLOR_PALETTE's hex values (lib/accentColors.ts). Absent for
  // accounts created before this setting existed, which default to Índigo.
  accentColor?: string;
  // A small square JPEG, uploaded from the device and resized client-side
  // (see lib/imageResize.ts), stored inline as a data: URL rather than in
  // Firebase Storage — this app is Spark-plan-only by design (see
  // firestore.rules' top comment), and Storage now requires Blaze for a new
  // bucket. Absent means "show initials on the color swatch" (see Avatar).
  photoUrl?: string;
  // The accounts fixed expenses are paid from, each with its own color —
  // see Bank below. Kept on the profile (not a subcollection) so no new
  // security rule is needed.
  banks?: Bank[];
  // Groups this user has put away for themselves ("Archivar para mí") —
  // unlike Group.archivedAt, which the admin sets and closes the group for
  // everyone, this only moves the group out of *my* active lists and can be
  // undone at any time.
  archivedGroupIds?: string[];
  createdAt: EpochMillis;
}

/** A bank/account the user pays fixed expenses from. Purely a label with a
 * color, for telling them apart at a glance and totalling per bank. */
export interface Bank {
  id: string;
  name: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

/** A denormalized snapshot of another user, kept in `users/{uid}/friends/`.
 * Added mutually (both sides get an entry) the moment one of them enters
 * the other's friend code — see services/friends.service.ts. */
export interface Friend {
  uid: string;
  name: string;
  color: UserColor;
  photoUrl?: string;
  addedAt: EpochMillis;
}

// ---------------------------------------------------------------------------
// Personal expenses
// ---------------------------------------------------------------------------

export interface PersonalExpense {
  id: string;
  ownerId: string;
  amount: number; // always positive, smallest currency unit handled by lib/money.ts
  currency: Currency;
  description: string;
  categoryId: string;
  date: ISODate; // date the expense occurred / is due
  status: Extract<ExpenseStatus, "future" | "pending" | "done">;
  notes?: string;
  recurringSourceId?: string; // set if generated from a RecurringExpense
  // --- Upcoming expenses paid in parts ("Próximos") ---
  // An upcoming expense with no deadline ("cuando pueda"). `date` still
  // holds a value (when it was noted down) so sorting and storage stay
  // uniform, but it isn't shown or treated as a due date.
  undated?: boolean;
  // Set on a *paid* expense that is one part of an upcoming one: the id of
  // that upcoming expense. Each part is an ordinary "done" expense on the
  // day it was paid, so monthly totals and statistics need no special
  // cases — what's left to pay is the upcoming expense's amount minus its
  // parts (see domain/installments.ts).
  partOfId?: string;
  // On an expense that was paid off in parts: what it added up to in
  // total. Its own `amount` is then just the final part.
  plannedAmount?: number;
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
}

export interface RecurringExpense {
  id: string;
  ownerId: string;
  amount: number;
  currency: Currency;
  description: string;
  categoryId: string;
  dayOfMonth: number; // 1-31, clamped to end-of-month for short months
  periodicity: RecurringPeriodicity;
  startDate: ISODate;
  endDate?: ISODate;
  active: boolean;
  notes?: string;
  bankId?: string; // which of the profile's `banks` this is paid from
  lastCompletedMonth?: string; // "YYYY-MM" of the most recent month checked off
  // The month for which ticking it off has also been written down as a paid
  // expense (see setRecurringCompletedThisMonth). Lets the app tell a tick
  // made before that existed — which still needs its expense — from one
  // whose expense the user has since deleted on purpose.
  materializedMonth?: string;
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
}

// ---------------------------------------------------------------------------
// Debts & reminders ("Deudas" tab)
// ---------------------------------------------------------------------------

/** "owe": money I borrowed and have to give back. "owed": money I lent and
 * am waiting to get back.
 * "reminder" is legacy: a payment not owed to anyone in particular. Those
 * are upcoming expenses now ("Próximos") and existing ones are converted
 * on sight — see services/migrations.service.ts. */
export type DebtKind = "owe" | "owed" | "reminder";

/** One repayment recorded against a debt. */
export interface DebtPayment {
  amount: number;
  date: ISODate;
  at: EpochMillis; // when it was recorded — orders same-day payments
  /** True for the entry that "pay it all" adds to close the debt, so
   * reopening can take exactly that one back out. */
  closing?: boolean;
}

/** Private to its owner — `users/{uid}/debts/{id}`. Deliberately separate
 * from PersonalExpense: borrowing or lending isn't spending, so none of
 * this counts towards monthly totals or statistics. */
export interface Debt {
  id: string;
  ownerId: string;
  kind: DebtKind;
  person?: string; // who I owe / who owes me; unused for reminders
  concept?: string;
  amount: number; // original amount, always positive
  paidAmount: number; // returned so far (partial repayments); 0..amount
  // The individual repayments behind `paidAmount`. Absent on debts whose
  // repayments were recorded before this log existed — see paymentsOf().
  payments?: DebtPayment[];
  currency: Currency;
  date: ISODate; // when the money changed hands / the reminder was noted
  dueDate?: ISODate; // absent = "when I can"
  notes?: string;
  settledAt?: EpochMillis; // set once fully returned/paid
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon: string; // key into GROUP_ICON_OPTIONS (lib/groupIcons.ts) — older groups may
  // still store a literal emoji; groupIconComponent() resolves both.
  color: string;
  currency: Currency; // primary currency for the group
  createdBy: string; // uid of the admin/creator
  inviteCode: string;
  memberIds: string[]; // denormalized for membership security-rule checks & queries
  createdAt: EpochMillis;
  archivedAt?: EpochMillis;
}

export interface GroupMember {
  uid: string;
  name: string;
  color: UserColor;
  photoUrl?: string;
  // No stored role: "is admin" is always derived from `group.createdBy === uid`,
  // live — never a field a client write could forge (see firestore.rules).
  joinedAt: EpochMillis;
  active: boolean; // false once a member leaves; kept for historical expense attribution
  // Added by the group's admin for someone without (or who doesn't want) a
  // Splitter account — no auth uid, no login, can't self-join or leave.
  // Otherwise a member like any other: can be a payer, a participant, or a
  // split target; the admin manages their name/color and records their
  // payments on their behalf.
  isGhost?: boolean;
}

export type SplitMethod = "equal" | "amount"; // "percentage" | "shares" reserved for Phase 3

export interface ExpenseSplit {
  uid: string;
  amount: number; // this participant's share, always sums exactly to the expense total
}

export interface GroupExpense {
  id: string;
  groupId: string;
  createdBy: string; // only this uid may edit/delete — enforced by Firestore rules too
  paidBy: string;
  amount: number;
  currency: Currency;
  description: string;
  categoryId: string;
  date: ISODate;
  splitMethod: SplitMethod;
  participants: string[]; // uids included in this expense
  splits: ExpenseSplit[]; // derived from splitMethod + participants, persisted for auditability
  notes?: string;
  createdAt: EpochMillis;
  updatedAt: EpochMillis;
  deleted?: boolean; // soft delete: keeps history/audit trail intact
}

export type PaymentStatus = "pending" | "confirmed";

export interface Payment {
  id: string;
  groupId: string;
  fromUid: string; // who pays
  toUid: string; // who receives
  amount: number;
  currency: Currency;
  concept?: string;
  status: PaymentStatus;
  createdBy: string;
  createdAt: EpochMillis;
  confirmedAt?: EpochMillis;
  deleted?: boolean; // "revertir pago" — soft delete, keeps history intact
}

export type HistoryEventType =
  | "expense_added"
  | "expense_edited"
  | "expense_deleted"
  | "member_joined"
  | "member_left"
  | "member_removed"
  | "member_renamed"
  | "payment_recorded"
  | "payment_reverted"
  | "group_created"
  | "invite_code_regenerated";

export interface HistoryEntry {
  id: string;
  groupId: string;
  type: HistoryEventType;
  actorId: string;
  actorName: string;
  summary: string; // human-readable, pre-rendered so history never needs a join
  entityId?: string; // expenseId / paymentId / memberId this event refers to
  createdAt: EpochMillis;
}

// ---------------------------------------------------------------------------
// Derived / computed (never persisted verbatim — recomputed from expenses+payments)
// ---------------------------------------------------------------------------

export interface MemberBalance {
  uid: string;
  paid: number; // total this member has paid across group expenses
  owed: number; // total this member should have paid (their share of all expenses)
  net: number; // paid - owed. positive = is owed money, negative = owes money
}

export interface SettlementTransfer {
  fromUid: string;
  toUid: string;
  amount: number;
}

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
  friendCode?: string; // lazily generated the first time the "Amigos" screen is opened
  createdAt: EpochMillis;
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
  lastCompletedMonth?: string; // "YYYY-MM" of the most recent month checked off
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

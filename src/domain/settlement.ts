import type { MemberBalance, SettlementTransfer } from "../types";
import { fromMinorUnits, toMinorUnits } from "./money";

/**
 * Greedy min-cash-flow settlement: repeatedly matches the largest creditor
 * with the largest debtor and transfers the smaller of the two amounts.
 * This produces at most (members with a nonzero balance - 1) transfers,
 * which is the standard practical answer to "minimize number of payments"
 * — finding the provably-minimal transaction count in the general case is
 * NP-hard (it's a variant of subset-sum partitioning), so this greedy
 * approach is the accepted tradeoff used by every mainstream splitting app.
 */
export function optimizeSettlement(
  balances: MemberBalance[],
  currency: string,
  epsilonMinor = 1
): SettlementTransfer[] {
  type Node = { uid: string; minor: number };

  const creditors: Node[] = [];
  const debtors: Node[] = [];

  for (const b of balances) {
    const minor = toMinorUnits(b.net, currency);
    if (minor > epsilonMinor) creditors.push({ uid: b.uid, minor });
    else if (minor < -epsilonMinor) debtors.push({ uid: b.uid, minor: -minor });
  }

  creditors.sort((a, b) => b.minor - a.minor);
  debtors.sort((a, b) => b.minor - a.minor);

  const transfers: SettlementTransfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amountMinor = Math.min(creditor.minor, debtor.minor);

    if (amountMinor > 0) {
      transfers.push({
        fromUid: debtor.uid,
        toUid: creditor.uid,
        amount: fromMinorUnits(amountMinor, currency),
      });
    }

    creditor.minor -= amountMinor;
    debtor.minor -= amountMinor;

    if (creditor.minor <= epsilonMinor) ci += 1;
    if (debtor.minor <= epsilonMinor) di += 1;
  }

  return transfers;
}

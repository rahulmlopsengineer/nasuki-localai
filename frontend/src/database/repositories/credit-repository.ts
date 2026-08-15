// CreditRepository — local credit_wallet + credit_transactions (per user).
// Local cache only; a backend becomes authoritative for online balances later.

import { CreditTransaction, CreditWallet, TransactionType } from "@/src/types";
import { nowIso, uid } from "@/src/utils/misc";
import { queryAll, queryFirst, run, withTransaction } from "../client";

// Canonical DB transaction types (superset of the UI-facing union).
export type DbTransactionType =
  | "BONUS"
  | "PURCHASE"
  | "AD_REWARD"
  | "CHAT_USAGE"
  | "RAG_USAGE"
  | "IMAGE_USAGE"
  | "VIDEO_USAGE"
  | "REFUND"
  | "ADMIN_ADJUSTMENT";

interface WalletRow {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

interface TxRow {
  id: string;
  type: string;
  amount: number;
  label: string | null;
  created_at: string;
}

const toUiType = (t: string): TransactionType => {
  if (t === "BONUS") return "bonus";
  if (t === "AD_REWARD") return "reward_ad";
  if (t === "PURCHASE" || t === "REFUND") return "purchase";
  return "usage";
};

const toWallet = (r: WalletRow | null): CreditWallet => ({
  balance: r?.balance ?? 0,
  lifetimeEarned: r?.lifetime_earned ?? 0,
  lifetimeSpent: r?.lifetime_spent ?? 0,
});

export const CreditRepository = {
  async getWallet(userId: string): Promise<CreditWallet> {
    const row = await queryFirst<WalletRow>("SELECT * FROM credit_wallet WHERE user_id = ?", [userId]);
    return toWallet(row);
  },

  /** Create the wallet with a one-time welcome bonus if it doesn't exist yet. */
  async ensureWallet(userId: string, bonus: number): Promise<CreditWallet> {
    const existing = await queryFirst<WalletRow>(
      "SELECT * FROM credit_wallet WHERE user_id = ?",
      [userId],
    );
    if (existing) return toWallet(existing);
    const now = nowIso();
    await withTransaction(async () => {
      await run(
        "INSERT INTO credit_wallet (user_id, balance, lifetime_earned, lifetime_spent, updated_at) VALUES (?, ?, ?, 0, ?)",
        [userId, bonus, bonus, now],
      );
      await run(
        "INSERT INTO credit_transactions (id, user_id, type, amount, feature, label, reference_id, created_at) VALUES (?, ?, 'BONUS', ?, 'welcome', 'Welcome bonus', NULL, ?)",
        [uid("tx"), userId, bonus, now],
      );
    });
    return this.getWallet(userId);
  },

  async listTransactions(userId: string, limit = 100): Promise<CreditTransaction[]> {
    const rows = await queryAll<TxRow>(
      "SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      [userId, limit],
    );
    return rows.map((r) => ({
      id: r.id,
      type: toUiType(r.type),
      amount: r.amount,
      label: r.label ?? "",
      createdAt: r.created_at,
    }));
  },

  /** Atomically record a transaction and update the wallet totals. */
  async addTransaction(
    userId: string,
    input: { type: DbTransactionType; amount: number; label: string; feature?: string },
  ): Promise<CreditWallet> {
    const now = nowIso();
    await withTransaction(async () => {
      await run(
        "INSERT INTO credit_transactions (id, user_id, type, amount, feature, label, reference_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)",
        [uid("tx"), userId, input.type, input.amount, input.feature ?? null, input.label, now],
      );
      const earned = input.amount > 0 ? input.amount : 0;
      const spent = input.amount < 0 ? -input.amount : 0;
      await run(
        `UPDATE credit_wallet SET balance = balance + ?, lifetime_earned = lifetime_earned + ?,
           lifetime_spent = lifetime_spent + ?, updated_at = ? WHERE user_id = ?`,
        [input.amount, earned, spent, now, userId],
      );
    });
    return this.getWallet(userId);
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await run("DELETE FROM credit_transactions WHERE user_id = ?", [userId]);
    await run("DELETE FROM credit_wallet WHERE user_id = ?", [userId]);
  },
};

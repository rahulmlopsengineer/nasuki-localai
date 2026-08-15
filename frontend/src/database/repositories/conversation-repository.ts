// ConversationRepository — conversations table access (scoped by user_id).

import { Conversation } from "@/src/types";
import { nowIso, uid } from "@/src/utils/misc";
import { queryAll, queryFirst, run } from "../client";

interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  model_id: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
  is_pinned: number;
  is_archived: number;
  is_private: number;
  last_message: string | null;
  message_count: number;
}

const toConversation = (r: ConversationRow): Conversation => ({
  id: r.id,
  title: r.title,
  modelId: r.model_id ?? "",
  mode: r.mode as Conversation["mode"],
  lastMessage: r.last_message ?? "",
  pinned: !!r.is_pinned,
  isPrivate: !!r.is_private,
  isArchived: !!r.is_archived,
  messageCount: r.message_count ?? 0,
  updatedAt: r.updated_at,
  createdAt: r.created_at,
});

const SELECT = `
  SELECT c.*,
    (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
  FROM conversations c
`;

export const ConversationRepository = {
  async list(
    userId: string,
    opts: { search?: string; limit?: number; offset?: number } = {},
  ): Promise<Conversation[]> {
    const { search, limit = 100, offset = 0 } = opts;
    const params: (string | number)[] = [userId];
    let where = "WHERE c.user_id = ? AND c.is_archived = 0";
    if (search && search.trim()) {
      where += " AND c.title LIKE ?";
      params.push(`%${search.trim()}%`);
    }
    params.push(limit, offset);
    const rows = await queryAll<ConversationRow>(
      `${SELECT} ${where} ORDER BY c.is_pinned DESC, c.updated_at DESC LIMIT ? OFFSET ?`,
      params,
    );
    return rows.map(toConversation);
  },

  async get(id: string): Promise<Conversation | null> {
    const row = await queryFirst<ConversationRow>(`${SELECT} WHERE c.id = ?`, [id]);
    return row ? toConversation(row) : null;
  },

  async create(input: {
    userId: string;
    title?: string;
    modelId: string;
    mode?: Conversation["mode"];
    isPrivate?: boolean;
  }): Promise<Conversation> {
    const id = uid("cnv");
    const now = nowIso();
    await run(
      `INSERT INTO conversations (id, user_id, title, model_id, mode, created_at, updated_at, is_pinned, is_archived, is_private)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      [
        id,
        input.userId,
        input.title ?? "New chat",
        input.modelId,
        input.mode ?? "offline",
        now,
        now,
        input.isPrivate ? 1 : 0,
      ],
    );
    return (await this.get(id))!;
  },

  async rename(id: string, title: string): Promise<void> {
    await run("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", [
      title,
      nowIso(),
      id,
    ]);
  },

  async togglePin(id: string): Promise<void> {
    await run(
      "UPDATE conversations SET is_pinned = CASE is_pinned WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
      [nowIso(), id],
    );
  },

  async touch(id: string): Promise<void> {
    await run("UPDATE conversations SET updated_at = ? WHERE id = ?", [nowIso(), id]);
  },

  async remove(id: string): Promise<void> {
    await run("DELETE FROM conversations WHERE id = ?", [id]);
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await run("DELETE FROM conversations WHERE user_id = ?", [userId]);
  },
};

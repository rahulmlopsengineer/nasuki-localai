// MessageRepository — messages table access (paginated).

import { ChatMessageState, Message, MessageRole } from "@/src/types";
import { nowIso, uid } from "@/src/utils/misc";
import { queryAll, run } from "../client";

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
  updated_at: string;
  status: string;
  model_id: string | null;
  token_count: number;
}

// DB status <-> UI state. DB keeps the canonical set: pending|generating|completed|failed.
const toState = (status: string): ChatMessageState => {
  switch (status) {
    case "pending":
      return "sending";
    case "failed":
      return "error";
    case "generating":
      return "generating";
    default:
      return "completed";
  }
};

const toStatus = (state: ChatMessageState): string => {
  switch (state) {
    case "sending":
    case "typing":
      return "pending";
    case "generating":
      return "generating";
    case "error":
      return "failed";
    default:
      return "completed";
  }
};

const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  role: r.role as MessageRole,
  content: r.content,
  state: toState(r.status),
  createdAt: r.created_at,
});

export const MessageRepository = {
  async list(
    conversationId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<Message[]> {
    const { limit = 200, offset = 0 } = opts;
    const rows = await queryAll<MessageRow>(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?",
      [conversationId, limit, offset],
    );
    return rows.map(toMessage);
  },

  async add(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    state?: ChatMessageState;
    modelId?: string;
  }): Promise<Message> {
    const id = uid("m");
    const now = nowIso();
    await run(
      `INSERT INTO messages (id, conversation_id, role, content, created_at, updated_at, status, model_id, token_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        input.conversationId,
        input.role,
        input.content,
        now,
        now,
        toStatus(input.state ?? "completed"),
        input.modelId ?? null,
      ],
    );
    return {
      id,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      state: input.state ?? "completed",
      createdAt: now,
    };
  },

  async update(
    id: string,
    patch: { content?: string; state?: ChatMessageState },
  ): Promise<void> {
    const sets: string[] = ["updated_at = ?"];
    const params: (string | number)[] = [nowIso()];
    if (patch.content !== undefined) {
      sets.push("content = ?");
      params.push(patch.content);
    }
    if (patch.state !== undefined) {
      sets.push("status = ?");
      params.push(toStatus(patch.state));
    }
    params.push(id);
    await run(`UPDATE messages SET ${sets.join(", ")} WHERE id = ?`, params);
  },

  async remove(id: string): Promise<void> {
    await run("DELETE FROM messages WHERE id = ?", [id]);
  },

  async deleteForConversation(conversationId: string): Promise<void> {
    await run("DELETE FROM messages WHERE conversation_id = ?", [conversationId]);
  },
};

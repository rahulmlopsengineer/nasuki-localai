// UserRepository — local users table access. Never stores tokens/secrets.

import { AuthProvider, User } from "@/src/types";
import { nowIso, uid } from "@/src/utils/misc";
import { queryFirst, run } from "../client";

interface UserRow {
  id: string;
  remote_id: string | null;
  name: string;
  email: string | null;
  profile_image: string | null;
  auth_provider: string;
  created_at: string;
  updated_at: string;
  is_demo_user: number;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  remoteId: r.remote_id ?? undefined,
  name: r.name,
  email: r.email ?? "",
  profileImage: r.profile_image ?? undefined,
  provider: (r.auth_provider as AuthProvider) ?? "demo",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  isDemoUser: !!r.is_demo_user,
});

export const UserRepository = {
  async findById(id: string): Promise<User | null> {
    const row = await queryFirst<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
    return row ? toUser(row) : null;
  },

  async findByRemoteId(remoteId: string): Promise<User | null> {
    const row = await queryFirst<UserRow>("SELECT * FROM users WHERE remote_id = ?", [remoteId]);
    return row ? toUser(row) : null;
  },

  async findByEmail(email: string): Promise<User | null> {
    const row = await queryFirst<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
    return row ? toUser(row) : null;
  },

  /** Insert-or-update a Google user by remoteId (backend user id). */
  async upsertRemote(input: {
    remoteId: string;
    name: string;
    email: string;
    profileImage?: string;
  }): Promise<User> {
    const existing =
      (await this.findByRemoteId(input.remoteId)) ??
      (input.email ? await this.findByEmail(input.email) : null);
    const now = nowIso();
    if (existing) {
      await run(
        "UPDATE users SET name=?, email=?, profile_image=?, remote_id=?, updated_at=? WHERE id=?",
        [input.name, input.email, input.profileImage ?? null, input.remoteId, now, existing.id],
      );
      return (await this.findById(existing.id))!;
    }
    const id = uid("usr");
    await run(
      `INSERT INTO users (id, remote_id, name, email, profile_image, auth_provider, created_at, updated_at, is_demo_user)
       VALUES (?, ?, ?, ?, ?, 'google', ?, ?, 0)`,
      [id, input.remoteId, input.name, input.email, input.profileImage ?? null, now, now],
    );
    return (await this.findById(id))!;
  },

  /** Get (or create) the single local demo user. */
  async ensureDemoUser(input: { name: string; email: string }): Promise<User> {
    const existing = await queryFirst<UserRow>(
      "SELECT * FROM users WHERE is_demo_user = 1 LIMIT 1",
    );
    if (existing) return toUser(existing);
    const id = uid("demo");
    const now = nowIso();
    await run(
      `INSERT INTO users (id, remote_id, name, email, profile_image, auth_provider, created_at, updated_at, is_demo_user)
       VALUES (?, NULL, ?, ?, NULL, 'demo', ?, ?, 1)`,
      [id, input.name, input.email, now, now],
    );
    return (await this.findById(id))!;
  },
};

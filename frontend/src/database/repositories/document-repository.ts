// DocumentRepository — documents + document_chunks (RAG metadata only).

import { DocumentChunk, DocumentFile, DocumentStatus } from "@/src/types";
import { nowIso, uid } from "@/src/utils/misc";
import { queryAll, queryFirst, run } from "../client";

interface DocRow {
  id: string;
  user_id: string;
  filename: string;
  mime_type: string | null;
  file_size: number;
  doc_type: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

const toDoc = (r: DocRow): DocumentFile => ({
  id: r.id,
  name: r.filename,
  type: r.doc_type as DocumentFile["type"],
  sizeKb: Math.round(r.file_size / 1024),
  status: r.status as DocumentStatus,
  chunkCount: r.chunk_count,
  createdAt: r.created_at,
});

export const DocumentRepository = {
  async list(userId: string): Promise<DocumentFile[]> {
    const rows = await queryAll<DocRow>(
      "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(toDoc);
  },

  async get(id: string): Promise<DocumentFile | null> {
    const row = await queryFirst<DocRow>("SELECT * FROM documents WHERE id = ?", [id]);
    return row ? toDoc(row) : null;
  },

  async insert(input: {
    userId: string;
    filename: string;
    fileSizeKb: number;
    type?: DocumentFile["type"];
  }): Promise<DocumentFile> {
    const id = uid("doc");
    const now = nowIso();
    await run(
      `INSERT INTO documents (id, user_id, filename, file_path, mime_type, file_size, doc_type, status, chunk_count, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, 'pending', 0, ?, ?)`,
      [id, input.userId, input.filename, "application/pdf", input.fileSizeKb * 1024, input.type ?? "pdf", now, now],
    );
    return (await this.get(id))!;
  },

  async setStatus(id: string, status: DocumentStatus, chunkCount?: number): Promise<void> {
    await run(
      "UPDATE documents SET status = ?, chunk_count = COALESCE(?, chunk_count), updated_at = ? WHERE id = ?",
      [status, chunkCount ?? null, nowIso(), id],
    );
  },

  async remove(id: string): Promise<void> {
    await run("DELETE FROM document_chunks WHERE document_id = ?", [id]);
    await run("DELETE FROM documents WHERE id = ?", [id]);
  },

  async addChunks(documentId: string, chunks: Omit<DocumentChunk, "id" | "documentId">[]): Promise<void> {
    const now = nowIso();
    for (const c of chunks) {
      await run(
        `INSERT INTO document_chunks (id, document_id, page_number, chunk_index, text, embedding_reference, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`,
        [uid("chk"), documentId, null, c.index, c.content, now],
      );
    }
  },

  async deleteAllForUser(userId: string): Promise<void> {
    const docs = await queryAll<{ id: string }>("SELECT id FROM documents WHERE user_id = ?", [userId]);
    for (const d of docs) await this.remove(d.id);
  },
};

// Database barrel + bootstrap (init + one-time catalog seed).

import { mockInstalledModels, mockModels } from "@/src/constants/mock-data";
import { initDatabase } from "./client";
import { ModelRepository } from "./repositories/model-repository";

export * from "./client";
export { ConversationRepository } from "./repositories/conversation-repository";
export { MessageRepository } from "./repositories/message-repository";
export { UserRepository } from "./repositories/user-repository";
export { ModelRepository } from "./repositories/model-repository";
export { DocumentRepository } from "./repositories/document-repository";
export { CreditRepository } from "./repositories/credit-repository";

/**
 * Open the DB, run migrations, and seed the read-only model catalog + initial
 * install metadata (idempotent). Called once during auth initialization.
 */
export const bootstrapDatabase = async (): Promise<void> => {
  await initDatabase();
  await ModelRepository.seed(mockModels);
  await ModelRepository.seedInstallStates(mockInstalledModels);
};

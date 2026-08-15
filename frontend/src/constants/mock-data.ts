// Centralized mock data. Replace these with real service data in later phases.

import {
  AIModel,
  Conversation,
  CreditTransaction,
  CreditWallet,
  DocumentFile,
  InstalledModel,
  Message,
  User,
} from "@/src/types";

export interface OnboardingSlide {
  id: string;
  title: string;
  body: string;
  icon: string; // MaterialCommunityIcons name
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: "ob-1",
    title: "Your Local AI",
    body: "Chat with powerful AI models that run privately on your device. No servers, no snooping.",
    icon: "shield-lock-outline",
  },
  {
    id: "ob-2",
    title: "Download & Own",
    body: "Install AI models once and use them anywhere — even fully offline.",
    icon: "download-outline",
  },
  {
    id: "ob-3",
    title: "Chat with Documents",
    body: "Add your PDFs and notes, then ask questions and get grounded answers.",
    icon: "file-document-outline",
  },
];

export const mockUser: User = {
  id: "usr-001",
  name: "Alex Rivera",
  email: "demo@nasuki.ai",
  provider: "demo",
  isDemoUser: true,
  createdAt: "2026-01-04T10:00:00.000Z",
  updatedAt: "2026-01-04T10:00:00.000Z",
};

export const mockModels: AIModel[] = [
  {
    id: "mdl-gamma",
    name: "Gamma",
    tagline: "Balanced everyday assistant",
    description:
      "Gamma is a compact instruction-tuned model tuned for fast, helpful everyday conversations, summaries and writing help. Optimized for on-device inference.",
    version: "1.2.0",
    sizeMb: 1850,
    minRamGb: 4,
    license: "Apache-2.0",
    developer: "NASUKI Labs",
    price: 0,
    capabilities: ["Chat", "Summarize", "Rewrite", "Code hints"],
    featured: true,
  },
  {
    id: "mdl-gamma-mini",
    name: "Gamma Mini",
    tagline: "Ultra-light & fast",
    description:
      "A tiny footprint model for low-RAM devices. Great for quick answers and short-form tasks with minimal battery impact.",
    version: "1.0.3",
    sizeMb: 640,
    minRamGb: 4,
    license: "Apache-2.0",
    developer: "NASUKI Labs",
    price: 0,
    capabilities: ["Chat", "Summarize"],
    featured: false,
  },
  {
    id: "mdl-orion",
    name: "Orion Pro",
    tagline: "Deep reasoning",
    description:
      "A larger reasoning-focused model for complex tasks, long context and structured output. Requires a capable device.",
    version: "2.1.0",
    sizeMb: 4200,
    minRamGb: 8,
    license: "Commercial",
    developer: "Orion Systems",
    price: 40,
    capabilities: ["Reasoning", "Long context", "Code", "RAG"],
    featured: true,
  },
  {
    id: "mdl-lyra",
    name: "Lyra Vision",
    tagline: "Text + image understanding",
    description:
      "Multimodal model that understands images alongside text. Ideal for describing photos and extracting information.",
    version: "0.9.1",
    sizeMb: 3100,
    minRamGb: 6,
    license: "Research",
    developer: "Lyra AI",
    price: 25,
    capabilities: ["Vision", "Chat", "OCR"],
    featured: false,
  },
];

// Initial install states shown on Home / Model store.
export const mockInstalledModels: InstalledModel[] = [
  { modelId: "mdl-gamma", status: "not_installed", progress: 0 },
  { modelId: "mdl-gamma-mini", status: "installed", progress: 1, installedAt: "2026-01-06T08:00:00.000Z" },
  { modelId: "mdl-orion", status: "not_installed", progress: 0 },
  { modelId: "mdl-lyra", status: "not_installed", progress: 0 },
];

export const mockConversations: Conversation[] = [
  {
    id: "cnv-1",
    title: "Trip plan to Kyoto",
    modelId: "mdl-gamma",
    lastMessage: "Here's a 5-day itinerary with temples and food spots…",
    pinned: true,
    messageCount: 12,
    updatedAt: "2026-01-08T14:20:00.000Z",
    createdAt: "2026-01-08T13:00:00.000Z",
  },
  {
    id: "cnv-2",
    title: "Rewrite my cover letter",
    modelId: "mdl-gamma",
    lastMessage: "I tightened the intro and made the tone confident.",
    pinned: false,
    messageCount: 6,
    updatedAt: "2026-01-07T09:10:00.000Z",
    createdAt: "2026-01-07T09:00:00.000Z",
  },
  {
    id: "cnv-3",
    title: "Explain quantum tunneling",
    modelId: "mdl-gamma-mini",
    lastMessage: "Think of it like a ball passing through a hill…",
    pinned: false,
    messageCount: 4,
    updatedAt: "2026-01-05T18:45:00.000Z",
    createdAt: "2026-01-05T18:40:00.000Z",
  },
];

export const mockMessages: Record<string, Message[]> = {
  "cnv-1": [
    {
      id: "m1",
      conversationId: "cnv-1",
      role: "user",
      content: "Plan a 5-day trip to Kyoto for me.",
      state: "completed",
      createdAt: "2026-01-08T13:00:00.000Z",
    },
    {
      id: "m2",
      conversationId: "cnv-1",
      role: "assistant",
      content:
        "Absolutely! Here's a relaxed 5-day Kyoto itinerary:\n\nDay 1 — Higashiyama & Kiyomizu-dera\nDay 2 — Arashiyama bamboo grove\nDay 3 — Fushimi Inari at sunrise\nDay 4 — Gion & tea houses\nDay 5 — Day trip to Nara.",
      state: "completed",
      createdAt: "2026-01-08T13:01:00.000Z",
    },
  ],
};

export const mockDocuments: DocumentFile[] = [
  {
    id: "doc-1",
    name: "Product Spec v3.pdf",
    type: "pdf",
    sizeKb: 842,
    status: "ready",
    chunkCount: 42,
    createdAt: "2026-01-07T11:00:00.000Z",
  },
  {
    id: "doc-2",
    name: "Meeting notes.md",
    type: "md",
    sizeKb: 24,
    status: "processing",
    chunkCount: 0,
    createdAt: "2026-01-08T15:30:00.000Z",
  },
];

export const mockWallet: CreditWallet = {
  balance: 100,
  lifetimeEarned: 145,
  lifetimeSpent: 45,
};

export const mockTransactions: CreditTransaction[] = [
  { id: "tx-1", type: "bonus", amount: 100, label: "Welcome bonus", createdAt: "2026-01-04T10:00:00.000Z" },
  { id: "tx-2", type: "reward_ad", amount: 5, label: "Watched an ad", createdAt: "2026-01-06T12:00:00.000Z" },
  { id: "tx-3", type: "usage", amount: -20, label: "Chat with Gamma", createdAt: "2026-01-07T09:15:00.000Z" },
  { id: "tx-4", type: "usage", amount: -25, label: "Chat with Gamma", createdAt: "2026-01-08T14:00:00.000Z" },
  { id: "tx-5", type: "reward_ad", amount: 5, label: "Watched an ad", createdAt: "2026-01-08T16:00:00.000Z" },
];

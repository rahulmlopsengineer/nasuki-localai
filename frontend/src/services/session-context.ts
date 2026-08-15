// Active-user context. Set on sign-in, read by services/repositories so that
// every query is scoped to the current user (multi-account safety).

let activeUserId: string | null = null;

export const setActiveUserId = (id: string | null): void => {
  activeUserId = id;
};

export const getActiveUserId = (): string => {
  if (!activeUserId) throw new Error("No active user in session");
  return activeUserId;
};

export const hasActiveUser = (): boolean => activeUserId !== null;

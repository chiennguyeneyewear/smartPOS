import { prisma } from "./prisma.js";

// Every access/refresh token records the deploy version and change epoch that were current when it was
// issued. A new deploy (deployVersion) ends every session; an admin changing accounts, permissions or
// branches (changeEpoch) ends every non-admin session. Either way the user has to sign in again.

export interface SessionState {
  deployVersion: string;
  changeEpoch: number;
}

const ROW_ID = "singleton";
const CACHE_MS = 5_000;

// Render exposes the deployed commit; it stays the same across restarts/cold starts of one deploy, so
// idle spin-downs don't sign anybody out. Locally it is a constant.
const currentVersion = () => process.env.RENDER_GIT_COMMIT || process.env.APP_VERSION || "dev";

let cache: (SessionState & { at: number }) | null = null;

function remember(row: SessionState): SessionState {
  cache = { deployVersion: row.deployVersion, changeEpoch: row.changeEpoch, at: Date.now() };
  return row;
}

export async function initSessionState(): Promise<SessionState> {
  const version = currentVersion();
  const row = await prisma.appState.upsert({
    where: { id: ROW_ID },
    create: { id: ROW_ID, deployVersion: version },
    update: {},
  });
  if (row.deployVersion === version) return remember(row);
  return remember(await prisma.appState.update({ where: { id: ROW_ID }, data: { deployVersion: version } }));
}

// Never throws: if the database blips, keep judging by the last known state rather than sign everyone out.
export async function getSessionState(): Promise<SessionState | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  try {
    const row = await prisma.appState.findUnique({ where: { id: ROW_ID } });
    if (row) return remember(row);
    return await initSessionState();
  } catch {
    return cache;
  }
}

export async function bumpChangeEpoch(): Promise<void> {
  const row = await prisma.appState.upsert({
    where: { id: ROW_ID },
    create: { id: ROW_ID, deployVersion: currentVersion(), changeEpoch: 2 },
    update: { changeEpoch: { increment: 1 } },
  });
  remember(row);
}

export function sessionStillValid(
  token: { dv?: string; ce?: number },
  role: string,
  state: SessionState | null,
): boolean {
  if (!state) return true;
  if (token.dv !== state.deployVersion) return false;
  return role === "admin" || token.ce === state.changeEpoch;
}

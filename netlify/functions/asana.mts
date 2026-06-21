/**
 * Serverless bridge for the "Send to Asana" action.
 *
 * The browser SPA can't hold an Asana token safely, so it POSTs the task payload
 * here and this function creates the task server-side using a Personal Access
 * Token kept in Netlify env vars. Configure in Netlify → Environment variables:
 *
 *   ASANA_TOKEN          (required) Asana Personal Access Token.
 *   ASANA_PROJECT_GID    (optional) Project the task is added to.
 *   ASANA_WORKSPACE_GID  (optional) Workspace for the task; falls back to the
 *                        token owner's default workspace when omitted.
 *
 * When ASANA_TOKEN is absent the function returns 503 so the SPA can fall back
 * to exporting the task as JSON.
 */

import { checkRateLimit, clientKey } from '../shared/rateLimit';

const ASANA_API = 'https://app.asana.com/api/1.0';

interface AsanaTaskPayload {
  name: string;
  notes: string;
  reference: string;
  band: string;
  decision: string;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method-not-allowed' }, { status: 405 });
  }

  // L3: throttle abuse (20 task creations/min per client).
  const limit = checkRateLimit(`asana:${clientKey(req)}`, 20, 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: 'rate-limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const token = process.env.ASANA_TOKEN ?? process.env.ASANA_PAT;
  if (!token) {
    // Not wired up yet — let the client fall back to JSON export.
    return Response.json({ error: 'not-configured' }, { status: 503 });
  }

  let payload: AsanaTaskPayload;
  try {
    payload = (await req.json()) as AsanaTaskPayload;
  } catch {
    return Response.json({ error: 'invalid-json' }, { status: 400 });
  }
  if (!payload?.name) {
    return Response.json({ error: 'missing-name' }, { status: 400 });
  }

  const auth = { Authorization: `Bearer ${token}` };

  // Resolve a target: a project (preferred) or a workspace. Defaults to the
  // "Compliance Assessments" project so the action works with just ASANA_TOKEN.
  const projectGid = process.env.ASANA_PROJECT_GID ?? '1213914392047129';
  let workspaceGid = process.env.ASANA_WORKSPACE_GID;

  if (!projectGid && !workspaceGid) {
    try {
      const meRes = await fetch(`${ASANA_API}/users/me`, { headers: auth });
      if (!meRes.ok) {
        return Response.json(
          { error: 'asana-auth-failed', detail: `HTTP ${meRes.status}` },
          { status: 502 },
        );
      }
      const me = (await meRes.json()) as { data?: { workspaces?: { gid: string }[] } };
      workspaceGid = me.data?.workspaces?.[0]?.gid;
    } catch (e) {
      return Response.json(
        { error: 'asana-unreachable', detail: e instanceof Error ? e.message : String(e) },
        { status: 502 },
      );
    }
  }

  if (!projectGid && !workspaceGid) {
    return Response.json({ error: 'no-target-workspace' }, { status: 502 });
  }

  const data: Record<string, unknown> = {
    name: payload.name,
    notes: payload.notes,
  };
  if (projectGid) data.projects = [projectGid];
  if (workspaceGid) data.workspace = workspaceGid;

  try {
    const res = await fetch(`${ASANA_API}/tasks`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return Response.json(
        { error: 'asana-create-failed', detail: `HTTP ${res.status} ${detail}`.trim() },
        { status: 502 },
      );
    }
    const created = (await res.json()) as { data?: { gid?: string; permalink_url?: string } };
    return Response.json({
      ok: true,
      gid: created.data?.gid,
      url: created.data?.permalink_url,
    });
  } catch (e) {
    return Response.json(
      { error: 'asana-unreachable', detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
};

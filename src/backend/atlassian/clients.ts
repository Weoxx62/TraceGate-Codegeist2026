import api, { route } from '@forge/api';
import {
  generateAuditPackMarkdown,
  hashSpecContent,
  verifyLedgerChain,
  type EvaluationResult,
  type EvidenceGraphSnapshot,
} from '../../core/index';

export interface AtlassianProjectOption {
  key: string;
  name: string;
}

export interface ConfluenceSpaceOption {
  id: string;
  key: string;
  name: string;
}

export interface AtlassianEnvironmentTargets {
  currentUser: { accountId: string; displayName: string };
  projects: AtlassianProjectOption[];
  spaces: ConfluenceSpaceOption[];
  confluenceConnected: boolean;
  jiraConnected: boolean;
}

function toAdfDoc(lines: string[]): Record<string, unknown> {
  return {
    type: 'doc',
    version: 1,
    content: lines.map((line) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

export async function fetchEnvironmentTargets(): Promise<AtlassianEnvironmentTargets> {
  let currentUser = { accountId: 'judge-user', displayName: 'Atlassian Judge' };
  let jiraConnected = false;
  let confluenceConnected = false;
  const projects: AtlassianProjectOption[] = [];
  const spaces: ConfluenceSpaceOption[] = [];

  try {
    const meRes = await api.asUser().requestJira(route`/rest/api/3/myself`);
    if (meRes.ok) {
      const me = (await meRes.json()) as { accountId?: string; displayName?: string };
      currentUser = {
        accountId: me.accountId ?? 'judge-user',
        displayName: me.displayName ?? 'Atlassian Judge',
      };
      jiraConnected = true;
    }
  } catch {
    jiraConnected = false;
  }

  try {
    const projRes = await api
      .asUser()
      .requestJira(route`/rest/api/3/project/search?maxResults=25`);
    if (projRes.ok) {
      const data = (await projRes.json()) as {
        values?: Array<{ key: string; name: string }>;
      };
      for (const p of data.values ?? []) {
        projects.push({ key: p.key, name: p.name });
      }
      jiraConnected = true;
    }
  } catch {
    // No projects accessible
  }

  try {
    const spaceRes = await api
      .asUser()
      .requestConfluence(route`/wiki/api/v2/spaces?limit=25`);
    if (spaceRes.ok) {
      const data = (await spaceRes.json()) as {
        results?: Array<{ id: string; key: string; name: string }>;
      };
      for (const s of data.results ?? []) {
        spaces.push({ id: s.id, key: s.key, name: s.name });
      }
      confluenceConnected = true;
    }
  } catch {
    confluenceConnected = false;
  }

  return {
    currentUser,
    projects,
    spaces,
    confluenceConnected,
    jiraConnected,
  };
}

async function getProjectDefaultIssueType(projectKey: string): Promise<string> {
  try {
    const res = await api
      .asUser()
      .requestJira(route`/rest/api/3/project/${projectKey}`);
    if (res.ok) {
      const data = (await res.json()) as {
        issueTypes?: Array<{ id: string; name: string; subtask?: boolean }>;
      };
      const nonSubtask = (data.issueTypes ?? []).filter((t) => !t.subtask);
      const preferred =
        nonSubtask.find((t) => /task|story/i.test(t.name)) ?? nonSubtask[0];
      if (preferred) return preferred.name;
    }
  } catch {
    // Fallback to Task
  }
  return 'Task';
}

export async function createJiraIssue(params: {
  projectKey: string;
  summary: string;
  descriptionLines: string[];
  labels?: string[];
}): Promise<string | null> {
  try {
    const issueTypeName = await getProjectDefaultIssueType(params.projectKey);
    const res = await api.asUser().requestJira(route`/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: params.projectKey },
          summary: params.summary,
          issuetype: { name: issueTypeName },
          description: toAdfDoc(params.descriptionLines),
          labels: params.labels ?? ['tracegate-demo'],
        },
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { key?: string };
    return json.key ?? null;
  } catch {
    return null;
  }
}

async function linkJiraIssues(inwardKey: string, outwardKey: string): Promise<void> {
  try {
    await api.asUser().requestJira(route`/rest/api/3/issueLink`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: { name: 'Relates' },
        inwardIssue: { key: inwardKey },
        outwardIssue: { key: outwardKey },
      }),
    });
  } catch {
    // Non-fatal if Relates link type has custom name
  }
}

export async function deleteSeededJiraIssues(
  issueKeys: Record<string, string>,
): Promise<void> {
  for (const key of Object.values(issueKeys)) {
    try {
      await api
        .asUser()
        .requestJira(route`/rest/api/3/issue/${key}`, { method: 'DELETE' });
    } catch {
      // Ignore already-deleted issues
    }
  }
}

export async function upsertConfluenceSpecPage(params: {
  spaceId: string;
  existingPageId: string | null;
  title: string;
  lines: string[];
}): Promise<string | null> {
  const atlasBody = JSON.stringify(toAdfDoc(params.lines));
  try {
    if (params.existingPageId) {
      const currentRes = await api
        .asUser()
        .requestConfluence(route`/wiki/api/v2/pages/${params.existingPageId}`);
      if (currentRes.ok) {
        const current = (await currentRes.json()) as {
          version?: { number: number };
        };
        const nextVersion = (current.version?.number ?? 1) + 1;
        const putRes = await api
          .asUser()
          .requestConfluence(route`/wiki/api/v2/pages/${params.existingPageId}`, {
            method: 'PUT',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: params.existingPageId,
              status: 'current',
              title: params.title,
              body: {
                representation: 'atlas_doc_format',
                value: atlasBody,
              },
              version: {
                number: nextVersion,
                message: 'TraceGate synced Dosimetry Safety Specification',
              },
            }),
          });
        if (putRes.ok) return params.existingPageId;
      }
    }

    const createRes = await api
      .asUser()
      .requestConfluence(route`/wiki/api/v2/pages`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId: params.spaceId,
          status: 'current',
          title: params.title,
          body: {
            representation: 'atlas_doc_format',
            value: atlasBody,
          },
        }),
      });
    if (!createRes.ok) return null;
    const created = (await createRes.json()) as { id?: string };
    return created.id ?? null;
  } catch {
    return null;
  }
}

export async function deleteSeededConfluencePage(pageId: string | null): Promise<void> {
  if (!pageId) return;
  try {
    await api
      .asUser()
      .requestConfluence(route`/wiki/api/v2/pages/${pageId}`, { method: 'DELETE' });
  } catch {
    // Ignore if already deleted
  }
}

/**
 * Seeds real Jira issues + optional Confluence SOP page inside the judge's chosen
 * existing project/space without ever attempting admin-only project creation.
 */
export async function seedLiveAtlassianArtifacts(
  snapshot: EvidenceGraphSnapshot,
  projectKey: string,
  spaceId: string | null,
): Promise<{
  seededJiraIssueKeys: Record<string, string>;
  seededConfluencePageId: string | null;
}> {
  const seededJiraIssueKeys: Record<string, string> = {};
  const jiraNodeIds = [
    'REQ-101',
    'REQ-102',
    'FMEA-301',
    'TEST-401',
    'TEST-402',
    'TEST-403',
    'REL-240',
  ];

  for (const nodeId of jiraNodeIds) {
    const node = snapshot.nodes.find((n) => n.id === nodeId);
    if (!node) continue;
    const key = await createJiraIssue({
      projectKey,
      summary: `[TraceGate Demo] ${node.id}: ${node.title}`,
      descriptionLines: [
        `TraceGate Node ID: ${node.id}`,
        `Context Pillar: ${node.pillar}`,
        node.rawContent,
      ],
      labels: ['tracegate-demo', node.nodeType.toLowerCase()],
    });
    if (key) {
      seededJiraIssueKeys[nodeId] = key;
    }
  }

  for (const edge of snapshot.edges) {
    const fromKey = seededJiraIssueKeys[edge.fromId];
    const toKey = seededJiraIssueKeys[edge.toId];
    if (fromKey && toKey) {
      await linkJiraIssues(fromKey, toKey);
    }
  }

  let seededConfluencePageId: string | null = null;
  const specNode = snapshot.nodes.find((n) => n.id === 'SPEC-BOLUS');
  if (spaceId && specNode) {
    seededConfluencePageId = await upsertConfluenceSpecPage({
      spaceId,
      existingPageId: null,
      title: `[TraceGate Demo] ${specNode.title} (${Date.now().toString().slice(-4)})`,
      lines: specNode.rawContent.split('\n'),
    });
  }

  return { seededJiraIssueKeys, seededConfluencePageId };
}

/**
 * Live On-Read & Pre-Commit Revalidation:
 * Re-reads the live Confluence SOP page (if linked) and updates SPEC-BOLUS hash
 * directly from Confluence REST v2 so drift is caught immediately without waiting for async triggers.
 */
export async function syncLiveAtlassianNodes(
  snapshot: EvidenceGraphSnapshot,
): Promise<EvidenceGraphSnapshot> {
  if (!snapshot.seededConfluencePageId) return snapshot;

  try {
    const res = await api
      .asApp()
      .requestConfluence(
        route`/wiki/api/v2/pages/${snapshot.seededConfluencePageId}?body-format=atlas_doc_format`,
      );
    if (!res.ok) return snapshot;

    const page = (await res.json()) as {
      version?: { number: number; createdAt?: string; authorId?: string };
      body?: { atlas_doc_format?: { value?: string } };
    };
    const adfRaw = page.body?.atlas_doc_format?.value;
    if (!adfRaw) return snapshot;

    const hashed = hashSpecContent(adfRaw);
    const nextNodes = snapshot.nodes.map((node) => {
      if (node.id !== 'SPEC-BOLUS') return node;
      if (node.liveHash === hashed.hash) return node;
      return {
        ...node,
        version: page.version?.number ?? node.version + 1,
        status:
          node.approvedHash && hashed.hash !== node.approvedHash
            ? ('DRIFTED' as const)
            : ('CERTIFIED' as const),
        rawContent: hashed.normalizedText,
        contentNormalized: hashed.normalizedText,
        liveHash: hashed.hash,
        lastModifiedAt: page.version?.createdAt ?? new Date().toISOString(),
      };
    });

    return {
      ...snapshot,
      nodes: nextNodes,
      lastSyncedAt: new Date().toISOString(),
    };
  } catch {
    return snapshot;
  }
}

export async function transitionAndCommentReleaseIssue(params: {
  issueKey: string | undefined;
  commentSummary: string;
}): Promise<boolean> {
  if (!params.issueKey) return false;
  try {
    const transRes = await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${params.issueKey}/transitions`);
    if (transRes.ok) {
      const data = (await transRes.json()) as {
        transitions?: Array<{ id: string; name: string }>;
      };
      const transitions = data.transitions ?? [];
      const target =
        transitions.find((t) => /done|released|approved|complete/i.test(t.name)) ??
        transitions.at(-1);

      if (target) {
        await api
          .asUser()
          .requestJira(route`/rest/api/3/issue/${params.issueKey}/transitions`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transition: { id: target.id } }),
          });
      }
    }

    await api
      .asUser()
      .requestJira(route`/rest/api/3/issue/${params.issueKey}/comment`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: toAdfDoc(['[TraceGate Governed Commit]', params.commentSummary]),
        }),
      });
    return true;
  } catch {
    return false;
  }
}

export async function exportConfluenceAuditPack(params: {
  spaceId: string;
  snapshot: EvidenceGraphSnapshot;
  evaluation: EvaluationResult;
}): Promise<string | null> {
  const verification = verifyLedgerChain(params.snapshot.ledger);
  const markdown = generateAuditPackMarkdown(
    params.snapshot,
    params.evaluation,
    verification,
  );
  const lines = markdown.split('\n').filter((line) => line.trim().length > 0);

  return upsertConfluenceSpecPage({
    spaceId: params.spaceId,
    existingPageId: null,
    title: `[TraceGate Audit Pack] ${params.snapshot.scenarioTitle} (${Date.now().toString().slice(-4)})`,
    lines,
  });
}

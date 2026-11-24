import { getWorkspaceBundle } from '../service';

interface WorkflowValidatorEvent {
  issue?: {
    key?: string;
    id?: string;
  };
}

/**
 * Jira workflow validator (jira:workflowValidator):
 * Blocks transitioning a TraceGate-tracked Release Gate issue when the live
 * compliance evaluation verdict is not ALLOW.
 */
export async function validateReleaseTransition(event: WorkflowValidatorEvent) {
  const issueKey = event?.issue?.key ?? '';
  const bundle = await getWorkspaceBundle(false);

  const trackedReleaseKey =
    bundle.snapshot.seededJiraIssueKeys[bundle.snapshot.releaseNodeId];

  // Do not block unrelated Jira issues in the site
  if (trackedReleaseKey && issueKey && issueKey !== trackedReleaseKey) {
    return { result: true };
  }

  if (bundle.evaluation.verdict === 'ALLOW') {
    return { result: true };
  }

  const topBlocker =
    bundle.evaluation.blockers[0]?.message ??
    'Unresolved cryptographic spec drift or missing QA sign-off.';

  return {
    result: false,
    errorMessage: `TraceGate Release Gate BLOCKED (${bundle.evaluation.confidenceScore}% confidence): ${topBlocker}`,
  };
}

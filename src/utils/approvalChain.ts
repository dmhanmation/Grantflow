import { ApprovalChainStage, DEFAULT_APPROVAL_CHAIN, APPROVAL_STAGE_LABELS } from '../types';

// Re-export for consumers
export { APPROVAL_STAGE_LABELS };

// Resolve the active chain for a workspace: use the workspace override if set,
// otherwise use the org-level chain, otherwise the built-in default.
// FinalApprover is always appended if not already present.
export function resolveChain(
  orgChain?: ApprovalChainStage[],
  workspaceChain?: ApprovalChainStage[]
): ApprovalChainStage[] {
  const base = workspaceChain ?? orgChain ?? DEFAULT_APPROVAL_CHAIN;
  const result = [...base];
  if (!result.includes('FinalApprover')) result.push('FinalApprover');
  return result;
}

// Map each chain stage to the "submitted to X" review status string.
export function submittedStatus(stage: ApprovalChainStage): string {
  switch (stage) {
    case 'DepartmentHead': return 'Submitted to Department Head';
    case 'ProposalLead': return 'Submitted to Proposal Lead';
    case 'Reviewer': return 'Submitted to Reviewer';
    case 'FinalApprover': return 'Submitted for Final Approval';
  }
}

// Map each chain stage to its "approved by X" review status string.
export function approvedStatus(stage: ApprovalChainStage): string {
  switch (stage) {
    case 'DepartmentHead': return 'Department Approved';
    case 'ProposalLead': return 'Proposal Lead Approved';
    case 'Reviewer': return 'Reviewer Approved';
    case 'FinalApprover': return 'Approved';
  }
}

// Given the current reviewStatus, return the chain stage it is waiting on (or null).
export function currentPendingStage(
  reviewStatus: string,
  chain: ApprovalChainStage[]
): ApprovalChainStage | null {
  for (const stage of chain) {
    if (reviewStatus === submittedStatus(stage)) return stage;
  }
  return null;
}

// Is a section fully approved (past all stages)?
export function isSectionApproved(reviewStatus: string): boolean {
  return reviewStatus === 'Approved' ||
    reviewStatus === 'Department Approved' ||
    reviewStatus === 'Proposal Lead Approved' ||
    reviewStatus === 'Reviewer Approved';
}

// Given the current status, compute the next status after a stage approves.
// Auto-skips if the person occupying the next stage is the same as the current approver.
// Returns the new status string and whether any stages were auto-skipped.
export function advanceAfterApproval(
  currentStatus: string,
  chain: ApprovalChainStage[],
  stagePersonMap: Partial<Record<ApprovalChainStage, string>>, // maps stage → person name/id
  currentApprover?: string
): { newStatus: string; autoSkipped: ApprovalChainStage[] } {
  const autoSkipped: ApprovalChainStage[] = [];

  // Find which stage just approved
  let approvedStageIdx = -1;
  for (let i = 0; i < chain.length; i++) {
    if (currentStatus === submittedStatus(chain[i])) {
      approvedStageIdx = i;
      break;
    }
  }

  if (approvedStageIdx === -1) {
    // Already at terminal or unknown status
    return { newStatus: 'Approved', autoSkipped };
  }

  // Walk forward through remaining stages
  let nextIdx = approvedStageIdx + 1;
  while (nextIdx < chain.length) {
    const nextStage = chain[nextIdx];
    const nextPerson = stagePersonMap[nextStage];

    // Auto-skip if the next stage person is the same as the current approver
    if (currentApprover && nextPerson && (
      nextPerson === currentApprover ||
      nextPerson.toLowerCase().trim() === currentApprover.toLowerCase().trim()
    )) {
      autoSkipped.push(nextStage);
      nextIdx++;
      continue;
    }

    return { newStatus: submittedStatus(nextStage), autoSkipped };
  }

  // No more stages — fully approved
  return { newStatus: 'Approved', autoSkipped };
}

// What statuses count as "approved enough" to pass the submission gate?
// Includes terminal states from any chain configuration.
export function isApprovedForSubmission(reviewStatus: string): boolean {
  return [
    'Department Approved',
    'Proposal Lead Approved',
    'Reviewer Approved',
    'Approved'
  ].includes(reviewStatus);
}

// The first status in a chain: submitting a draft goes to the first stage.
export function firstSubmittedStatus(chain: ApprovalChainStage[]): string {
  return chain.length > 0 ? submittedStatus(chain[0]) : 'Submitted to Department Head';
}

// Human-readable description of the chain.
export function chainDescription(chain: ApprovalChainStage[]): string {
  return chain.map(s => APPROVAL_STAGE_LABELS[s]).join(' → ');
}

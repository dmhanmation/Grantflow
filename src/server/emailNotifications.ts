import { OrgProfile, OpportunityWorkspace, StaffInvitation, StaffMember, WorkspaceTask, ApplicationSection } from '../types';
import { db } from './db';

export interface EmailSendResult {
  sent: boolean;
  skipped?: boolean;
  providerId?: string;
  error?: string;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  heading: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footer?: string;
}

const normalizedAppUrl = (): string => {
  const configured = (process.env.APP_URL || process.env.PUBLIC_APP_URL || '').trim();
  if (configured && configured !== 'MY_APP_URL') return configured.replace(/\/$/, '');
  return 'http://localhost:3000';
};

const escapeHtml = (value: string): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const buildWorkspaceLink = (workspaceId: string, tab = 'overview', taskId?: string): string => {
  const url = new URL(normalizedAppUrl());
  url.searchParams.set('workspace', workspaceId);
  url.searchParams.set('tab', tab);
  if (taskId) url.searchParams.set('task', taskId);
  return url.toString();
};

export const isEmailConfigured = (): boolean =>
  Boolean((process.env.RESEND_API_KEY || '').trim() && (process.env.EMAIL_FROM || '').trim());

export async function sendTransactionalEmail(args: SendEmailArgs): Promise<EmailSendResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim();
  const recipient = (args.to || '').trim().toLowerCase();

  if (!apiKey || !from) {
    console.info('[Email] Notification skipped: RESEND_API_KEY and/or EMAIL_FROM is not configured.');
    return { sent: false, skipped: true, error: 'Email provider not configured.' };
  }

  if (!recipient || !recipient.includes('@')) {
    return { sent: false, skipped: true, error: 'Recipient email is missing or invalid.' };
  }

  const actionBlock = args.actionUrl && args.actionLabel
    ? `<p style="margin:24px 0"><a href="${escapeHtml(args.actionUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700">${escapeHtml(args.actionLabel)}</a></p>`
    : '';

  const html = `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:640px;margin:0 auto;padding:28px 16px">
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px">
      <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#4f46e5;margin-bottom:12px">GrantFlow</div>
      <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px">${escapeHtml(args.heading)}</h1>
      <div style="font-size:15px;line-height:1.7;color:#334155">${escapeHtml(args.body).replace(/\n/g, '<br/>')}</div>
      ${actionBlock}
      <p style="font-size:12px;color:#94a3b8;margin:26px 0 0">${escapeHtml(args.footer || 'This is an action notification from GrantFlow.')}</p>
    </div>
  </div>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: args.subject,
        html
      })
    });

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.message || payload?.error || `Email provider returned ${response.status}.`;
      console.error(`[Email] Send failed (${response.status}): ${message}`);
      return { sent: false, error: message };
    }

    return { sent: true, providerId: payload?.id };
  } catch (error: any) {
    console.error('[Email] Send failed:', error?.message || error);
    return { sent: false, error: error?.message || 'Unable to reach email provider.' };
  }
}

const norm = (value?: string): string => String(value || '').trim().toLowerCase();

function activeStaff(org: OrgProfile): StaffMember[] {
  return (org.staffDirectory || []).filter(s => s.status !== 'Inactive' && Boolean((s.email || '').trim()));
}

function findStaff(org: OrgProfile, opts: { id?: string; name?: string; email?: string }): StaffMember | undefined {
  const staff = activeStaff(org);
  if (opts.id) {
    const byId = staff.find(s => s.id === opts.id || s.userId === opts.id);
    if (byId) return byId;
  }
  if (opts.email) {
    const byEmail = staff.find(s => norm(s.email) === norm(opts.email));
    if (byEmail) return byEmail;
  }
  if (opts.name) {
    const target = norm(opts.name);
    const exact = staff.find(s => norm(s.fullName) === target);
    if (exact) return exact;
    const loose = staff.find(s => target && (norm(s.fullName).includes(target) || target.includes(norm(s.fullName))));
    if (loose) return loose;
  }
  return undefined;
}

function findRoleStaff(org: OrgProfile, role: string): StaffMember[] {
  return activeStaff(org).filter(s => s.role === role || (s.roles || []).includes(role as any) || s.functionalRole === role);
}

function findDepartmentHead(org: OrgProfile, task?: WorkspaceTask, section?: ApplicationSection): StaffMember | undefined {
  const id = task?.departmentHeadId || section?.departmentHeadId;
  const name = task?.departmentHeadName || section?.departmentHead;
  const direct = findStaff(org, { id, name });
  if (direct) return direct;

  const departmentId = task?.departmentId || section?.assignedDepartmentId;
  const departmentName = task?.departmentName || section?.assignedDepartment;
  const department = (org.departments || []).find(d =>
    (departmentId && d.id === departmentId) ||
    (departmentName && norm(d.name) === norm(departmentName))
  );
  if (!department) return undefined;
  return findStaff(org, { id: department.headStaffId, name: department.headStaffName });
}

async function dispatchOnce(orgId: string, key: string, args: SendEmailArgs): Promise<EmailSendResult> {
  const dedupeKey = `${orgId}:${key}`;
  if (db.hasEmailDispatch(dedupeKey)) {
    return { sent: false, skipped: true, error: 'Duplicate notification suppressed.' };
  }
  const result = await sendTransactionalEmail(args);
  if (result.sent) {
    db.recordEmailDispatch({
      id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      organizationId: orgId,
      dedupeKey,
      recipient: args.to.toLowerCase(),
      subject: args.subject,
      providerId: result.providerId,
      sentAt: new Date().toISOString()
    });
  }
  return result;
}

export async function sendStaffInvitationEmail(invitation: StaffInvitation): Promise<EmailSendResult> {
  const inviteUrl = `${normalizedAppUrl()}/join?token=${encodeURIComponent(invitation.token)}`;
  return dispatchOnce(invitation.organizationId, `invitation:${invitation.id}`, {
    to: invitation.email,
    subject: `GrantFlow invitation — ${invitation.organizationName}`,
    heading: `You have been invited to GrantFlow`,
    body: `${invitation.invitedBy} has invited you to join ${invitation.organizationName} as ${invitation.jobTitle || invitation.role}.\n\nUse the invitation link to create your password and access the workspace.`,
    actionLabel: 'Accept Invitation',
    actionUrl: inviteUrl,
    footer: `Invitation expires ${new Date(invitation.expiresAt).toLocaleDateString('en-GB')}.`
  });
}

function opportunityContext(ws: OpportunityWorkspace): string {
  return `${ws.title}${ws.donor ? ` — ${ws.donor}` : ''}`;
}

async function notifyStaff(orgId: string, key: string, staff: StaffMember | undefined, args: Omit<SendEmailArgs, 'to'>): Promise<void> {
  if (!staff?.email) return;
  await dispatchOnce(orgId, key, { ...args, to: staff.email });
}

async function notifyNamedStaff(org: OrgProfile, key: string, name: string | undefined, args: Omit<SendEmailArgs, 'to'>): Promise<void> {
  if (!name) return;
  await notifyStaff(org.id, key, findStaff(org, { name }), args);
}

export async function processWorkspaceEmailEvents(
  orgId: string,
  previous: OpportunityWorkspace | null,
  current: OpportunityWorkspace
): Promise<void> {
  if (current.isDemo || current.isTestOpportunity || current.isDeveloperTestMode || current.isEphemeralTest) return;
  const org = db.getOrg(orgId);
  if (!org) return;

  const wsLink = buildWorkspaceLink(current.id, 'overview');
  const prevTasks = new Map((previous?.tasks || []).map(t => [t.id, t]));

  for (const task of current.tasks || []) {
    const oldTask = prevTasks.get(task.id);
    const assignee = findStaff(org, { id: task.assignedStaffId, name: task.assignedTo });
    const departmentHead = findDepartmentHead(org, task);
    const taskLink = buildWorkspaceLink(current.id, 'tasks', task.id);

    const assignmentChanged = !oldTask || oldTask.assignedStaffId !== task.assignedStaffId || norm(oldTask.assignedTo) !== norm(task.assignedTo);
    if (assignmentChanged && assignee) {
      await notifyStaff(orgId, `task-assigned:${current.id}:${task.id}:${task.assignedStaffId || norm(task.assignedTo)}`, assignee, {
        subject: `GrantFlow assignment — ${current.title}`,
        heading: 'New work assigned',
        body: `You have been assigned “${task.title}” for ${opportunityContext(current)}.${task.dueDate ? `\nDue: ${task.dueDate}.` : ''}${task.notes ? `\n\n${task.notes}` : ''}`,
        actionLabel: 'Open Assignment',
        actionUrl: taskLink
      });
    }

    if (oldTask && oldTask.dueDate !== task.dueDate && task.dueDate && assignee) {
      await notifyStaff(orgId, `task-date:${current.id}:${task.id}:${task.dueDate}`, assignee, {
        subject: `Deadline updated — ${task.title}`,
        heading: 'Assignment deadline updated',
        body: `The deadline for “${task.title}” in ${opportunityContext(current)} is now ${task.dueDate}.`,
        actionLabel: 'Open Assignment',
        actionUrl: taskLink
      });
    }

    if (oldTask?.departmentReviewStatus !== task.departmentReviewStatus) {
      if (task.departmentReviewStatus === 'Submitted to Department Head' && departmentHead) {
        await notifyStaff(orgId, `hod-review:${current.id}:${task.id}:${task.lastUpdated || task.submittedAt || 'submitted'}`, departmentHead, {
          subject: `Review required — ${current.title}`,
          heading: 'Department review required',
          body: `${task.assignedTo || 'A team member'} submitted “${task.title}” for your review in ${opportunityContext(current)}.`,
          actionLabel: 'Review Work',
          actionUrl: taskLink
        });
      }

      if (task.departmentReviewStatus === 'Returned for Revision' && assignee) {
        await notifyStaff(orgId, `task-returned:${current.id}:${task.id}:${task.lastUpdated || task.reviewedAt || 'returned'}`, assignee, {
          subject: `Revision required — ${task.title}`,
          heading: 'Work returned for revision',
          body: `“${task.title}” in ${opportunityContext(current)} has been returned for revision.${task.reviewNote ? `\n\nFeedback: ${task.reviewNote}` : ''}`,
          actionLabel: 'Open Revision',
          actionUrl: taskLink
        });
      }

      if ((task.departmentReviewStatus === 'Approved' || task.departmentReviewStatus === 'Department Approved') && current.proposalLead) {
        await notifyNamedStaff(org, `department-approved:${current.id}:${task.id}:${task.lastUpdated || task.reviewedAt || 'approved'}`, current.proposalLead, {
          subject: `Department contribution approved — ${current.title}`,
          heading: 'Department contribution approved',
          body: `“${task.title}” from ${task.departmentName || 'a participating department'} has been approved and is ready for proposal coordination.`,
          actionLabel: 'Open Proposal',
          actionUrl: wsLink
        });
      }
    }

    if (oldTask?.status !== task.status && task.status === 'Blocked') {
      const body = `“${task.title}” in ${opportunityContext(current)} has been marked blocked.${task.blockerReason ? `\nReason: ${task.blockerReason}.` : ''}${task.blockerNotes ? `\n${task.blockerNotes}` : ''}`;
      if (departmentHead) {
        await notifyStaff(orgId, `task-blocked-hod:${current.id}:${task.id}:${task.lastUpdated || 'blocked'}`, departmentHead, {
          subject: `Blocked task — ${current.title}`,
          heading: 'Department task is blocked',
          body,
          actionLabel: 'Review Blocker',
          actionUrl: taskLink
        });
      }
      if (current.proposalLead) {
        await notifyNamedStaff(org, `task-blocked-lead:${current.id}:${task.id}:${task.lastUpdated || 'blocked'}`, current.proposalLead, {
          subject: `Blocked task — ${current.title}`,
          heading: 'Proposal task is blocked',
          body,
          actionLabel: 'Review Blocker',
          actionUrl: taskLink
        });
      }
    }
  }

  const prevAssignments = new Map((previous?.assignedOfficers || []).map(a => [a.id, a]));
  for (const assignment of current.assignedOfficers || []) {
    const old = prevAssignments.get(assignment.id);
    const changed = !old || old.staffId !== assignment.staffId || norm(old.staffName) !== norm(assignment.staffName);
    if (!changed) continue;
    const staff = findStaff(org, { id: assignment.staffId, name: assignment.staffName, email: assignment.staffEmail });
    if (!staff?.email && !assignment.staffEmail) continue;
    const recipient = staff?.email || assignment.staffEmail!;
    await dispatchOnce(orgId, `officer-assignment:${current.id}:${assignment.id}:${assignment.staffId || norm(assignment.staffName)}`, {
      to: recipient,
      subject: `GrantFlow proposal assignment — ${current.title}`,
      heading: 'Proposal responsibility assigned',
      body: `You have been assigned responsibility for “${assignment.responsibility}” in ${opportunityContext(current)}.${assignment.deadline ? `\nDeadline: ${assignment.deadline}.` : ''}${assignment.instructions ? `\n\n${assignment.instructions}` : ''}`,
      actionLabel: 'Open Proposal',
      actionUrl: wsLink
    });
  }

  const prevSections = new Map((previous?.applicationSections || []).map(s => [s.id, s]));
  for (const section of current.applicationSections || []) {
    const old = prevSections.get(section.id);
    if (!old || old.reviewStatus === section.reviewStatus) continue;
    const assignedStaff = findStaff(org, { id: section.assignedStaffId, name: section.assignedStaff });
    const departmentHead = findDepartmentHead(org, undefined, section);
    const sectionLink = buildWorkspaceLink(current.id, 'application');

    if (section.reviewStatus === 'Submitted to Department Head' && departmentHead) {
      await notifyStaff(orgId, `section-hod-review:${current.id}:${section.id}:${section.lastEditedAt || 'submitted'}`, departmentHead, {
        subject: `Application section ready for review — ${current.title}`,
        heading: 'Section review required',
        body: `${section.assignedStaff || 'A contributor'} submitted ${section.sectionNumber || 'an application section'} for departmental review.\n\n${section.donorQuestion}`,
        actionLabel: 'Review Section',
        actionUrl: sectionLink
      });
    }

    if (section.reviewStatus === 'Returned for Revision' && assignedStaff) {
      await notifyStaff(orgId, `section-returned:${current.id}:${section.id}:${section.reviewedAt || section.lastEditedAt || 'returned'}`, assignedStaff, {
        subject: `Section returned for revision — ${current.title}`,
        heading: 'Application section needs revision',
        body: `${section.sectionNumber || 'Your section'} has been returned for revision.${section.reviewerNotes ? `\n\nFeedback: ${section.reviewerNotes}` : ''}`,
        actionLabel: 'Open Section',
        actionUrl: sectionLink
      });
    }

    if (section.reviewStatus === 'Department Approved' && current.proposalLead) {
      await notifyNamedStaff(org, `section-approved:${current.id}:${section.id}:${section.reviewedAt || 'approved'}`, current.proposalLead, {
        subject: `Department section approved — ${current.title}`,
        heading: 'Application section ready for coordination',
        body: `${section.sectionNumber || 'An application section'} from ${section.assignedDepartment || 'a participating department'} has been approved.`,
        actionLabel: 'Open Application Workspace',
        actionUrl: sectionLink
      });
    }
  }

  if (previous?.stage !== current.stage && current.stage === 'Internal Review') {
    const reviewer = findStaff(org, { name: current.intermediateReviewer || current.reviewer });
    if (reviewer) {
      await notifyStaff(orgId, `internal-review:${current.id}:${current.updatedAt}`, reviewer, {
        subject: `Internal review required — ${current.title}`,
        heading: 'Application ready for internal review',
        body: `${opportunityContext(current)} has moved to Internal Review and requires your attention.${current.deadline ? `\nDonor deadline: ${current.deadline}.` : ''}`,
        actionLabel: 'Open Review',
        actionUrl: wsLink
      });
    }
  }

  if (previous?.stage !== current.stage && current.stage === 'Ready for Submission') {
    const approver = findStaff(org, { name: current.finalApprover || org.defaultFinalApproverName });
    if (approver) {
      await notifyStaff(orgId, `ready-for-final-approval:${current.id}:${current.updatedAt}`, approver, {
        subject: `Final authorization required — ${current.title}`,
        heading: 'Application ready for final authorization',
        body: `${opportunityContext(current)} has reached Ready for Submission and requires final authorization.${current.deadline ? `\nDonor deadline: ${current.deadline}.` : ''}`,
        actionLabel: 'Review Application',
        actionUrl: wsLink
      });
    }
  }

  const prevFinal = String(previous?.finalApprovalStatus || '');
  const nextFinal = String(current.finalApprovalStatus || '');
  if (prevFinal !== nextFinal) {
    if (['Pending Final Review', 'Pending'].includes(nextFinal)) {
      const approver = findStaff(org, { name: current.finalApprover || org.defaultFinalApproverName });
      if (approver) {
        await notifyStaff(orgId, `final-review:${current.id}:${current.updatedAt}`, approver, {
          subject: `Final approval required — ${current.title}`,
          heading: 'Application awaiting final approval',
          body: `${opportunityContext(current)} is ready for final authorization before submission.${current.deadline ? `\nDonor deadline: ${current.deadline}.` : ''}`,
          actionLabel: 'Review Application',
          actionUrl: wsLink
        });
      }
    }

    if (['Returned for Revision', 'Returned'].includes(nextFinal) && current.proposalLead) {
      await notifyNamedStaff(org, `final-returned:${current.id}:${current.updatedAt}`, current.proposalLead, {
        subject: `Final review returned — ${current.title}`,
        heading: 'Application returned from final review',
        body: `${opportunityContext(current)} has been returned for revision.${current.finalApprovalNote ? `\n\nFeedback: ${current.finalApprovalNote}` : ''}`,
        actionLabel: 'Open Application',
        actionUrl: wsLink
      });
    }

    if (['Approved for Submission', 'Approved'].includes(nextFinal) && current.proposalLead) {
      await notifyNamedStaff(org, `final-approved:${current.id}:${current.updatedAt}`, current.proposalLead, {
        subject: `Approved for submission — ${current.title}`,
        heading: 'Application approved for submission',
        body: `${opportunityContext(current)} has received final authorization and can proceed to donor submission.`,
        actionLabel: 'Open Application',
        actionUrl: wsLink
      });
    }
  }
}

function daysUntil(dateValue?: string): number | null {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export async function runDueNotificationScan(targetOrgId?: string): Promise<{ organizations: number; attempted: number; sent: number }> {
  const organizations = targetOrgId ? [db.getOrg(targetOrgId)].filter(Boolean) as OrgProfile[] : db.getAllOrgs();
  let attempted = 0;
  let sent = 0;

  for (const org of organizations) {
    if (org.isDemo) continue;
    const workspaces = db.getWorkspacesByOrg(org.id);

    for (const ws of workspaces) {
      if (ws.isDemo || ws.isTestOpportunity || ws.isDeveloperTestMode || ws.isEphemeralTest) continue;
      const wsLink = buildWorkspaceLink(ws.id, 'overview');

      for (const task of ws.tasks || []) {
        if (task.completed || ['Complete', 'Completed'].includes(task.status)) continue;
        const days = daysUntil(task.dueDate);
        if (days === null) continue;
        const assignee = findStaff(org, { id: task.assignedStaffId, name: task.assignedTo });
        if (!assignee) continue;

        let key = '';
        let subject = '';
        let heading = '';
        let body = '';
        if (days > 0 && days <= 3) {
          key = `due-soon:${ws.id}:${task.id}:${task.dueDate}`;
          subject = `Due soon — ${task.title}`;
          heading = 'Assignment deadline approaching';
          body = `“${task.title}” for ${opportunityContext(ws)} is due in ${days} day(s) (${task.dueDate}).`;
        } else if (days === 0) {
          key = `duetoday:${ws.id}:${task.id}:${task.dueDate}`;
          subject = `Due today — ${task.title}`;
          heading = 'Assignment due today';
          body = `“${task.title}” for ${opportunityContext(ws)} is due today.`;
        } else if (days < 0) {
          key = `overdue:${ws.id}:${task.id}:${task.dueDate}`;
          subject = `Overdue assignment — ${task.title}`;
          heading = 'Assignment is overdue';
          body = `“${task.title}” for ${opportunityContext(ws)} is overdue by ${Math.abs(days)} day(s).`;
        }
        if (!key) continue;

        attempted += 1;
        const result = await dispatchOnce(org.id, key, {
          to: assignee.email,
          subject,
          heading,
          body,
          actionLabel: 'Open Assignment',
          actionUrl: buildWorkspaceLink(ws.id, 'tasks', task.id)
        });
        if (result.sent) sent += 1;
      }

      const deadlineDays = daysUntil(ws.deadline);
      if (deadlineDays !== null && deadlineDays >= 0 && ws.proposalLead) {
        const lead = findStaff(org, { name: ws.proposalLead });
        if (lead) {
          const threshold = deadlineDays === 7 ? 7 : deadlineDays === 3 ? 3 : deadlineDays === 1 ? 1 : null;
          if (threshold) {
            attempted += 1;
            const result = await dispatchOnce(org.id, `proposal-deadline-${threshold}:${ws.id}:${ws.deadline}`, {
              to: lead.email,
              subject: `Donor deadline in ${threshold} day${threshold === 1 ? '' : 's'} — ${ws.title}`,
              heading: 'Proposal deadline approaching',
              body: `${opportunityContext(ws)} is due in ${threshold} day${threshold === 1 ? '' : 's'} (${ws.deadline}). Review outstanding work and submission readiness.`,
              actionLabel: 'Open Proposal',
              actionUrl: wsLink
            });
            if (result.sent) sent += 1;
          }
        }
      }
    }

    const admins = findRoleStaff(org, 'Admin');
    for (const doc of org.documentLibrary || []) {
      const days = daysUntil(doc.expiryDate);
      if (days === null || admins.length === 0) continue;
      const isExpired = days < 0;
      const isExpiring = days >= 0 && days <= 30;
      if (!isExpired && !isExpiring) continue;
      for (const admin of admins) {
        attempted += 1;
        const key = `${isExpired ? 'doc-expired' : 'doc-expiring'}:${doc.id}:${doc.expiryDate}:${admin.id}`;
        const result = await dispatchOnce(org.id, key, {
          to: admin.email,
          subject: `${isExpired ? 'Expired' : 'Document expiry alert'} — ${doc.title}`,
          heading: isExpired ? 'Institutional document has expired' : 'Institutional document expiring soon',
          body: isExpired
            ? `${doc.title} expired on ${doc.expiryDate}.`
            : `${doc.title} expires in ${days} day(s) on ${doc.expiryDate}.`,
          actionLabel: 'Open Organisation Profile',
          actionUrl: `${normalizedAppUrl()}/?profile=documents`
        });
        if (result.sent) sent += 1;
      }
    }
  }

  return { organizations: organizations.length, attempted, sent };
}

export async function sendEmailConfigurationTest(to: string, recipientName?: string): Promise<EmailSendResult> {
  return sendTransactionalEmail({
    to,
    subject: 'GrantFlow email notifications are working',
    heading: 'Email notifications are connected',
    body: `${recipientName ? `${recipientName}, ` : ''}GrantFlow can now send staff action notifications from this installation.`,
    actionLabel: 'Open GrantFlow',
    actionUrl: normalizedAppUrl(),
    footer: 'This was a configuration test. No action is required.'
  });
}

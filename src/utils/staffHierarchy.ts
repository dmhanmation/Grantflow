import { StaffMember } from '../types';

// Single source of truth for organizational hierarchy ordering.
// Lower number = more senior. Every staff roster sorts by this so people appear
// in hierarchy order regardless of the order they were onboarded.
//
// Order (top to bottom):
//   Admin                       - organisation administrator / executive owner
//   Final Approver              - executive signatory
//   Department Head / Line Mgr  - line-management tier
//   Proposal Lead               - project role, sits under line management
//   Reviewer
//   Officer / Contributor
//   Viewer
export const HIERARCHY_ORDER = [
  'Admin',
  'FinalApprover',
  'DepartmentHead',
  'ProposalLead',
  'Reviewer',
  'Officer',
  'Viewer'
] as const;

const DEPARTMENT_HEAD_RANK = HIERARCHY_ORDER.indexOf('DepartmentHead');

export const staffHierarchyRank = (s: StaffMember): number => {
  const r = s.role || s.functionalRole;
  let base: number;
  switch (r) {
    case 'Admin': base = HIERARCHY_ORDER.indexOf('Admin'); break;
    case 'FinalApprover': base = HIERARCHY_ORDER.indexOf('FinalApprover'); break;
    case 'DepartmentHead': base = HIERARCHY_ORDER.indexOf('DepartmentHead'); break;
    case 'ProposalLead': base = HIERARCHY_ORDER.indexOf('ProposalLead'); break;
    case 'Reviewer': base = HIERARCHY_ORDER.indexOf('Reviewer'); break;
    case 'Officer':
    case 'Contributor': base = HIERARCHY_ORDER.indexOf('Officer'); break;
    case 'Viewer': base = HIERARCHY_ORDER.indexOf('Viewer'); break;
    default: base = HIERARCHY_ORDER.indexOf('Officer');
  }
  // A department-head flag lifts someone into the line-management tier even if
  // their role field still says Officer or similar.
  if (s.isDepartmentHead && base > DEPARTMENT_HEAD_RANK) return DEPARTMENT_HEAD_RANK;
  return base;
};

export const sortStaffByHierarchy = (staff: StaffMember[]): StaffMember[] =>
  [...staff].sort((a, b) =>
    staffHierarchyRank(a) - staffHierarchyRank(b) ||
    (a.department || '').localeCompare(b.department || '') ||
    a.fullName.localeCompare(b.fullName)
  );

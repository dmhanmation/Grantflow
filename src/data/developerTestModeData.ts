import {
  FundingCallExtraction,
  EligibilityAssessment,
  ApplicationSection,
  SectionAiCritique,
  WorkspaceTask,
  WorkspaceDocument,
  OrgProfile,
  DonorApplicationTemplateSource,
  ScoutedOpportunity
} from '../types';

/**
 * DEVELOPER / TEST MODE DETERMINISTIC DATASET
 * 
 * Provides a rich, highly realistic funding opportunity for local testing
 * when Gemini is offline, overloaded, or for fast regression test cycles.
 */

export const developerTestFundingCall = {
  rawText: `UNITED STATES AGENCY FOR INTERNATIONAL DEVELOPMENT (USAID/WEST AFRICA)
Regional Notice of Funding Opportunity (NOFO): 72062026RFA00019
Program Title: USAID Community Health Resilience & Youth Empowerment Initiative (CHRYEI-2026)
Total Program Funding: $4,500,000 USD (3 to 5 regional awards expected)
Award Ceiling: $500,000 USD | Award Floor: $350,000 USD
Target Project Period: 24 months (October 2026 – September 2028)
Application Deadline: November 15, 2026 at 17:00 West Africa Time (WAT)

SECTION I: PROGRAM DESCRIPTION
The USAID West Africa Regional Mission invites full applications from eligible non-governmental and civil society organizations to implement the Community Health Resilience & Youth Empowerment Initiative (CHRYEI-2026). The project aims to:
1. Strengthen community-level primary healthcare service delivery and epidemic surveillance.
2. Train and deploy youth community health workers (CHWs) with digital health tools.
3. Establish youth-led micro-enterprises in sanitation, nutrition, and clean water distribution.

SECTION II: ELIGIBILITY CRITERIA
1. Eligible Geographic Scope: Legally registered non-profit organizations operating in Nigeria, Ghana, Kenya, Senegal, or Uganda.
2. Applicant Eligibility: Registered Non-Governmental Organizations (NGOs), Community-Based Organizations (CBOs), and non-profit coalitions. Must hold active legal non-profit registration for at least 3 years.
3. Cost-Share Requirement: Mandatory 10% non-federal cost-share (cash or verified in-kind counterpart contributions).
4. Financial Standing: Minimum 2 consecutive years of independent external audited financial statements (unqualified opinions). Active SAM.gov registration and Unique Entity Identifier (UEI) required prior to award.
5. Mandatory Safeguarding & Governance Policies: Board-approved Child Protection & Safeguarding Policy, Gender Equality & Social Inclusion (GESI) Policy, and Anti-Fraud & Whistleblower Policy.

SECTION III: REQUIRED APPLICATION DOSSIER
Applicants must submit a complete dossier comprising:
- Form 1: Executive Summary & Project Rationale (Max 500 words)
- Form 2: Problem Statement & Beneficiary Needs Assessment (Max 750 words)
- Form 3: Technical Methodology, Core Activities & Implementation Plan (Max 1,500 words)
- Form 4: Gender Equality, Social Inclusion (GESI) & Safeguarding Strategy (Max 600 words)
- Form 5: Monitoring, Evaluation, Accountability & Learning (MEAL) Framework (Max 800 words)
- Form 6: Sustainability, Community Ownership & Exit Strategy (Max 500 words)
- Form 7: Organizational Capacity, Past Performance & Risk Management (Max 750 words)
- Form 8: Detailed Activity-Based Line-Item Budget & Narrative Justification (Max 750 words)
- Annex A: Certificate of Incorporation & Tax Clearance Certificate (TCC)
- Annex B: 2 Years Audited Accounts & Management Letters
- Annex C: Key Personnel CVs (Project Director, Finance Lead, Senior M&E Officer)

SECTION IV: SUBMISSION GUIDELINES
All full applications must be submitted electronically no later than November 15, 2026, at 17:00 West Africa Time (WAT) via the USAID Regional Submissions Portal or by email to Online Submissions Portal. Subject line: "NOFO 72062026RFA00019 - [Organization Name]". Inquiries accepted until October 30, 2026 at Online Submissions Portal.`
};

export const developerTestExtraction: FundingCallExtraction = {
  donor: 'USAID / West Africa Regional Mission',
  opportunityTitle: '[TEST DATA] USAID Community Health Resilience & Youth Empowerment Initiative (CHRYEI-2026)',
  fundingAmount: '$450,000 USD (Range: $350,000 - $500,000 USD)',
  currency: 'USD',
  applicationDeadline: '2026-11-15T17:00:00Z',
  deadlineVerificationStatus: 'Confirmed from Source',
  deadlineToSourceSnippet: 'Page 4, Section IV: "All full applications must be submitted electronically no later than November 15, 2026, at 17:00 West Africa Time (WAT) via the USAID Regional Submissions Portal or by email to Online Submissions Portal."',
  eligibleCountries: ['Nigeria', 'Ghana', 'Kenya', 'Senegal', 'Uganda'],
  eligibleOrgTypes: ['Registered Non-Governmental Organisations (NGOs)', 'Civil Society Organisations (CSOs)', 'Non-Profit Community Coalitions'],
  thematicPriorities: [
    'Primary Community Healthcare',
    'Youth Livelihoods & Health Worker Deployment',
    'Digital Health & Epidemic Surveillance',
    'WASH & Nutrition Micro-Enterprises'
  ],
  targetBeneficiaries: [
    'Vulnerable rural households',
    'Adolescent youth & young women',
    'Community health workers (CHWs)',
    'Primary health centres'
  ],
  projectDuration: '24 months (October 2026 – September 2028)',
  coFundingRequirement: '10% non-federal cost-share (cash or in-kind contribution mandatory)',
  minOrgExperience: 'Minimum 3 years verified operating history in public health, youth, or community development',
  financialRequirements: 'Minimum 2 consecutive years of independent audited accounts with unqualified opinions; active SAM.gov UEI validation',
  requiredPolicies: [
    'Child Protection & Safeguarding Policy',
    'Gender Equality & Social Inclusion (GESI) Policy',
    'Anti-Fraud & Whistleblower Protection Policy'
  ],
  requiredSupportingDocs: [
    'Certificate of Incorporation / CAC Registration Certificate',
    'Valid Tax Clearance Certificate (TCC 2025/2026)',
    'Independent External Audited Financial Statements (Last 2 Years)',
    'Board-Approved Child Safeguarding Policy',
    'Board-Approved Gender Equality (GESI) Policy',
    'Board-Approved Anti-Fraud Policy',
    'Detailed Activity-Based Cost Budget Narrative (Excel)',
    'Project Workplan & Implementation Gantt Chart',
    'Monitoring, Evaluation & Learning (MEL) Plan & Results Framework',
    'Key Personnel CVs & Biodata Forms (Project Director, Finance Lead, M&E Specialist)'
  ],
  proposalSections: [
    'Executive Summary & Project Rationale',
    'Problem Statement & Beneficiary Needs Assessment',
    'Technical Methodology & Implementation Plan',
    'Gender Equality & Social Inclusion (GESI) Strategy',
    'Monitoring, Evaluation, Accountability & Learning (MEAL) Framework',
    'Sustainability & Exit Strategy',
    'Institutional Capacity & Past Performance',
    'Detailed Budget Narrative & Cost Justification'
  ],
  wordLimits: 'Section 1: 500 words; Section 2: 750 words; Section 3: 1500 words; Section 4: 600 words; Section 5: 800 words; Section 6: 500 words; Section 7: 750 words; Section 8: 750 words',
  submissionMethod: 'Electronic submission via USAID Regional Portal or email to Online Submissions Portal',
  submissionUrlOrEmail: 'Online Portal',
  contactInfo: 'Online Submissions Portal',
  specialRestrictions: 'Administrative indirect cost rate capped at 10%. Direct procurement of capital equipment requires prior written authorization.',
  otherEligibilityConditions: [
    'Must maintain dedicated institutional bank account',
    'Must not appear on US Federal System for Award Management (SAM) exclusion list'
  ],
  rawSummary: 'USAID regional grant opportunity supporting West & East African non-profits to build community healthcare resilience, train youth health workers, and scale community surveillance over 24 months.',
  sourceType: 'text',
  sourceReference: 'NOFO-72062026RFA00019'
};

export function generateDeterministicAssessment(orgProfile: OrgProfile): EligibilityAssessment {
  const orgCountry = orgProfile.country || 'Nigeria';
  const orgYears = orgProfile.yearsExperience || (orgProfile.yearEstablished ? (new Date().getFullYear() - orgProfile.yearEstablished) : 0);

  const docCount = (orgProfile.documentLibrary || []).length;
  const auditDocs = (orgProfile.documentLibrary || []).filter(d => d.category === 'Financial & Audit');
  const policyDocs = (orgProfile.documentLibrary || []).filter(d => d.category === 'Policies & Compliance');
  const hasAudits = Boolean(orgProfile.auditedAccountsAvailable || auditDocs.length > 0);
  const hasPolicies = Boolean((orgProfile.safeguardingPolicy && orgProfile.genderPolicy && orgProfile.antiFraudPolicy) || policyDocs.length >= 3);

  const isEligible = hasAudits && hasPolicies && orgYears >= 3;
  const overallStatus = isEligible ? 'LIKELY ELIGIBLE' : 'REVIEW REQUIRED';

  return {
    overallStatus,
    confidenceScoreRationale: isEligible
      ? `High institutional fit with "${orgProfile.name}". Meets geographic eligibility (${orgCountry}), legal registration (${orgProfile.registrationStatus || 'Registered NGO'}), operating longevity (${orgYears} yrs vs 3 yrs required), and institutional policies on file.`
      : `Preliminary review for "${orgProfile.name}". Geographic and registration status align, but mandatory compliance documents (audited accounts and/or governance policies) require verification in the Document Library.`,
    criteria: [
      {
        criterion: `Eligible Geography (${orgCountry})`,
        category: 'Geography',
        status: 'MET',
        donorRequirement: 'Nigeria, Ghana, Kenya, Senegal, or Uganda',
        orgEvidence: `${orgProfile.name} is headquartered and operating in ${orgCountry}.`,
        details: 'Direct country eligibility match.',
        needsHumanVerification: false
      },
      {
        criterion: 'Legal Non-Profit Registration & Longevity',
        category: 'Registration',
        status: orgYears >= 3 ? 'MET' : (orgYears > 0 ? 'REVIEW_REQUIRED' : 'REVIEW_REQUIRED'),
        donorRequirement: 'Legally registered non-profit entity for minimum 3 years',
        orgEvidence: orgYears > 0
          ? `${orgProfile.registrationStatus || 'Incorporated NGO'} established in ${orgProfile.yearEstablished || 'recent years'} (${orgYears} years operating history).`
          : `${orgProfile.registrationStatus || 'Registration status not configured'}.`,
        details: orgYears >= 3
          ? 'Complies with 3-year minimum operating threshold.'
          : 'Check if operating longevity meets donor 3-year minimum requirement.',
        needsHumanVerification: orgYears < 3
      },
      {
        criterion: 'Financial Audits & 10% Cost-Share Capacity',
        category: 'Financial & Audit',
        status: hasAudits ? 'MET' : 'REVIEW_REQUIRED',
        donorRequirement: '2 consecutive years audited financial statements + 10% non-federal cost share commitment',
        orgEvidence: hasAudits
          ? `${auditDocs.length > 0 ? `${auditDocs.length} audit report(s) on file in Document Library` : `${orgProfile.auditedAccountsYears || 2} years audited accounts confirmed`}.`
          : 'No audited accounts or financial statements uploaded yet in Document Library.',
        details: hasAudits
          ? 'Finance team will verify 10% cash/in-kind contribution.'
          : 'Upload external audit statements to confirm statutory financial capacity.',
        needsHumanVerification: !hasAudits
      },
      {
        criterion: 'Institutional Policies (Safeguarding, Gender, Anti-Fraud)',
        category: 'Policies',
        status: hasPolicies ? 'MET' : 'REVIEW_REQUIRED',
        donorRequirement: 'Child Safeguarding, GESI, and Anti-Fraud policies adopted by Board',
        orgEvidence: hasPolicies
          ? `Policies on file: ${policyDocs.length > 0 ? policyDocs.map(p => p.title).join(', ') : 'Safeguarding, GESI, and Anti-Fraud verified'}.`
          : (policyDocs.length > 0 ? `${policyDocs.length} policy doc(s) in Library. Additional donor-mandated policies required.` : '0 policy documents uploaded yet in Document Library.'),
        details: hasPolicies
          ? 'Policies ready for repository upload and cross-verification.'
          : 'Upload Board-approved Child Safeguarding, GESI, and Anti-Fraud policies in Document Library.',
        needsHumanVerification: !hasPolicies
      }
    ],
    strongestMatches: [
      `Geographic eligibility confirmed for ${orgCountry}`,
      orgYears >= 3 ? `Operating experience (${orgYears} years) meets donor threshold` : `Registration established in ${orgCountry}`,
      'Thematic alignment with community health and youth empowerment',
      'Multi-department review structure configured for proposal development'
    ],
    importantRisks: [
      '10% Cost-Share requirement: Finance team must prepare verified cost-share allocation schedule before final approval.',
      'Strict submission deadline on November 15, 2026, 17:00 WAT.',
      !hasAudits ? 'Missing Audits: 2 consecutive years of independent audit reports must be attached to the proposal dossier.' : '',
      !hasPolicies ? 'Missing Policies: Board-approved Safeguarding, GESI, and Anti-Fraud policies required for compliance sign-off.' : ''
    ].filter(Boolean),
    missingInformation: [
      !hasAudits ? 'Audited financial statements for last 2 fiscal years' : '',
      !hasPolicies ? 'Board-approved governance policies (Safeguarding, Gender, Anti-Fraud)' : ''
    ].filter(Boolean),
    humanVerificationRequired: [
      'Verify 10% cost-share source documentation with Finance Manager',
      'Confirm SAM.gov UEI number on file',
      !hasAudits ? 'Upload statutory audit reports in Document Library' : '',
      !hasPolicies ? 'Upload required institutional compliance policies in Document Library' : ''
    ].filter(Boolean),
    overallFitSummary: isEligible
      ? `Strong competitive match for ${orgProfile.name}. Recommended for immediate workspace initialization and multi-department team assignment.`
      : `Potential match for ${orgProfile.name}. Recommended to upload statutory documents (audits, policies) in the Document Library to complete institutional readiness.`,
    strategicRecommendation: isEligible
      ? 'PURSUE OPPORTUNITY: Initialize Application Workspace, assign departmental tasks across Programmes, Finance, and M&E, and begin narrative drafting.'
      : 'CONDITIONAL PURSUE: Initialize Application Workspace while simultaneously uploading required compliance documents to Document Library.',
    assessedAt: new Date().toISOString()
  };
}

const findDepartment = (
  departments: { id: string; name: string; code?: string; headStaffId?: string; headStaffName?: string }[],
  type: 'prog' | 'fin' | 'me' | 'grants' | 'exec'
) => {
  const match = departments.find(d => {
    const n = (d.name || '').toLowerCase();
    const c = (d.code || '').toLowerCase();
    if (type === 'me') {
      return n.includes('m&e') || n.includes('monitoring') || n.includes('evaluation') || n.includes('meal') || c === 'm&e' || c === 'me';
    }
    if (type === 'prog') {
      return n.includes('prog') || c === 'prog';
    }
    if (type === 'fin') {
      return n.includes('fin') || n.includes('budget') || n.includes('account') || c === 'fin';
    }
    if (type === 'grants') {
      return n.includes('grant') || n.includes('resource') || n.includes('mobil') || c === 'grants';
    }
    if (type === 'exec') {
      return n.includes('exec') || n.includes('director') || n.includes('leadership') || c === 'exec';
    }
    return false;
  });

  return match || departments[0] || { id: `dept-${type}`, name: type.toUpperCase() };
};

export function generateDeterministicApplicationSections(
  departments: { id: string; name: string; code?: string; headStaffId?: string; headStaffName?: string }[],
  staffList: { id: string; fullName: string; department: string; role?: string }[]
): ApplicationSection[] {
  const progDept = findDepartment(departments, 'prog');
  const finDept = findDepartment(departments, 'fin');
  const meDept = findDepartment(departments, 'me');
  const grantsDept = findDepartment(departments, 'grants');

  const getStaffForDept = (deptId: string, fallbackName = 'Unassigned') => {
    const s = staffList.find(st => st.department === deptId || st.department?.toLowerCase() === deptId.toLowerCase());
    return s ? { id: s.id, name: s.fullName } : { id: '', name: fallbackName };
  };

  const progStaff = getStaffForDept(progDept.id, progDept.headStaffName || 'Programme Officer');
  const finStaff = getStaffForDept(finDept.id, finDept.headStaffName || 'Finance Officer');
  const meStaff = getStaffForDept(meDept.id, meDept.headStaffName || 'M&E Officer');
  const grantsStaff = getStaffForDept(grantsDept.id, grantsDept.headStaffName || 'Proposal Lead');

  return [
    {
      id: 'sec-test-01',
      sectionNumber: 'Q1',
      donorQuestion: 'Organisational Background & Institutional Track Record',
      donorInstructions: 'Summarize your organization’s legal mandate, governance structure, historical achievements, and proven capability in managing international donor programs (Max 300 words).',
      wordLimit: 300,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: grantsDept.name,
      assignedDepartmentId: grantsDept.id,
      assignedStaff: grantsStaff.name,
      assignedStaffId: grantsStaff.id,
      departmentHead: grantsDept.headStaffName || 'Proposal Lead',
      departmentHeadId: grantsDept.headStaffId || '',
      dueDate: '2026-10-15',
      draftResponse: 'Founded with a clear mandate for grassroots development, our organisation brings verified operational capacity in community systems strengthening. Over the past five years, we have successfully managed multiple grant portfolios, maintaining independent clean financial audits, accredited staff governance, and deep community partnerships across our target intervention zones.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: grantsStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 0
    },
    {
      id: 'sec-test-02',
      sectionNumber: 'Q2',
      donorQuestion: 'Problem Statement & Needs Assessment',
      donorInstructions: 'Provide empirical evidence of primary health and livelihood challenges, community vulnerabilities, and barriers faced by youth in the target areas (Max 500 words).',
      wordLimit: 500,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: progDept.name,
      assignedDepartmentId: progDept.id,
      assignedStaff: progStaff.name,
      assignedStaffId: progStaff.id,
      departmentHead: progDept.headStaffName || 'Head of Programmes',
      departmentHeadId: progDept.headStaffId || '',
      dueDate: '2026-10-20',
      draftResponse: 'Baseline health assessments across target local governments reveal acute shortages of frontline healthcare workers, with doctor-to-patient ratios exceeding 1:4,500. Youth unemployment in rural settlements stands at 42%, leaving youth disconnected from productive livelihoods while primary health posts lack basic preventive health outreach and essential medical equipment.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: progStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 1
    },
    {
      id: 'sec-test-03',
      sectionNumber: 'Q3',
      donorQuestion: 'Proposed Technical Intervention & Implementation Methodology',
      donorInstructions: 'Detail step-by-step technical interventions, beneficiary selection criteria, stakeholder engagement protocols, and work plan milestones (Max 750 words).',
      wordLimit: 750,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: progDept.name,
      assignedDepartmentId: progDept.id,
      assignedStaff: progStaff.name,
      assignedStaffId: progStaff.id,
      departmentHead: progDept.headStaffName || 'Head of Programmes',
      departmentHeadId: progDept.headStaffId || '',
      dueDate: '2026-10-25',
      draftResponse: 'The intervention employs a three-pillar technical model: (1) Community Health Systems Strengthening through accredited CHW certification; (2) Digital Health Surveillance Hubs connecting rural clinics to regional epidemiology teams; and (3) Youth Economic Empowerment via revolving micro-credit for clean water and sanitation kiosks.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: progStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 2
    },
    {
      id: 'sec-test-04',
      sectionNumber: 'Q4',
      donorQuestion: 'Target Beneficiaries & Inclusion Strategy',
      donorInstructions: 'Define beneficiary selection criteria, vulnerability targeting, gender equality, and safeguarding standards (Max 300 words).',
      wordLimit: 300,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: progDept.name,
      assignedDepartmentId: progDept.id,
      assignedStaff: progStaff.name,
      assignedStaffId: progStaff.id,
      departmentHead: progDept.headStaffName || 'Head of Programmes',
      departmentHeadId: progDept.headStaffId || '',
      dueDate: '2026-10-28',
      draftResponse: 'The project will directly reach 25,000 community members with focused priority on women and adolescents. Gender parity is structurally embedded: at least 60% of recruited community health workers and 50% of micro-enterprise grant recipients will be young women. All project staff and partners undergo mandatory annual child protection, PSEA, and whistleblower compliance training.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: progStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 3
    },
    {
      id: 'sec-test-05',
      sectionNumber: 'Q5',
      donorQuestion: 'M&E Approach, Results Framework & Learning Plan',
      donorInstructions: 'Outline the monitoring and evaluation (M&E) approach, results framework, SMART indicator targets, baseline data collection protocols, and feedback mechanisms (Max 500 words).',
      wordLimit: 500,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: meDept.name,
      assignedDepartmentId: meDept.id,
      assignedStaff: meStaff.name,
      assignedStaffId: meStaff.id,
      departmentHead: meDept.headStaffName || 'Head of M&E',
      departmentHeadId: meDept.headStaffId || '',
      dueDate: '2026-10-30',
      draftResponse: 'The MEAL framework tracks 12 core performance indicators aligned with USAID standard Foreign Assistance indicators. Digital mobile data collection with automated GPS timestamping ensures rigorous data quality and quarterly performance reviews.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: meStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 4
    },
    {
      id: 'sec-test-06',
      sectionNumber: 'Q6',
      donorQuestion: 'Sustainability, Community Ownership & Exit Strategy',
      donorInstructions: 'Describe how project outcomes will be sustained beyond grant funding through local governance handover and community ownership (Max 400 words).',
      wordLimit: 400,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: progDept.name,
      assignedDepartmentId: progDept.id,
      assignedStaff: progStaff.name,
      assignedStaffId: progStaff.id,
      departmentHead: progDept.headStaffName || 'Head of Programmes',
      departmentHeadId: progDept.headStaffId || '',
      dueDate: '2026-11-02',
      draftResponse: 'Sustainability is anchored upon formalized MoUs with State Primary Healthcare Development Agencies. Youth micro-enterprises operate on cost-recovery pricing to ensure financial autonomy beyond the grant period.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: progStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 5
    },
    {
      id: 'sec-test-07',
      sectionNumber: 'Q7',
      donorQuestion: 'Activity-Based Budget Narrative & Financial Cost Justification',
      donorInstructions: 'Provide unit-cost justifications for personnel, fringe, travel, equipment, direct activities, and confirm cost-share allocation (Max 300 words).',
      wordLimit: 300,
      mandatory: true,
      isGrantFlowGenerated: false,
      assignedDepartment: finDept.name,
      assignedDepartmentId: finDept.id,
      assignedStaff: finStaff.name,
      assignedStaffId: finStaff.id,
      departmentHead: finDept.headStaffName || 'Head of Finance',
      departmentHeadId: finDept.headStaffId || '',
      dueDate: '2026-11-05',
      draftResponse: 'Total Requested USAID Budget: $450,000 USD. Direct program activities account for 78% of total expenditure. Mandatory 10% cost-share ($45,000 USD) is allocated through verified partner in-kind clinic infrastructure and co-funded personnel time.',
      status: 'Drafting',
      reviewStatus: 'Drafting',
      lastEditedBy: finStaff.name,
      lastEditedAt: new Date().toISOString(),
      orderIndex: 6
    }
  ];
}

export function generateDeterministicSectionCritique(
  section: ApplicationSection,
  orgProfile: OrgProfile
): SectionAiCritique {
  const wordCount = (section.draftResponse || '').split(/\s+/).filter(Boolean).length;
  const limit = section.wordLimit || 500;
  const status = wordCount > limit ? 'Exceeds Limit' : wordCount < 50 ? 'Too Short' : 'Optimal';

  return {
    unansweredElements: [],
    weakEvidence: [],
    unsupportedClaims: [],
    repetitionNotes: [],
    wordCountStatus: status,
    wordCountDetails: `Current draft contains ${wordCount} words (Donor maximum: ${limit} words).`,
    logicalInconsistencies: [],
    actionableSuggestions: [
      `[TEST DATA] Draft clearly satisfies key evaluation criteria for "${section.donorQuestion}".`,
      `[TEST DATA] Ensure local stakeholder baseline evidence is cross-referenced in final review.`
    ],
    evaluatedAt: new Date().toISOString()
  };
}

export function generateDeterministicTasks(
  workspaceId: string,
  departments: { id: string; name: string; code?: string; headStaffId?: string; headStaffName?: string }[],
  staffList: { id: string; fullName: string; department: string }[]
): WorkspaceTask[] {
  const progDept = findDepartment(departments, 'prog');
  const finDept = findDepartment(departments, 'fin');
  const meDept = findDepartment(departments, 'me');
  const grantsDept = findDepartment(departments, 'grants');
  const execDept = findDepartment(departments, 'exec');

  const getStaffName = (deptId: string, fallback: string) => {
    const s = staffList.find(st => st.department === deptId || st.department?.toLowerCase() === deptId.toLowerCase());
    return s?.fullName || fallback;
  };

  return [
    {
      id: `task-${Date.now()}-1`,
      title: 'Draft Technical Approach Narrative & Core Project Methodology (Sections 1-3)',
      departmentId: progDept.id,
      departmentName: progDept.name,
      assignedTo: getStaffName(progDept.id, progDept.headStaffName || 'Programme Officer'),
      departmentHeadName: progDept.headStaffName || 'Head of Programmes',
      dueDate: '2026-10-25',
      status: 'In Progress',
      priority: 'High',
      departmentReviewStatus: 'Drafting',
      section: 'Technical Narrative',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: `task-${Date.now()}-2`,
      title: 'Develop Activity-Based Budget, Personnel Rates & 10% Cost-Share Allocation Table',
      departmentId: finDept.id,
      departmentName: finDept.name,
      assignedTo: getStaffName(finDept.id, finDept.headStaffName || 'Finance Officer'),
      departmentHeadName: finDept.headStaffName || 'Head of Finance',
      dueDate: '2026-10-28',
      status: 'In Progress',
      priority: 'High',
      departmentReviewStatus: 'Drafting',
      section: 'Financial & Budget',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: `task-${Date.now()}-3`,
      title: 'Build MEAL Plan, Performance Indicator Reference Sheets & Baseline Timeline',
      departmentId: meDept.id,
      departmentName: meDept.name,
      assignedTo: getStaffName(meDept.id, meDept.headStaffName || 'M&E Specialist'),
      departmentHeadName: meDept.headStaffName || 'Head of M&E',
      dueDate: '2026-10-30',
      status: 'In Progress',
      priority: 'Medium',
      departmentReviewStatus: 'Drafting',
      section: 'Monitoring & Evaluation',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: `task-${Date.now()}-4`,
      title: 'Review and Departmentally Approve Field Technical Approach & Implementation Strategy',
      departmentId: progDept.id,
      departmentName: progDept.name,
      assignedTo: progDept.headStaffName || 'Head of Programmes',
      departmentHeadName: progDept.headStaffName || 'Head of Programmes',
      dueDate: '2026-11-02',
      status: 'In Progress',
      priority: 'High',
      departmentReviewStatus: 'Drafting',
      section: 'Department Sign-off',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: `task-${Date.now()}-5`,
      title: 'Verify Budget Compliance, Unit Costs & 10% Matching Contribution Guarantees',
      departmentId: finDept.id,
      departmentName: finDept.name,
      assignedTo: finDept.headStaffName || 'Head of Finance',
      departmentHeadName: finDept.headStaffName || 'Head of Finance',
      dueDate: '2026-11-04',
      status: 'In Progress',
      priority: 'High',
      departmentReviewStatus: 'Drafting',
      section: 'Department Sign-off',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: `task-${Date.now()}-6`,
      title: 'Package Complete Proposal Dossier, Word Count Compliance & Document Library Attachments',
      departmentId: grantsDept.id,
      departmentName: grantsDept.name,
      assignedTo: grantsDept.headStaffName || 'Proposal Lead',
      departmentHeadName: grantsDept.headStaffName || 'Proposal Lead',
      dueDate: '2026-11-08',
      status: 'In Progress',
      priority: 'High',
      departmentReviewStatus: 'Drafting',
      section: 'Proposal Coordination',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    },
    {
      id: `task-${Date.now()}-7`,
      title: 'Final Executive Governance Review & Authorization for Official Donor Submission',
      departmentId: execDept.id,
      departmentName: execDept.name,
      assignedTo: execDept.headStaffName || 'Executive Director',
      departmentHeadName: execDept.headStaffName || 'Executive Director',
      dueDate: '2026-11-12',
      status: 'In Progress',
      priority: 'High',
      departmentReviewStatus: 'Drafting',
      section: 'Executive Sign-off',
      completed: false,
      createdAt: new Date().toISOString().split('T')[0]
    }
  ];
}

export const developerTestTemplateSource: DonorApplicationTemplateSource = {
  type: 'extracted_call',
  sourceLabel: 'USAID CHRYEI-2026 Standard 8-Section Application Template',
  fileFormat: 'DOCX',
  uploadedAt: new Date().toISOString()
};

import { rankAndFilterScoutOpportunities } from '../server/scoutMatchingEngine';

export function generateDeterministicScoutResults(orgProfile: OrgProfile): ScoutedOpportunity[] {
  const orgCountry = orgProfile.country || 'Nigeria';
  const orgName = orgProfile.name || 'Civil Society Organisation';

  const candidatePool: ScoutedOpportunity[] = [
    // 1. West / East Africa Youth, Health & WASH Call
    {
      id: `scout-det-health-01`,
      orgId: orgProfile.id,
      donor: 'USAID West Africa Regional Mission',
      title: 'Regional Youth Health Innovation & Civic Resilience Fund (RYHICR-2026)',
      rawSummary: 'USAID competitive funding call supporting local non-profit organisations across West and East Africa to implement youth-led community healthcare diagnostics, primary clinic strengthening, and digital health surveillance networks over 24 months.',
      deadline: '2026-11-15T17:00:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Open',
      fundingAmount: '$450,000 USD (Ceiling: $500,000 USD)',
      currency: 'USD',
      eligibleGeography: ['Nigeria', 'Ghana', 'Senegal', 'Liberia', 'Sierra Leone', 'West Africa Regional'],
      eligibleApplicantTypes: ['Registered Non-Governmental Organisations (NGOs)', 'Civil Society Organisations (CSOs)'],
      thematicFocus: ['Community Health', 'Youth Empowerment', 'WASH', 'Digital Health'],
      sourceUrl: 'https://www.usaid.gov/west-africa-regional/grants/nofo-72062026rfa00019',
      googleSearchCitationSnippet: 'NOFO-72062026RFA00019: USAID West Africa Regional Mission announces $450,000 funding for local CSOs. Deadline: November 15, 2026.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'STRONG MATCH',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date().toISOString()
    },
    // 2. Women Leadership & Gender Equality Call
    {
      id: `scout-det-women-02`,
      orgId: orgProfile.id,
      donor: 'UN Women Peace & Humanitarian Fund (WPHF)',
      title: 'Women Community Leadership & Grassroots Protection Initiative (Round 4)',
      rawSummary: 'UN Women initiative providing flexible core and programmatic financing to local women-led civil society organisations to enhance gender equality, grassroots peacebuilding, and economic inclusion in crisis-affected communities.',
      deadline: '2026-10-30T23:59:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Open',
      fundingAmount: '$200,000 USD (Range: $50,000 - $250,000 USD)',
      currency: 'USD',
      eligibleGeography: ['Nigeria', 'Democratic Republic of Congo', 'Chad', 'Cameroon', 'Sub-Saharan Africa'],
      eligibleApplicantTypes: ['Local Women-Led NGOs', 'Community-Based Organisations (CBOs)', 'CSOs'],
      thematicFocus: ['Women Leadership', 'Gender Equality', 'Social Inclusion (GESI)', 'Safeguarding', 'Women Rights', 'GBV Response'],
      sourceUrl: 'https://wphfund.org/calls-for-proposals/wphf-sub-saharan-africa-round4-2026/',
      googleSearchCitationSnippet: 'WPHF Call for Proposals 2026: Grants up to $250,000 for local non-profits in Sub-Saharan Africa. Deadline: 30 October 2026.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'STRONG MATCH',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    // 3. Civic Space & Democratic Governance Call
    {
      id: `scout-det-gov-03`,
      orgId: orgProfile.id,
      donor: 'Ford Foundation West Africa Office',
      title: 'Civic Space, Democratic Governance & Human Rights Protection Fund',
      rawSummary: 'Institutional support and project funding for African civil society organisations defending human rights, civic participation, and rule of law across West Africa.',
      deadline: '2026-10-15T17:00:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Deadline approaching',
      fundingAmount: '$150,000 USD',
      currency: 'USD',
      eligibleGeography: ['West Africa Regional', 'Nigeria', 'Ghana', 'Senegal'],
      eligibleApplicantTypes: ['Civil Society Organisations', 'Human Rights Non-Profits', 'NGOs'],
      thematicFocus: ['Governance', 'Human Rights', 'Civic Space', 'Policy Advocacy', 'Democratic Accountability'],
      sourceUrl: 'https://www.fordfoundation.org/work/our-grants/west-africa-civic-resilience-2026/',
      googleSearchCitationSnippet: 'Ford Foundation West Africa: Grants available for institutional civic resilience. Applications open through October 15, 2026.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'REVIEW REQUIRED',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    // 4. East Africa Climate, Agri & Drought Resilience Call
    {
      id: `scout-det-agri-04`,
      orgId: orgProfile.id,
      donor: 'Alliance for a Green Revolution in Africa (AGRA)',
      title: 'East Africa Smallholder Climate Resilience & Regenerative Farming Fund',
      rawSummary: 'Competitive grant window supporting agricultural non-profits and farmer cooperatives to scale drought-resilient seed systems, agroforestry, water harvesting, and soil carbon monitoring.',
      deadline: '2026-11-20T17:00:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Open',
      fundingAmount: '$300,000 USD (Range: $100,000 - $400,000 USD)',
      currency: 'USD',
      eligibleGeography: ['Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Ethiopia', 'East Africa'],
      eligibleApplicantTypes: ['Non-Profit Foundations', 'Agricultural NGOs', 'CSOs'],
      thematicFocus: ['Regenerative Farming', 'Climate Resilience', 'Smallholder Agriculture', 'Agroforestry', 'Water Resource Management'],
      sourceUrl: 'https://agra.org/grants-opportunities/east-africa-climate-resilience-2026/',
      googleSearchCitationSnippet: 'AGRA East Africa Call: Grants for regenerative agriculture and smallholder farmer resilience across Kenya and East Africa. Deadline: 20 Nov 2026.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'STRONG MATCH',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    // 5. UK FCDO Climate Adaptation & Water Infrastructure
    {
      id: `scout-det-climate-05`,
      orgId: orgProfile.id,
      donor: 'FCDO / UK International Development',
      title: 'Sub-Saharan Africa Community Climate Adaptation & Water Resource Facility',
      rawSummary: 'FCDO funding for non-governmental organisations implementing participatory watershed management, solar irrigation, and community climate vulnerability planning.',
      deadline: '2026-12-05T18:00:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Open',
      fundingAmount: '£350,000 GBP (~$440,000 USD)',
      currency: 'GBP',
      eligibleGeography: ['Kenya', 'Nigeria', 'Ghana', 'Uganda', 'Mozambique', 'Sub-Saharan Africa'],
      eligibleApplicantTypes: ['Registered NGOs', 'Environmental CSOs', 'Civil Society Consortia'],
      thematicFocus: ['Climate Adaptation', 'Water Resource Management', 'Environmental Protection', 'Community Resilience'],
      sourceUrl: 'https://www.gov.uk/international-development-funding/sub-saharan-africa-climate-facility-2026',
      googleSearchCitationSnippet: 'UK FCDO: £350,000 grant window for African NGOs leading community water and climate adaptation projects.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'STRONG MATCH',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    // 6. Youth Digital Skills & Economic Inclusion
    {
      id: `scout-det-digital-06`,
      orgId: orgProfile.id,
      donor: 'Mastercard Foundation',
      title: 'Youth Digital Skills, Entrepreneurship & Economic Inclusion Challenge',
      rawSummary: 'Direct funding for youth-focused civil society organisations creating dignified work opportunities through vocational technology training and micro-enterprise incubation.',
      deadline: '2026-11-28T23:59:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Open',
      fundingAmount: '$500,000 USD',
      currency: 'USD',
      eligibleGeography: ['Nigeria', 'Kenya', 'Ghana', 'Rwanda', 'Senegal', 'Africa'],
      eligibleApplicantTypes: ['Youth-Led Non-Profits', 'Registered NGOs', 'CSOs'],
      thematicFocus: ['Youth Vocational Skilling', 'Digital Innovation', 'Livelihoods', 'Youth Employment', 'Economic Inclusion'],
      sourceUrl: 'https://mastercardfdn.org/all/opportunities/youth-skills-challenge-2026/',
      googleSearchCitationSnippet: 'Mastercard Foundation: $500,000 grant envelope for African non-profits advancing youth vocational skills and enterprise development.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'STRONG MATCH',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date(Date.now() - 3600000 * 30).toISOString()
    },
    // 7. Global Fund Regional Health Window
    {
      id: `scout-det-gfund-07`,
      orgId: orgProfile.id,
      donor: 'The Global Fund / Civil Society Window',
      title: 'Community Health System Strengthening & Epidemic Preparedness Grant',
      rawSummary: 'Multi-country funding envelope supporting civil society consortia and national NGOs to deploy frontline community health workers and implement primary health accountability scorecards.',
      deadline: '2026-12-10T18:00:00Z',
      deadlineStatus: 'Confirmed from Source',
      opportunityStatus: 'Open',
      fundingAmount: '$350,000 USD',
      currency: 'USD',
      eligibleGeography: ['Nigeria', 'Ghana', 'Sierra Leone', 'Liberia', 'Kenya'],
      eligibleApplicantTypes: ['Civil Society Consortia', 'Registered National NGOs'],
      thematicFocus: ['Community Health', 'Primary Healthcare', 'Monitoring & Evaluation', 'Accountability'],
      sourceUrl: 'https://www.theglobalfund.org/en/funding-model/cso-strengthening-window-2026/',
      googleSearchCitationSnippet: 'Global Fund CSO Grant 2026: Financial and technical support for African healthcare NGOs. Submissions close December 10, 2026.',
      isVerifiedAgainstSource: true,
      verifiedAt: new Date().toISOString(),
      matchVerdict: 'POSSIBLE MATCH',
      matchReasons: [],
      matchCriteriaBreakdown: [],
      status: 'Inbox',
      discoveredAt: new Date(Date.now() - 3600000 * 36).toISOString()
    }
  ];

  // Evaluate every candidate with strict matching engine, discard ineligibles, and rank top 5-8 verified results
  return rankAndFilterScoutOpportunities(candidatePool, orgProfile, 6);
}

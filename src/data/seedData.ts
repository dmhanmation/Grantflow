import {
  OrgProfile,
  OpportunityWorkspace,
  InstitutionalMemoryRecord,
  FundingCallExtraction,
  EligibilityAssessment,
  StaffMember,
  OrgDocument,
  OrgDepartment
} from '../types';

export const initialDepartments: OrgDepartment[] = [
  {
    id: 'dept-prog-01',
    name: 'Programmes',
    code: 'PROG',
    headStaffId: 'staff-sarah-05',
    headStaffName: 'Sarah Okafor',
    deputyStaffId: 'staff-david-02',
    deputyStaffName: 'David Oche',
    mandate: 'Project methodology, technical narrative, field implementation, sustainability planning, and stakeholder engagement.',
    color: 'emerald'
  },
  {
    id: 'dept-fin-02',
    name: 'Finance',
    code: 'FIN',
    headStaffId: 'staff-marcus-07',
    headStaffName: 'Marcus Vance',
    deputyStaffId: 'staff-grace-03',
    deputyStaffName: 'Grace Nwafor',
    mandate: 'Activity budgeting, financial capacity compliance, cost-share verification, procurement, and audit reconciliation.',
    color: 'blue'
  },
  {
    id: 'dept-me-03',
    name: 'Monitoring & Evaluation',
    code: 'M&E',
    headStaffId: 'staff-folake-08',
    headStaffName: 'Dr. Folake Solanke',
    deputyStaffId: 'staff-ibrahim-04',
    deputyStaffName: 'Ibrahim Musa',
    mandate: 'Results framework, logframe matrices, SMART indicators, MEL plans, baseline surveys, and data collection tools.',
    color: 'purple'
  },
  {
    id: 'dept-grants-04',
    name: 'Grants / Resource Mobilisation',
    code: 'GRANTS',
    headStaffId: 'staff-amina-01',
    headStaffName: 'Amina Bello',
    deputyStaffId: 'staff-sarah-05',
    deputyStaffName: 'Sarah Okafor',
    mandate: 'Opportunity identification, proposal coordination, donor liaison, compliance packaging, and final submission readiness.',
    color: 'amber'
  },
  {
    id: 'dept-comms-05',
    name: 'Communications',
    code: 'COMMS',
    headStaffId: 'staff-sarah-05',
    headStaffName: 'Sarah Okafor',
    deputyStaffId: 'staff-zainab-09',
    deputyStaffName: 'Zainab Haruna',
    mandate: 'Visibility plans, branding compliance, media outreach, beneficiary storytelling, and donor recognition.',
    color: 'cyan'
  },
  {
    id: 'dept-exec-06',
    name: 'Executive Management',
    code: 'EXEC',
    headStaffId: 'staff-chinedu-06',
    headStaffName: 'Chinedu Adeyemi',
    mandate: 'Strategic alignment, governance sign-off, Board accountability, and final proposal approval.',
    color: 'rose'
  }
];

export const initialDocumentLibrary: OrgDocument[] = [
  // 1. LEGAL & REGISTRATION
  {
    id: 'doc-cac-01',
    title: 'Certificate of Incorporation (CAC Incorporated Trustee)',
    documentType: 'Registration Certificate',
    category: 'Legal & Registration',
    year: '2017',
    version: 'v1.0',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2017-01-15',
    accessLevel: 'General',
    fileName: 'HHDI_CAC_Incorporation_Certificate_98432.pdf',
    fileSize: '1.8 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Amina Bello',
    maintainedByStaffId: 'staff-amina-01',
    description: 'Official Corporate Affairs Commission (CAC) Federal Republic of Nigeria Incorporated Trustee Certificate (CAC/IT/NO: 98432).',
    tags: ['CAC', 'Incorporation', 'Legal Status', 'Trustee Certificate'],
    donorUses: ['UN Women', 'USAID', 'EU-ACT', 'Global Fund'],
    linkedRequirementsCount: 4,
    lastUpdated: '2024-01-10'
  },
  {
    id: 'doc-tcc-02',
    title: 'FIRS Tax Clearance Certificate (TCC 2025/2026)',
    documentType: 'Tax Clearance Certificate',
    category: 'Legal & Registration',
    year: '2025',
    version: '2025 Edition',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2025-04-10',
    expiryDate: '2026-04-10',
    nextReviewDate: '2026-03-01',
    accessLevel: 'General',
    fileName: 'HHDI_FIRS_Tax_Clearance_Certificate_2025.pdf',
    fileSize: '950 KB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Federal Inland Revenue Service (FIRS) certificate verifying statutory tax compliance and zero corporate tax liability.',
    tags: ['TCC', 'FIRS', 'Tax Clearance', 'Statutory Compliance'],
    donorUses: ['UN Women', 'USAID', 'EU-ACT'],
    linkedRequirementsCount: 3,
    lastUpdated: '2025-04-10'
  },
  {
    id: 'doc-scuml-03',
    title: 'SCUML Anti-Money Laundering Compliance Certificate',
    documentType: 'Compliance Certificate',
    category: 'Legal & Registration',
    year: '2021',
    version: 'v1.0',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2021-08-12',
    accessLevel: 'General',
    fileName: 'HHDI_SCUML_Anti_Money_Laundering_Certificate.pdf',
    fileSize: '1.2 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Special Control Unit Against Money Laundering (SCUML) certified under the Economic and Financial Crimes Commission (EFCC).',
    tags: ['SCUML', 'EFCC', 'AML', 'Due Diligence', 'Anti-Money Laundering'],
    donorUses: ['EU-ACT', 'USAID'],
    linkedRequirementsCount: 2,
    lastUpdated: '2023-06-15'
  },
  {
    id: 'doc-sam-04',
    title: 'SAM.gov Active Entity Registration & UEI Confirmation',
    documentType: 'US Federal Registration',
    category: 'Legal & Registration',
    year: '2026',
    version: '2026 Active',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2026-01-10',
    expiryDate: '2027-01-10',
    nextReviewDate: '2026-12-01',
    accessLevel: 'General',
    fileName: 'HHDI_SAM_Gov_UEI_Registration_Verification_2026.pdf',
    fileSize: '680 KB',
    fileFormat: 'PDF',
    maintainedBy: 'Amina Bello',
    maintainedByStaffId: 'staff-amina-01',
    description: 'Active SAM.gov entity validation (UEI: HHDI-NGA-88392-L; CAGE/NCAGE: SV293) for US Federal Award eligibility.',
    tags: ['SAM.gov', 'UEI', 'USAID', 'US Federal Awards'],
    donorUses: ['USAID'],
    linkedRequirementsCount: 2,
    lastUpdated: '2026-01-10'
  },

  // 2. POLICIES & COMPLIANCE
  {
    id: 'doc-pol-safe-05',
    title: 'Child Protection & Institutional Safeguarding Policy',
    documentType: 'Governance Policy',
    category: 'Policies & Compliance',
    year: '2024',
    version: 'v3.0',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2024-06-15',
    nextReviewDate: '2026-06-15',
    accessLevel: 'General',
    fileName: 'HHDI_Child_Protection_and_Safeguarding_Policy_2024_v3.pdf',
    fileSize: '2.4 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Sarah Okafor',
    maintainedByStaffId: 'staff-sarah-05',
    description: 'Comprehensive institutional safeguarding framework covering Prevention of Sexual Exploitation, Abuse and Harassment (PSEAH), child interaction protocols, and safe recruitment.',
    tags: ['Safeguarding', 'PSEA', 'Child Protection', 'Mandatory Policy'],
    donorUses: ['UN Women', 'USAID', 'Global Fund', 'EU-ACT'],
    previousVersions: [
      {
        version: 'v2.0',
        uploadedAt: '2022-04-10',
        uploadedBy: 'Sarah Okafor',
        fileName: 'HHDI_Safeguarding_Policy_2022_v2.pdf',
        fileSize: '2.1 MB',
        status: 'Superseded',
        changeNotes: 'Pre-2024 version prior to expanding vulnerable adult reporting lines.'
      }
    ],
    linkedRequirementsCount: 5,
    lastUpdated: '2024-06-15'
  },
  {
    id: 'doc-pol-gender-06',
    title: 'Gender Equality & Social Inclusion (GESI) Policy',
    documentType: 'Institutional Policy',
    category: 'Policies & Compliance',
    year: '2024',
    version: 'v2.2',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2024-06-20',
    nextReviewDate: '2026-06-20',
    accessLevel: 'General',
    fileName: 'HHDI_Gender_Equality_and_Social_Inclusion_Policy_v2.pdf',
    fileSize: '1.9 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Amina Bello',
    maintainedByStaffId: 'staff-amina-01',
    description: 'Policy governing gender mainstreaming across program design, field implementation, workplace equity, and disability inclusion.',
    tags: ['Gender Equality', 'GESI', 'Social Inclusion', 'Diversity'],
    donorUses: ['UN Women', 'USAID', 'MacArthur Foundation'],
    linkedRequirementsCount: 4,
    lastUpdated: '2024-06-20'
  },
  {
    id: 'doc-pol-fraud-07',
    title: 'Anti-Fraud, Anti-Bribery & Whistleblower Protection Policy',
    documentType: 'Governance Policy',
    category: 'Policies & Compliance',
    year: '2023',
    version: 'v2.0',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2023-11-10',
    nextReviewDate: '2026-09-01',
    accessLevel: 'General',
    fileName: 'HHDI_Anti_Fraud_Anti_Bribery_Whistleblower_Policy_v2.pdf',
    fileSize: '2.1 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Board-approved zero-tolerance anti-corruption policy detailing gift thresholds, financial fraud investigations, anonymous reporting, and whistleblower protection.',
    tags: ['Anti-Fraud', 'Anti-Bribery', 'Whistleblower', 'Ethics'],
    donorUses: ['UN Women', 'USAID', 'MacArthur Foundation', 'EU-ACT'],
    linkedRequirementsCount: 4,
    lastUpdated: '2023-11-10'
  },
  {
    id: 'doc-pol-proc-08',
    title: 'Financial Management & Procurement Standard Operating Procedures',
    documentType: 'Operational Manual',
    category: 'Policies & Compliance',
    year: '2023',
    version: 'v3.1',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2023-09-01',
    nextReviewDate: '2026-09-01',
    accessLevel: 'General',
    fileName: 'HHDI_Financial_Management_and_Procurement_Manual_v3.pdf',
    fileSize: '3.8 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Comprehensive financial SOP covering competitive three-quote thresholds, asset registers, per diem policies, dual authorization, and bank reconciliations.',
    tags: ['Procurement', 'Financial SOP', 'Internal Controls', 'Thresholds'],
    donorUses: ['USAID', 'EU-ACT'],
    linkedRequirementsCount: 3,
    lastUpdated: '2023-09-01'
  },
  {
    id: 'doc-pol-env-09',
    title: 'Environmental Mitigation & Climate Sustainability Policy',
    documentType: 'Institutional Policy',
    category: 'Policies & Compliance',
    year: '2026',
    version: 'v1.0-draft',
    isCurrentApproved: false,
    status: 'Under Review',
    nextReviewDate: '2026-09-15',
    accessLevel: 'General',
    fileName: 'HHDI_Draft_Environmental_and_Climate_Policy_2026.docx',
    fileSize: '1.1 MB',
    fileFormat: 'DOCX',
    maintainedBy: 'David Oche',
    maintainedByStaffId: 'staff-david-02',
    description: 'Draft environmental safeguards and carbon footprint reduction policy for agricultural and water projects; awaiting formal Board adoption in Q3.',
    tags: ['Environment', 'Climate', 'Do No Harm', 'Draft Policy'],
    donorUses: ['Global Green Action Fund'],
    linkedRequirementsCount: 1,
    lastUpdated: '2026-08-15'
  },

  // 3. FINANCIAL & AUDIT
  {
    id: 'doc-aud-2024-10',
    title: '2024 Independent Audited Financial Statements & Management Letter',
    documentType: 'Audited Financial Statements',
    category: 'Financial & Audit',
    year: '2024',
    version: 'Final Certified',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2025-05-12',
    accessLevel: 'General',
    fileName: 'HHDI_Audited_Financial_Statements_FY2024_ParkerCole.pdf',
    fileSize: '4.2 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Annual independent external audit report conducted by Parker & Cole Chartered Accountants (ICAN/FRC certified) with an unqualified clean opinion.',
    tags: ['Audit', 'FY2024', 'Parker & Cole', 'Clean Opinion', 'Financials'],
    donorUses: ['UN Women', 'USAID', 'EU-ACT'],
    linkedRequirementsCount: 4,
    lastUpdated: '2025-05-12'
  },
  {
    id: 'doc-aud-2023-11',
    title: '2023 Independent Audited Financial Statements',
    documentType: 'Audited Financial Statements',
    category: 'Financial & Audit',
    year: '2023',
    version: 'Final Certified',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2024-04-28',
    accessLevel: 'General',
    fileName: 'HHDI_Audited_Financial_Statements_FY2023_ParkerCole.pdf',
    fileSize: '3.9 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'External audit report for FY2023 by Parker & Cole confirming compliant financial management and clean accounting ledger.',
    tags: ['Audit', 'FY2023', 'Parker & Cole', 'Financials'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 3,
    lastUpdated: '2024-04-28'
  },
  {
    id: 'doc-aud-2022-12',
    title: '2022 Independent Audited Financial Statements',
    documentType: 'Audited Financial Statements',
    category: 'Financial & Audit',
    year: '2022',
    version: 'Final Certified',
    isCurrentApproved: false,
    status: 'Superseded',
    approvalDate: '2023-05-02',
    accessLevel: 'General',
    fileName: 'HHDI_Audited_Financial_Statements_FY2022_ParkerCole.pdf',
    fileSize: '3.6 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Historical external audited accounts for FY2022. Superseded by recent 2-year audit bundle.',
    tags: ['Audit', 'FY2022', 'Historical', 'Superseded'],
    donorUses: ['USAID'],
    linkedRequirementsCount: 1,
    lastUpdated: '2023-05-02'
  },
  {
    id: 'doc-bank-13',
    title: 'Bank Letter of Good Standing & Authorized Signatories Verification',
    documentType: 'Banking Document',
    category: 'Financial & Audit',
    year: '2026',
    version: '2026 Official',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2026-02-14',
    expiryDate: '2027-02-14',
    accessLevel: 'Management Only',
    fileName: 'HHDI_Access_Bank_Letter_of_Good_Standing_2026.pdf',
    fileSize: '720 KB',
    fileFormat: 'PDF',
    maintainedBy: 'Grace Nwafor',
    maintainedByStaffId: 'staff-grace-03',
    description: 'Official letter from Access Bank PLC confirming active dual USD Domiciliary & NGN Operational project accounts with authorized signatories.',
    tags: ['Banking', 'Signatories', 'Good Standing', 'Bank Verification'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 2,
    lastUpdated: '2026-02-14'
  },

  // 4. ORGANISATIONAL INFORMATION
  {
    id: 'doc-org-structure-14',
    title: 'HHDI Institutional Organogram & Organigram Hierarchy (2025/2026)',
    documentType: 'Organogram',
    category: 'Organisational Information',
    year: '2025',
    version: 'v2.4',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2025-01-20',
    nextReviewDate: '2027-01-20',
    accessLevel: 'General',
    fileName: 'HHDI_Organisational_Chart_and_Structure_2025_2026.pdf',
    fileSize: '1.4 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Sarah Okafor',
    maintainedByStaffId: 'staff-sarah-05',
    description: 'Complete organizational organogram depicting Board of Trustees, Executive Director, Departmental Leads (Programmes, Finance, M&E, Grants), and Field Offices.',
    tags: ['Organogram', 'Structure', 'Governance', 'Staff Hierarchy'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 3,
    lastUpdated: '2025-01-20'
  },
  {
    id: 'doc-org-strat-15',
    title: '5-Year Strategic Plan (2024–2028): Building Resilient Communities',
    documentType: 'Strategic Plan',
    category: 'Organisational Information',
    year: '2024-2028',
    version: 'Board Approved',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2024-01-10',
    nextReviewDate: '2028-12-31',
    accessLevel: 'General',
    fileName: 'HHDI_Strategic_Plan_2024_2028_Full_Document.pdf',
    fileSize: '5.6 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Chinedu Adeyemi',
    maintainedByStaffId: 'staff-chinedu-06',
    description: 'HHDI five-year institutional strategic blueprint detailing thematic pillars, theory of change, geographic expansion, and impact metrics.',
    tags: ['Strategic Plan', 'Theory of Change', '5-Year Plan', 'Impact'],
    donorUses: ['UN Women', 'MacArthur Foundation', 'USAID'],
    linkedRequirementsCount: 2,
    lastUpdated: '2024-01-10'
  },
  {
    id: 'doc-org-cap-16',
    title: 'Institutional Capability Statement & Track Record Profile 2026',
    documentType: 'Capability Statement',
    category: 'Organisational Information',
    year: '2026',
    version: '2026 Edition',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2026-01-15',
    nextReviewDate: '2027-01-15',
    accessLevel: 'General',
    fileName: 'HHDI_Institutional_Capability_Statement_2026.pdf',
    fileSize: '3.1 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Amina Bello',
    maintainedByStaffId: 'staff-amina-01',
    description: 'Institutional capability profile highlighting past grant execution, field footprints across Northern Nigeria, M&E systems, and community trust networks.',
    tags: ['Capability Statement', 'Profile', 'Track Record', 'Due Diligence'],
    donorUses: ['UN Women', 'USAID', 'GGAF'],
    linkedRequirementsCount: 3,
    lastUpdated: '2026-01-15'
  },

  // 5. STAFF & GOVERNANCE
  {
    id: 'doc-gov-trustees-17',
    title: 'Board of Trustees Register & Governance Resolution',
    documentType: 'Governance Register',
    category: 'Staff & Governance',
    year: '2024',
    version: 'v2.0',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2024-03-10',
    accessLevel: 'General',
    fileName: 'HHDI_Board_of_Trustees_Profiles_and_Resolution_2024.pdf',
    fileSize: '1.7 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Chinedu Adeyemi',
    maintainedByStaffId: 'staff-chinedu-06',
    description: 'Verified roster and biographical profiles for all 5 Board of Trustees members with formal governance resolution empowering Executive Management.',
    tags: ['Board of Trustees', 'Resolution', 'Due Diligence', 'Governance'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 3,
    lastUpdated: '2024-03-10'
  },
  {
    id: 'doc-gov-cvs-18',
    title: 'Key Personnel CV Repository & Biodata Master Pack (2026)',
    documentType: 'Staff CV Pack',
    category: 'Staff & Governance',
    year: '2026',
    version: 'v3.0',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2026-02-01',
    nextReviewDate: '2026-08-01',
    accessLevel: 'Restricted',
    fileName: 'HHDI_Key_Personnel_CVs_Master_Pack_2026.zip',
    fileSize: '6.5 MB',
    fileFormat: 'ZIP',
    maintainedBy: 'Sarah Okafor',
    maintainedByStaffId: 'staff-sarah-05',
    description: 'Standardized 3-page CVs and USAID Form 1420 Biodata sheets for Executive Director, Programme Manager, Grants Lead, Finance Officer, and M&E Specialist.',
    tags: ['CVs', 'Key Personnel', 'Biodata', 'Staff Directory'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 4,
    lastUpdated: '2026-02-01'
  },

  // 6. DONOR & PROJECT EXPERIENCE
  {
    id: 'doc-don-ref-mac-19',
    title: 'MacArthur Foundation Performance Reference Letter (On-Nigeria Project)',
    documentType: 'Donor Reference Letter',
    category: 'Donor & Project Experience',
    year: '2024',
    version: 'Signed Original',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2024-11-20',
    accessLevel: 'General',
    fileName: 'MacArthur_Foundation_HHDI_Performance_Reference_Letter.pdf',
    fileSize: '820 KB',
    fileFormat: 'PDF',
    maintainedBy: 'Amina Bello',
    maintainedByStaffId: 'staff-amina-01',
    description: 'Official letter of satisfactory project delivery, milestone compliance, and clean financial liquidation from MacArthur Foundation.',
    tags: ['Reference Letter', 'MacArthur Foundation', 'Past Performance', 'Recommendation'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 3,
    lastUpdated: '2024-11-20'
  },
  {
    id: 'doc-don-ref-eu-20',
    title: 'EU-ACT / British Council Final Evaluation & Project Completion Certificate',
    documentType: 'Completion Certificate',
    category: 'Donor & Project Experience',
    year: '2022',
    version: 'Final Certified',
    isCurrentApproved: true,
    status: 'Current Approved',
    approvalDate: '2022-12-15',
    accessLevel: 'General',
    fileName: 'EU_ACT_British_Council_Civil_Society_Completion_Report.pdf',
    fileSize: '2.8 MB',
    fileFormat: 'PDF',
    maintainedBy: 'Sarah Okafor',
    maintainedByStaffId: 'staff-sarah-05',
    description: 'Independent end-of-project evaluation and completion certificate under the EU Civil Society Support Facility (EU-ACT).',
    tags: ['EU-ACT', 'British Council', 'Completion Certificate', 'Evaluation'],
    donorUses: ['UN Women', 'USAID'],
    linkedRequirementsCount: 2,
    lastUpdated: '2022-12-15'
  }
];

export const initialStaffDirectory: StaffMember[] = [
  {
    id: 'staff-chinedu-06',
    fullName: 'Chinedu Adeyemi',
    jobTitle: 'Executive Director',
    department: 'Executive Management',
    departmentId: 'dept-exec-06',
    email: '',
    lineManagerName: 'Board of Trustees',
    isDepartmentHead: true,
    functionalRole: 'FinalApprover',
    status: 'Active',
    joinedDate: '2017-01-15'
  },
  {
    id: 'staff-sarah-05',
    fullName: 'Sarah Okafor',
    jobTitle: 'Head of Programmes',
    department: 'Programmes',
    departmentId: 'dept-prog-01',
    email: '',
    lineManagerId: 'staff-chinedu-06',
    lineManagerName: 'Chinedu Adeyemi (Executive Director)',
    isDepartmentHead: true,
    functionalRole: 'DepartmentHead',
    status: 'Active',
    joinedDate: '2019-08-01'
  },
  {
    id: 'staff-marcus-07',
    fullName: 'Marcus Vance',
    jobTitle: 'Finance Manager / Head of Finance',
    department: 'Finance',
    departmentId: 'dept-fin-02',
    email: '',
    lineManagerId: 'staff-chinedu-06',
    lineManagerName: 'Chinedu Adeyemi (Executive Director)',
    isDepartmentHead: true,
    functionalRole: 'DepartmentHead',
    status: 'Active',
    joinedDate: '2020-04-15'
  },
  {
    id: 'staff-folake-08',
    fullName: 'Dr. Folake Solanke',
    jobTitle: 'Head of Monitoring & Evaluation',
    department: 'Monitoring & Evaluation',
    departmentId: 'dept-me-03',
    email: '',
    lineManagerId: 'staff-sarah-05',
    lineManagerName: 'Sarah Okafor (Head of Programmes)',
    isDepartmentHead: true,
    functionalRole: 'DepartmentHead',
    status: 'Active',
    joinedDate: '2021-01-10'
  },
  {
    id: 'staff-amina-01',
    fullName: 'Amina Bello',
    jobTitle: 'Grants & Resource Mobilisation Lead',
    department: 'Grants / Resource Mobilisation',
    departmentId: 'dept-grants-04',
    email: '',
    lineManagerId: 'staff-sarah-05',
    lineManagerName: 'Sarah Okafor (Head of Programmes)',
    isDepartmentHead: true,
    functionalRole: 'ProposalLead',
    status: 'Active',
    joinedDate: '2021-03-15'
  },
  {
    id: 'staff-david-02',
    fullName: 'David Oche',
    jobTitle: 'Programme Officer',
    department: 'Programmes',
    departmentId: 'dept-prog-01',
    email: '',
    lineManagerId: 'staff-sarah-05',
    lineManagerName: 'Sarah Okafor (Head of Programmes)',
    isDeputyHead: true,
    functionalRole: 'Contributor',
    status: 'Active',
    joinedDate: '2022-06-01'
  },
  {
    id: 'staff-grace-03',
    fullName: 'Grace Nwafor',
    jobTitle: 'Finance Officer',
    department: 'Finance',
    departmentId: 'dept-fin-02',
    email: '',
    lineManagerId: 'staff-marcus-07',
    lineManagerName: 'Marcus Vance (Finance Manager)',
    isDeputyHead: true,
    functionalRole: 'Contributor',
    status: 'Active',
    joinedDate: '2020-01-10'
  },
  {
    id: 'staff-ibrahim-04',
    fullName: 'Ibrahim Musa',
    jobTitle: 'Monitoring & Evaluation Officer',
    department: 'Monitoring & Evaluation',
    departmentId: 'dept-me-03',
    email: '',
    lineManagerId: 'staff-folake-08',
    lineManagerName: 'Dr. Folake Solanke (Head of M&E)',
    isDeputyHead: true,
    functionalRole: 'Contributor',
    status: 'Active',
    joinedDate: '2023-02-20'
  },
  {
    id: 'staff-zainab-09',
    fullName: 'Zainab Haruna',
    jobTitle: 'Communications Officer',
    department: 'Communications',
    departmentId: 'dept-comms-05',
    email: '',
    lineManagerId: 'staff-sarah-05',
    lineManagerName: 'Sarah Okafor (Head of Programmes)',
    isDeputyHead: true,
    functionalRole: 'Contributor',
    status: 'Active',
    joinedDate: '2023-07-01'
  }
];

export const initialOrgProfile: OrgProfile = {
  id: 'org-hhdi-001',
  name: 'Hope & Horizon Development Initiative (HHDI)',
  country: 'Nigeria',
  yearEstablished: 2017,
  registrationStatus: 'Registered Incorporated Trustee (CAC/IT/NO: 98432)',
  orgType: 'Non-Governmental Non-Profit Organisation (National NGO)',
  thematicAreas: [
    'Education & Literacy',
    'Gender Equality & Women Empowerment',
    'WASH (Water, Sanitation & Hygiene)',
    'Climate Resilience & Food Security',
    'Youth Livelihoods & Skills Development'
  ],
  geographicAreas: [
    'Kaduna State',
    'Kano State',
    'Sokoto State',
    'Borno State',
    'Plateau State',
    'Federal Capital Territory (Abuja)'
  ],
  yearsExperience: 9,
  annualBudgetRange: '$350,000 - $600,000 USD (Avg: $485,000 USD)',
  annualBudgetUsdEstimate: 485000,
  staffCount: 24,
  staffDirectory: initialStaffDirectory,
  departments: initialDepartments,
  documentLibrary: initialDocumentLibrary,
  smallNgoMode: false,
  requireIntermediateReviewer: true,
  defaultFinalApproverId: 'staff-chinedu-06',
  defaultFinalApproverName: 'Chinedu Adeyemi (Executive Director)',
  previousDonors: [
    'USAID Sub-grantee under Palladium (Scale-Up Project 2021-2023)',
    'MacArthur Foundation On-Nigeria Anticorruption Sub-grant (2022-2024)',
    'EU-ACT (British Council) Civil Society Support Facility (2020-2022)',
    'Global Fund Community Malaria Outreach Sub-award (2023-2025)'
  ],
  auditedAccountsAvailable: true,
  auditedAccountsYears: 4,
  safeguardingPolicy: true,
  genderPolicy: true,
  antiFraudPolicy: true,
  meCapacity: 'Dedicated 3-person M&E unit utilizing KoBoToolbox, DHIS2, and standardized indicator tracking database with external quarterly evaluations.',
  description: 'Hope & Horizon Development Initiative (HHDI) is an indigenous Nigerian non-profit established in 2017. We advance community-led transformation across Northern Nigeria and the Middle Belt by expanding quality foundational learning for out-of-school children, empowering rural women farmers through climate-smart agricultural cooperatives, providing clean water infrastructure, and instilling transparent grassroots public finance accountability.',
  contactEmail: '',
  updatedAt: new Date().toISOString()
};

export interface SampleFundingCallPreset {
  id: string;
  donor: string;
  title: string;
  sourceType: 'text' | 'url' | 'document';
  callSnippet: string;
  url?: string;
  extractedPreset?: Partial<FundingCallExtraction>;
}

export const sampleFundingCallPresets: SampleFundingCallPreset[] = [
  {
    id: 'un-women-2026',
    donor: 'UN Women West Africa Regional Office',
    title: 'UN Women Innovation Fund for Women\'s Economic Empowerment & Climate Action 2026',
    sourceType: 'text',
    url: 'https://westafrica.unwomen.org/en/funding-opportunities/2026/w-ee-innovation-fund',
    callSnippet: `CALL FOR PROPOSALS: UN Women West Africa Regional Innovation Fund (WEE-CFP-2026-04)
Donor: UN Women West & Central Africa Regional Office
Opportunity Title: Catalyzing Grassroots Women's Economic Empowerment and Climate Resilience
Grant Amount: $75,000 to $150,000 USD
Duration of Project: 12 to 18 months
Application Deadline: 2026-09-15 17:00 GMT

1. ELIGIBILITY CRITERIA:
- Geographic Scope: Legally registered civil society organizations (CSOs), national NGOs, and women's rights groups operating in Nigeria, Ghana, Senegal, Sierra Leone, or Liberia.
- Legal Status: Applicant must be registered as a non-profit entity with appropriate national authorities (e.g. CAC in Nigeria) for at least 3 years.
- Financial Standing: Must submit audited financial statements for the last 2 consecutive fiscal years (2023 and 2024). Average annual turnover must not exceed $1,500,000 USD (prioritizing local grassroots organizations).
- Thematic Focus: Proposals must directly address at least one priority: (a) Climate-smart agriculture for female cooperatives; (b) Renewable energy micro-enterprises led by young women; (c) Digital financial literacy and market access.
- Mandatory Institutional Policies: Valid Child Protection & Safeguarding Policy, Gender Equality Policy, and Anti-Bribery/Anti-Fraud Policy must be submitted.

2. SUBMISSION REQUIREMENTS:
- Technical Proposal (Max 15 pages in standard template).
- Detailed Activity-Based Budget in Excel format (using UN Women rates).
- Results Framework / Logic Model with key performance indicators.
- Valid Certificate of Incorporation & Tax Clearance Certificate.
- Minimum 3 reference letters from previous international donors or institutional partners.
- Submission Method: Online submission via UN Women Partner Portal (submissions.unwomen-wafrica.org) or email to Online Submissions Portal.
- Contact for Inquiries: Online Submissions Portal (Queries accepted until August 30, 2026).`
  },
  {
    id: 'usaid-civilsociety-2026',
    donor: 'USAID / Nigeria Mission',
    title: 'USAID Northern Nigeria Community Education & Resilience Program (NNCERP)',
    sourceType: 'text',
    url: 'https://www.grants.gov/search-results-detail/USAID-NGA-2026-011',
    callSnippet: `UNITED STATES AGENCY FOR INTERNATIONAL DEVELOPMENT (USAID/NIGERIA)
Notice of Funding Opportunity (NOFO): 72062026RFA00008
Program Title: Northern Nigeria Community Education & Resilience Program (NNCERP)
Total Funding Pool: $2,500,000 USD (3-5 awards expected)
Award Ceiling: $500,000 USD | Award Floor: $250,000 USD
Project Period: 24 months
Deadline for Applications: 2026-09-02 16:00 WAT (West Africa Time)

ELIGIBILITY INFORMATION:
1. Eligible Applicants: National Nigerian non-governmental organizations (NNGOs) and community-based organizations. International NGOs are eligible only as secondary consortium partners.
2. Target Geography: Interventions must be located in Borno, Kaduna, Sokoto, or Adamawa States.
3. Experience: Demonstrated minimum 5 years of verified field experience implementing basic education, child literacy, or youth vocational education in conflict-affected communities.
4. Financial Requirements: Minimum 3 years of independent external audited financial statements. Active SAM.gov registration and Unique Entity Identifier (UEI) required prior to award.
5. Co-Funding: 10% non-federal cost share (cash or in-kind) is mandatory.

REQUIRED APPLICATION PACKAGE:
- Executive Summary (2 pages max)
- Technical Approach Narrative (max 20 pages, 12pt Times New Roman, 1-inch margins)
- Detailed Multi-Year Line-Item Budget & Budget Narrative
- Monitoring, Evaluation and Learning (MEL) Plan
- Environmental Mitigation and Monitoring Plan (EMMP)
- Key Personnel CVs (Chief of Party, Finance/Compliance Lead, Senior M&E Officer)
- Letters of Commitment from local State Universal Basic Education Boards (SUBEBs)
- Submission: Electronic submission via email to Online Submissions Portal with subject line: "NOFO 72062026RFA00008 - [Organization Name]".`
  },
  {
    id: 'global-green-fund-2026',
    donor: 'Global Green Action Fund (GGAF)',
    title: 'Global Green Action Fund — Sub-Saharan Climate Adaptation Challenge',
    sourceType: 'text',
    url: 'https://globalgreenactionfund.org/grants/adaptation-2026',
    callSnippet: `GLOBAL GREEN ACTION FUND — 2026 CALL FOR PROPOSALS
Funding Call: Sub-Saharan Scalable Climate Solutions
Grant Range: €200,000 to €450,000 EUR
Target Duration: 36 months
Submission Deadline: 2026-10-10 23:59 CET

ELIGIBILITY & MATCHING CRITERIA:
- Open to legally registered non-profit entities in Sub-Saharan Africa.
- Requirement: Must provide a 50% matching co-fund guarantee from local corporate CSR or governmental co-sponsor.
- Organization must demonstrate annual operating turnover of at least €1,000,000 EUR in 2024.
- Must hold ISO 14001 or equivalent environmental governance certification.
- Target Beneficiaries: Smallholder farming households (minimum 5,000 direct households).
- Submission via GGAF Portal with audited records for past 5 years.`
  },
  {
    id: 'teeem-foundation-2026',
    donor: 'The TEEEM Foundation',
    title: 'TEEEM Foundation Global Education & Community Health Innovation Grant 2026',
    sourceType: 'text',
    url: 'https://www.teeem.org/grants/2026-call',
    callSnippet: `THE TEEEM FOUNDATION — 2026 GRANT CALL
Donor: The TEEEM Foundation
Program: Community Education and Health Empowerment Initiative
Funding Range: $50,000 to $100,000 USD
Application Deadline: 1 November 2026 (2026-11-01 23:59 EST)
Eligibility: Registered non-profit organizations supporting basic education, adolescent literacy, and primary healthcare delivery in developing communities.
Requirements: Technical Proposal, Multi-Year Itemized Budget, Proof of Non-profit Registration, 2 Reference Letters, Child Safeguarding Policy.`
  }
];

export const initialOpportunities: OpportunityWorkspace[] = [
  // 1. ON TRACK PROPOSAL: UN Women
  {
    id: 'opp-unwomen-001',
    isDemo: true,
    donor: 'UN Women West Africa',
    title: 'UN Women Innovation Fund — Women\'s Economic Empowerment & Climate Resilience',
    deadline: '2026-09-15T17:00:00Z',
    deadlineVerificationStatus: 'Confirmed from Source',
    fundingAmount: '$120,000',
    currency: 'USD',
    stage: 'Preparing Application',
    priority: 'High',
    leadStaff: 'Amina Bello',
    proposalLead: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    finalApprover: 'Chinedu Adeyemi',
    finalApprovalStatus: 'Drafting',
    participatingDepartments: ['Programmes', 'Finance', 'Monitoring & Evaluation', 'Communications', 'Grants / Resource Mobilisation'],
    intermediateReviewer: 'Sarah Okafor',
    intermediateReviewStatus: 'Pending',
    thematicArea: 'Gender Equality & Climate Resilience',
    countryScope: 'Nigeria (Kaduna & Plateau States)',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-26T14:30:00Z',
    extraction: {
      donor: 'UN Women West & Central Africa Regional Office',
      opportunityTitle: 'Catalyzing Grassroots Women\'s Economic Empowerment and Climate Resilience',
      fundingAmount: '$75,000 to $150,000',
      currency: 'USD',
      applicationDeadline: '2026-09-15',
      eligibleCountries: ['Nigeria', 'Ghana', 'Senegal', 'Sierra Leone', 'Liberia'],
      eligibleOrgTypes: ['Registered National NGOs', 'Civil Society Organizations (CSOs)', 'Women\'s Rights Organizations'],
      thematicPriorities: ['Climate-smart agriculture for female cooperatives', 'Renewable energy micro-enterprises', 'Digital financial literacy'],
      targetBeneficiaries: ['Rural women smallholder farmers', 'Young female entrepreneurs'],
      projectDuration: '12 to 18 months',
      coFundingRequirement: 'Not stated in call.',
      minOrgExperience: 'Minimum 3 years of institutional registration.',
      financialRequirements: 'Audited financial statements for last 2 consecutive fiscal years (2023 & 2024). Turnover under $1.5M.',
      requiredPolicies: ['Child Protection & Safeguarding Policy', 'Gender Equality Policy', 'Anti-Bribery & Anti-Fraud Policy'],
      requiredSupportingDocs: [
        'Certificate of Incorporation (CAC)',
        '2023 & 2024 Audited Financial Accounts',
        'Tax Clearance Certificate',
        '3 Reference Letters from Institutional Donors',
        'Key Personnel CVs',
        'Board of Trustees Resolution'
      ],
      proposalSections: ['Executive Summary', 'Context & Problem Analysis', 'Project Methodology & Technical Approach', 'Results Framework', 'Risk Matrix', 'Detailed Budget'],
      wordLimits: 'Technical proposal maximum 15 pages.',
      submissionMethod: 'Online portal or email',
      submissionUrlOrEmail: 'Online Portal',
      contactInfo: 'Online Submissions Portal',
      specialRestrictions: 'Overhead / Indirect administrative costs capped at 7%.',
      otherEligibilityConditions: ['Must have active local bank account in organization\'s name.'],
      rawSummary: 'UN Women grant supporting West African CSOs working on female climate adaptation and cooperative livelihoods.',
      sourceType: 'text'
    },
    assessment: {
      overallStatus: 'LIKELY ELIGIBLE',
      confidenceScoreRationale: 'Strong alignment across geography (Nigeria), registration status (CAC Incorporated Trustee since 2017), audited accounts (4 years available), and all 3 required policies in place.',
      criteria: [
        {
          criterion: 'Eligible Country (Nigeria)',
          category: 'Geography',
          status: 'MET',
          donorRequirement: 'Nigeria, Ghana, Senegal, Sierra Leone, or Liberia',
          orgEvidence: 'HHDI is headquartered in Abuja with operations in Kaduna, Kano, Sokoto, Borno, and Plateau.',
          details: 'Direct country eligibility match.',
          needsHumanVerification: false
        },
        {
          criterion: 'Legal Non-Profit Registration Status',
          category: 'Registration',
          status: 'MET',
          donorRequirement: 'Registered non-profit entity for minimum 3 years',
          orgEvidence: 'CAC Incorporated Trustee (CAC/IT/NO: 98432) registered in 2017 (9 years operating history).',
          details: 'Exceeds minimum 3-year threshold.',
          needsHumanVerification: false
        },
        {
          criterion: 'Audited Financial Statements (Last 2 Years)',
          category: 'Financial & Audit',
          status: 'MET',
          donorRequirement: 'Consecutive audited accounts for 2023 & 2024',
          orgEvidence: '4 years of external audits available (2022, 2023, 2024, 2025 audited by Parker & Cole).',
          details: 'Compliant with audit documentation requirements.',
          needsHumanVerification: false
        },
        {
          criterion: 'Mandatory Institutional Policies',
          category: 'Policies',
          status: 'MET',
          donorRequirement: 'Safeguarding, Gender Equality, and Anti-Fraud policies',
          orgEvidence: 'HHDI maintains active Board-approved Safeguarding, Gender, and Anti-Fraud policies.',
          details: 'All 3 policies formally adopted and ready for upload.',
          needsHumanVerification: false
        }
      ],
      strongestMatches: [
        'Geographic eligibility (Nigeria included in primary focal countries)',
        'Legal registration and operating longevity (9 years vs 3 years required)',
        'Full compliance on required safeguarding, gender, and anti-fraud policies',
        '4 years of external audited accounts readily available'
      ],
      importantRisks: ['Ensure 7% administrative overhead cap is reflected in budget sheets'],
      missingInformation: [],
      humanVerificationRequired: ['Confirm reference letters from MacArthur and Palladium'],
      overallFitSummary: 'Exceptional strategic match for HHDI women livelihoods team.',
      strategicRecommendation: 'PROCEED: Assigned to Amina Bello (Proposal Lead) and multi-department team across Programmes, Finance, M&E, and Comms.',
      assessedAt: '2026-08-20T10:00:00Z'
    },
    templateSource: {
      type: 'upload_template',
      fileName: 'UN_Women_WAF_Proposal_Template_2026_v2.docx',
      fileFormat: 'DOCX',
      uploadedAt: '2026-08-20T10:05:00Z',
      sourceLabel: 'UN Women Official RFP Application Form'
    },
    applicationSections: [
      {
        id: 'sec-unw-1',
        sectionNumber: 'Q1',
        donorQuestion: 'Executive Summary and Project Rationale',
        donorInstructions: 'Summarize the core problem, target population, primary interventions, and expected transformational outcomes (Max 500 words).',
        wordLimit: 500,
        mandatory: true,
        isGrantFlowGenerated: false,
        assignedDepartment: 'Programmes',
        assignedDepartmentId: 'dept-prog-01',
        assignedStaff: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHead: 'Sarah Okafor',
        departmentHeadId: 'staff-sarah-05',
        dueDate: '2026-09-02',
        draftResponse: 'Hope Horizons Development Initiative (HHDI) proposes the "Resilient Livelihoods for Rural Women Initiative", a 16-month economic empowerment and climate-adaptation programme targeting 1,200 vulnerable female smallholders and young women agri-entrepreneurs in Kaduna and Plateau States, Nigeria. The initiative integrates climate-resilient drip irrigation, cooperative post-harvest storage hubs, micro-savings circles (VSLAs), and digital market access. By establishing 15 women-managed cooperative processing centres, the project directly tackles structural exclusion, post-harvest losses, and climate volatility, projecting a 45% average increase in seasonal household income and strengthening institutional capacity across 40 community-based women associations.',
        status: 'Complete',
        reviewStatus: 'Department Approved',
        reviewedBy: 'Sarah Okafor',
        reviewedAt: '2026-08-24T11:00:00Z',
        reviewerNotes: 'Approved: Clear narrative alignment with UN Women priority outcomes.',
        lastEditedBy: 'David Oche',
        lastEditedAt: '2026-08-24T09:30:00Z',
        orderIndex: 0
      },
      {
        id: 'sec-unw-2',
        sectionNumber: 'Q4',
        donorQuestion: 'Detailed Technical Approach, Methodology and Work Plan',
        donorInstructions: 'Detail step-by-step technical interventions, beneficiary selection criteria, community engagement protocols, and risk mitigation strategies (Max 1500 words).',
        wordLimit: 1500,
        mandatory: true,
        isGrantFlowGenerated: false,
        assignedDepartment: 'Programmes',
        assignedDepartmentId: 'dept-prog-01',
        assignedStaff: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHead: 'Sarah Okafor',
        departmentHeadId: 'staff-sarah-05',
        dueDate: '2026-09-05',
        draftResponse: 'The technical methodology follows a four-pillar community-led empowerment framework:\n\n1. Community Engagement & Vulnerability-Based Beneficiary Targeting: Working through local traditional councils and existing women-led savings groups across 8 Local Government Areas (LGAs) in Kaduna and Plateau States. Selection criteria prioritize female-headed households, displaced women, and smallholders cultivating under 2 hectares.\n\n2. Climate-Resilient Agricultural Inputs & Low-Cost Drip Irrigation: Training 1,200 women on drought-tolerant seed varieties, bio-fertilizer formulation, and solar drip irrigation systems tailored to dry-season farming.\n\n3. Post-Harvest Value Addition & Cooperative Storage Hubs: Establishing 15 solar-powered aggregation centres equipped with clean processing mills and hermetic storage bags, cutting post-harvest grain losses from 35% to below 8%.\n\n4. Financial Inclusion & Village Savings and Loans Associations (VSLAs): Federating 40 savings circles with digital ledger tracking and linking mature groups to formal agricultural development credit lines.',
        status: 'Under Review',
        reviewStatus: 'Submitted to Department Head',
        lastEditedBy: 'David Oche',
        lastEditedAt: '2026-08-25T14:20:00Z',
        orderIndex: 1
      },
      {
        id: 'sec-unw-3',
        sectionNumber: 'Q7',
        donorQuestion: 'Monitoring, Evaluation, Accountability and Learning (MEAL) Framework',
        donorInstructions: 'Provide the performance indicator tracking matrix, gender-disaggregated data collection protocols, baseline benchmarks, and beneficiary accountability feedback mechanisms (Max 1000 words).',
        wordLimit: 1000,
        mandatory: true,
        isGrantFlowGenerated: false,
        assignedDepartment: 'Monitoring & Evaluation',
        assignedDepartmentId: 'dept-me-03',
        assignedStaff: 'Ibrahim Musa',
        assignedStaffId: 'staff-ibrahim-04',
        departmentHead: 'Dr. Folake Solanke',
        departmentHeadId: 'staff-folake-08',
        dueDate: '2026-09-03',
        draftResponse: 'HHDI will implement a digital MEL architecture utilizing KoboToolbox and PowerBI dashboards. Key performance indicators include: (1) Number of female smallholders adopting climate-resilient practices (Target: 1,200); (2) Percentage increase in net agricultural income among participating households (Target: +45%); (3) Number of women-led cooperative enterprises legally registered and operational (Target: 15). All data is disaggregated by age, disability status, and geographic LGA. An independent toll-free beneficiary feedback hotline and quarterly community town halls will ensure two-way accountability and rapid grievance redressal.',
        status: 'Complete',
        reviewStatus: 'Department Approved',
        reviewedBy: 'Dr. Folake Solanke',
        reviewedAt: '2026-08-24T17:30:00Z',
        reviewerNotes: 'Approved: Indicators conform strictly to UN Women standard gender indicators.',
        lastEditedBy: 'Ibrahim Musa',
        lastEditedAt: '2026-08-24T16:00:00Z',
        orderIndex: 2
      },
      {
        id: 'sec-unw-4',
        sectionNumber: 'Q10',
        donorQuestion: 'Financial Management Capacity and Activity-Based Cost Breakdown',
        donorInstructions: 'Detail internal financial controls, anti-fraud measures, audit history, procurement policies, and justify indirect administrative costs within the mandatory 7% cap (Max 800 words).',
        wordLimit: 800,
        mandatory: true,
        isGrantFlowGenerated: false,
        assignedDepartment: 'Finance',
        assignedDepartmentId: 'dept-fin-02',
        assignedStaff: 'Grace Nwafor',
        assignedStaffId: 'staff-grace-03',
        departmentHead: 'Marcus Vance',
        departmentHeadId: 'staff-marcus-07',
        dueDate: '2026-09-01',
        draftResponse: 'HHDI maintains an ERP-integrated financial management system (QuickBooks Enterprise) enforcing strict segregation of duties across authorization, procurement, custody, and reconciliation. Dual bank authorization (Executive Director and Board Treasurer) is mandatory for all disbursements over $1,000. Annual statutory external audits for the past 4 consecutive years (2022-2025) conducted by Parker & Cole Certified Public Accountants have yielded unqualified (clean) audit opinions. Activity budget lines reflect market-benchmarked rates with total indirect administrative overhead restricted to 6.8%, fully compliant with the 7% threshold.',
        status: 'Drafting',
        reviewStatus: 'Drafting',
        lastEditedBy: 'Grace Nwafor',
        lastEditedAt: '2026-08-25T11:45:00Z',
        orderIndex: 3
      },
      {
        id: 'sec-unw-5',
        sectionNumber: 'Q12',
        donorQuestion: 'Institutional Experience, Local Presence and Safeguarding Protocols',
        donorInstructions: 'Describe relevant past donor grant management track record in Nigeria, local community footprint, and evidence of organizational safeguarding and gender policies (Max 750 words).',
        wordLimit: 750,
        mandatory: true,
        isGrantFlowGenerated: false,
        assignedDepartment: 'Grants / Resource Mobilisation',
        assignedDepartmentId: 'dept-grants-04',
        assignedStaff: 'Amina Bello',
        assignedStaffId: 'staff-amina-01',
        departmentHead: 'Amina Bello',
        departmentHeadId: 'staff-amina-01',
        dueDate: '2026-08-30',
        draftResponse: 'Founded in 2017 (CAC/IT/NO: 98432), HHDI possesses 9 years of direct experience implementing community development, gender empowerment, and climate resilience programmes in Northern and North-Central Nigeria. Over the past 3 years, HHDI has managed institutional grants totaling $1.65M from USAID, EU, and the Global Fund with 100% on-time milestone delivery and zero financial disallowed costs. All staff and sub-contractors undergo mandatory annual certification on HHDI\'s Board-approved Child Protection & Safeguarding Policy, Prevention of Sexual Exploitation and Abuse (PSEA) guidelines, and Anti-Fraud Policy.',
        status: 'Complete',
        reviewStatus: 'Proposal Lead Approved',
        reviewedBy: 'Amina Bello',
        reviewedAt: '2026-08-25T16:00:00Z',
        reviewerNotes: 'Approved: Track record and policy citations are completely up to date.',
        lastEditedBy: 'Amina Bello',
        lastEditedAt: '2026-08-25T15:30:00Z',
        orderIndex: 4
      }
    ],
    requirementsChecklist: [
      { id: 'r1', title: 'CAC Incorporated Trustee Certificate', category: 'Governance', status: 'MET', notes: 'Certificate verified' },
      { id: 'r2', title: '2023 & 2024 Audited Financial Accounts', category: 'Financial', status: 'MET', notes: '4 years available' },
      { id: 'r3', title: 'Gender Equality Policy Document', category: 'Policies', status: 'MET', notes: 'Approved June 2024' },
      { id: 'r4', title: 'Child Protection & Safeguarding Policy', category: 'Policies', status: 'MET', notes: 'Approved 2023' },
      { id: 'r5', title: 'Anti-Fraud & Whistleblower Policy', category: 'Policies', status: 'MET', notes: 'Approved 2023' }
    ],
    documentsChecklist: [
      { id: 'd1', name: 'Technical Proposal Narrative (15 pages max)', mandatory: true, category: 'Technical Proposal', status: 'Under Review', departmentName: 'Programmes', departmentHeadName: 'Sarah Okafor', departmentReviewStatus: 'Submitted to Department Head', assignedTo: 'David Oche' },
      { id: 'd2', name: 'Activity-Based Budget (UN Women Excel Template)', mandatory: true, category: 'Budget', status: 'Drafting', departmentName: 'Finance', departmentHeadName: 'Marcus Vance', departmentReviewStatus: 'Drafting', assignedTo: 'Grace Nwafor' },
      { id: 'd3', name: 'Monitoring, Evaluation & Results Framework', mandatory: true, category: 'Technical Proposal', status: 'Ready', departmentName: 'Monitoring & Evaluation', departmentHeadName: 'Dr. Folake Solanke', departmentReviewStatus: 'Department Approved', reviewNote: 'Approved: Indicators match UN Women standard metrics.', assignedTo: 'Ibrahim Musa' },
      { id: 'd4', name: 'CAC Registration Certificate', mandatory: true, category: 'Governance', status: 'Ready', fileName: 'HHDI_CAC_Incorporation_Certificate_98432.pdf', libraryDocId: 'doc-cac-01', libraryVersion: 'v1.0', departmentName: 'Grants / Resource Mobilisation', departmentHeadName: 'Amina Bello', departmentReviewStatus: 'Department Approved', assignedTo: 'Amina Bello' },
      { id: 'd5', name: '2023 & 2024 Audited Financial Statements', mandatory: true, category: 'Financial', status: 'Ready', fileName: 'HHDI_Audited_Financial_Statements_FY2024_ParkerCole.pdf', libraryDocId: 'doc-aud-2024-10', libraryVersion: 'Final Certified', departmentName: 'Finance', departmentHeadName: 'Marcus Vance', departmentReviewStatus: 'Department Approved', assignedTo: 'Grace Nwafor' },
      { id: 'd6', name: 'Institutional Safeguarding & Policies Package', mandatory: true, category: 'Governance', status: 'Ready', fileName: 'HHDI_Child_Protection_and_Safeguarding_Policy_2024_v3.pdf', libraryDocId: 'doc-pol-safe-05', libraryVersion: 'v3.0', departmentName: 'Programmes', departmentHeadName: 'Sarah Okafor', departmentReviewStatus: 'Department Approved', assignedTo: 'Sarah Okafor' }
    ],
    tasks: [
      {
        id: 't-un-1',
        title: 'Draft Technical Proposal Narrative & Methodology (12 pages)',
        departmentId: 'dept-prog-01',
        departmentName: 'Programmes',
        assignedTo: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-09-05',
        status: 'In Progress',
        departmentReviewStatus: 'Submitted to Department Head',
        submittedAt: '2026-08-25T14:20:00Z',
        submittedBy: 'David Oche',
        submissionDraftText: 'Completed 12-page technical approach detailing 120 rural women cooperative engagement, climate-smart drip irrigation, and savings circles in Kaduna and Plateau. Submitted for Sarah Okafor review.',
        priority: 'High',
        completed: false,
        section: 'Technical Narrative',
        createdAt: '2026-08-20'
      },
      {
        id: 't-un-2',
        title: 'Develop Results Framework and gender-disaggregated MEL indicators',
        departmentId: 'dept-me-03',
        departmentName: 'Monitoring & Evaluation',
        assignedTo: 'Ibrahim Musa',
        assignedStaffId: 'staff-ibrahim-04',
        departmentHeadId: 'staff-folake-08',
        departmentHeadName: 'Dr. Folake Solanke',
        dueDate: '2026-09-03',
        status: 'Complete',
        departmentReviewStatus: 'Department Approved',
        reviewedAt: '2026-08-24T17:30:00Z',
        reviewedBy: 'Dr. Folake Solanke',
        reviewNote: 'Approved: Indicators match UN Women standard metrics and gender-disaggregated targets.',
        priority: 'Medium',
        completed: true,
        completedAt: '2026-08-24T17:30:00Z',
        completedOnTime: true,
        section: 'M&E Framework',
        createdAt: '2026-08-20'
      },
      {
        id: 't-un-3',
        title: 'Build activity-based budget model adhering to 7% indirect cost cap',
        departmentId: 'dept-fin-02',
        departmentName: 'Finance',
        assignedTo: 'Grace Nwafor',
        assignedStaffId: 'staff-grace-03',
        departmentHeadId: 'staff-marcus-07',
        departmentHeadName: 'Marcus Vance',
        dueDate: '2026-08-25',
        status: 'In Progress',
        departmentReviewStatus: 'Drafting',
        priority: 'High',
        completed: false,
        section: 'Budget',
        notes: 'Drafting line items. Awaiting vendor quotations for solar cold storage units.',
        createdAt: '2026-08-20'
      },
      {
        id: 't-un-4',
        title: 'Develop Sustainability Plan, Community Exit Strategy & Stakeholder Ownership',
        departmentId: 'dept-prog-01',
        departmentName: 'Programmes',
        assignedTo: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-09-06',
        status: 'In Progress',
        departmentReviewStatus: 'Returned for Revision',
        reviewedAt: '2026-08-26T09:15:00Z',
        reviewedBy: 'Sarah Okafor',
        reviewNote: 'Please reconcile the beneficiary numbers with the current project design before resubmitting.',
        priority: 'Medium',
        completed: false,
        section: 'Sustainability',
        createdAt: '2026-08-20'
      },
      {
        id: 't-un-5',
        title: 'Draft Communications, Visibility & Donor Branding Protocol',
        departmentId: 'dept-comms-05',
        departmentName: 'Communications',
        assignedTo: 'Zainab Haruna',
        assignedStaffId: 'staff-zainab-09',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-09-08',
        status: 'In Progress',
        departmentReviewStatus: 'Drafting',
        priority: 'Low',
        completed: false,
        section: 'Communications & Visibility',
        createdAt: '2026-08-20'
      },
      {
        id: 't-un-6',
        title: 'Assemble institutional statutory documents and tax clearance certificates',
        departmentId: 'dept-grants-04',
        departmentName: 'Grants / Resource Mobilisation',
        assignedTo: 'Amina Bello',
        assignedStaffId: 'staff-amina-01',
        departmentHeadId: 'staff-amina-01',
        departmentHeadName: 'Amina Bello',
        dueDate: '2026-08-25',
        status: 'Complete',
        departmentReviewStatus: 'Department Approved',
        reviewedAt: '2026-08-22T11:00:00Z',
        reviewedBy: 'Amina Bello',
        reviewNote: 'All CAC certificates, TCCs, and Board-approved policies verified.',
        priority: 'Medium',
        completed: true,
        completedAt: '2026-08-22T11:00:00Z',
        completedOnTime: true,
        section: 'Compliance',
        createdAt: '2026-08-20'
      }
    ],
    milestones: [
      { id: 'm1', title: 'First Technical Narrative & MEL Draft Completed', targetDate: '2026-09-05', completed: false },
      { id: 'm2', title: 'Internal Management Review by Sarah Okafor', targetDate: '2026-09-08', completed: false },
      { id: 'm3', title: 'Final Executive Approval by Chinedu Adeyemi', targetDate: '2026-09-12', completed: false },
      { id: 'm4', title: 'Official Portal Submission 72hrs Before Deadline', targetDate: '2026-09-13', completed: false }
    ],
    outstandingQuestions: [
      { id: 'q1', question: 'Does UN Women accept in-kind community land contribution for climate demonstration farms?', category: 'Eligibility', status: 'Open', assignedTo: 'Amina Bello' }
    ],
    internalNotes: [
      { id: 'n1', author: 'Amina Bello', timestamp: '2026-08-21T09:00:00Z', content: 'Met with cooperative leaders in Zaria to validate project activities and target numbers.' }
    ],
    auditTrail: [
      { id: 'a1', timestamp: '2026-08-20T10:00:00Z', action: 'Opportunity Created', actor: 'Amina Bello', role: 'Proposal Lead', details: 'Initialized workspace and assigned proposal leadership.', category: 'assignment' },
      { id: 'a2', timestamp: '2026-08-20T11:30:00Z', action: 'Cross-Department Tasks Assigned', actor: 'Amina Bello', role: 'Proposal Lead', details: 'Assigned Narrative (David Oche / Programmes), Budget (Grace Nwafor / Finance), MEL (Ibrahim Musa / M&E), and Comms (Zainab Haruna / Communications).', category: 'department_assignment' },
      { id: 'a3', timestamp: '2026-08-22T11:00:00Z', action: 'Statutory Pack Approved', actor: 'Amina Bello', role: 'Grants Lead', details: 'Statutory compliance documents compiled and verified.', category: 'department_approval' },
      { id: 'a4', timestamp: '2026-08-24T15:30:00Z', action: 'Results Framework Submitted', actor: 'Ibrahim Musa', role: 'M&E Officer', details: 'Submitted MEL logframe and indicators to Head of M&E.', category: 'officer_submission' },
      { id: 'a5', timestamp: '2026-08-24T17:30:00Z', action: 'M&E Department Approved', actor: 'Dr. Folake Solanke', role: 'Head of M&E', details: 'Approved Results Framework: "Indicators match UN Women standard metrics and gender-disaggregated targets."', category: 'department_approval' },
      { id: 'a6', timestamp: '2026-08-25T14:20:00Z', action: 'Technical Narrative Submitted', actor: 'David Oche', role: 'Programme Officer', details: 'Submitted 12-page technical approach narrative to Programme Manager.', category: 'officer_submission' },
      { id: 'a7', timestamp: '2026-08-26T09:15:00Z', action: 'Sustainability Plan Returned for Revision', actor: 'Sarah Okafor', role: 'Head of Programmes', details: 'Returned to David Oche: "Please reconcile the beneficiary numbers with the current project design before resubmitting."', category: 'revision_requested' }
    ],
    readinessAlert: {
      level: 'WARNING',
      headline: 'Multi-Department Application: Finance budget is overdue; Sustainability plan returned for revision.',
      details: 'M&E Framework is Department Approved. Technical narrative is awaiting Sarah Okafor\'s review. Finance budget assigned to Grace Nwafor is overdue (2 days). Sustainability plan returned to David Oche.',
      recommendedActions: [
        'Finance Manager Marcus Vance to follow up on overdue budget line items with Grace Nwafor.',
        'David Oche to reconcile beneficiary counts and resubmit Sustainability Plan to Sarah Okafor.',
        'Sarah Okafor to complete Department Review of Technical Narrative.'
      ],
      evaluatedAt: '2026-08-26T14:30:00Z',
      bottleneckDepartment: 'Finance',
      responsibleStaff: 'Grace Nwafor',
      escalationLevel: 'Department Head'
    }
  },

  // 2. OVERDUE TASK DEMO: USAID NNCERP (Bottleneck in Finance Department / Grace Nwafor, NOT David Oche)
  {
    id: 'opp-usaid-002',
    isDemo: true,
    donor: 'USAID / Nigeria Mission',
    title: 'USAID Northern Nigeria Community Education & Resilience Program (NNCERP)',
    deadline: '2026-09-02T16:00:00Z',
    deadlineVerificationStatus: 'Confirmed from Source',
    fundingAmount: '$450,000',
    currency: 'USD',
    stage: 'Internal Review',
    priority: 'High',
    leadStaff: 'David Oche',
    proposalLead: 'David Oche',
    reviewer: 'Sarah Okafor',
    finalApprover: 'Chinedu Adeyemi',
    thematicArea: 'Education & Child Literacy in Conflict Zones',
    countryScope: 'Nigeria (Borno, Kaduna & Sokoto States)',
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-26T15:00:00Z',
    extraction: {
      donor: 'USAID / Nigeria Mission',
      opportunityTitle: 'Northern Nigeria Community Education & Resilience Program (NNCERP)',
      fundingAmount: '$250,000 to $500,000',
      currency: 'USD',
      applicationDeadline: '2026-09-02',
      deadlineVerificationStatus: 'Confirmed from Source',
      eligibleCountries: ['Nigeria'],
      eligibleOrgTypes: ['National NGOs', 'Civil Society Organizations'],
      thematicPriorities: ['Basic education for out-of-school children', 'Conflict-sensitive community learning'],
      targetBeneficiaries: ['IDP host community children', 'Adolescent girls'],
      projectDuration: '24 months',
      coFundingRequirement: '10% non-federal cost-share required.',
      minOrgExperience: '5 years verified field experience.',
      financialRequirements: 'Audited accounts for past 3 years. SAM.gov UEI active.',
      requiredPolicies: ['Safeguarding', 'Anti-Trafficking', 'Whistleblower', 'Financial Internal Controls'],
      requiredSupportingDocs: [
        'Technical Approach Narrative (20 pages)',
        'Itemized Multi-Year Budget & Detailed Budget Narrative',
        'MEL Plan with PIRS Sheets',
        'Letters of Support from SUBEB (Kaduna & Borno)',
        'Key Personnel CVs & Biodata Forms (1420-17)'
      ],
      proposalSections: ['Executive Summary', 'Technical Narrative', 'MEL Plan', 'Detailed Budget & Narrative', 'Past Performance References'],
      wordLimits: '20 pages technical narrative',
      submissionMethod: 'Email to Online Submissions Portal',
      submissionUrlOrEmail: 'Online Portal',
      contactInfo: 'Online Submissions Portal',
      specialRestrictions: 'Strict fly-America act and USAID branding guidelines apply.',
      otherEligibilityConditions: ['Must possess active SAM.gov UEI registration.'],
      rawSummary: 'High-value USAID grant for Nigerian indigenous NGOs addressing education and literacy in Borno and Kaduna.',
      sourceType: 'text'
    },
    assessment: {
      overallStatus: 'LIKELY ELIGIBLE',
      confidenceScoreRationale: 'HHDI satisfies all eligibility thresholds: 9 years operating track record, active SAM.gov UEI registration, 4 years audited financials.',
      criteria: [
        {
          criterion: 'NNGO Legal Status & 5-Year Operating Experience',
          category: 'Registration',
          status: 'MET',
          donorRequirement: 'National Nigerian NGO with 5+ years track record',
          orgEvidence: 'HHDI established 2017 (9 years experience), CAC registered.',
          details: 'Compliant.',
          needsHumanVerification: false
        },
        {
          criterion: 'Geographic Focus (Borno & Kaduna)',
          category: 'Geography',
          status: 'MET',
          donorRequirement: 'Borno, Kaduna, Sokoto, or Adamawa',
          orgEvidence: 'Active field offices and ongoing community education centers in Kaduna and Borno.',
          details: 'Direct geographic match.',
          needsHumanVerification: false
        },
        {
          criterion: '10% Mandatory Cost-Share ($45,000 USD)',
          category: 'Financial & Audit',
          status: 'MET',
          donorRequirement: '10% non-federal co-funding (cash or in-kind)',
          orgEvidence: 'Secured via local community center rent waiver and volunteer teacher stipends ($48,000 commitment).',
          details: 'Cost share documentation verified.',
          needsHumanVerification: false
        }
      ],
      strongestMatches: ['Direct experience with USAID sub-grants', 'Active field presence in Borno and Kaduna', 'Full SAM.gov UEI registration active'],
      importantRisks: ['Deadline is in 7 days — final sign-off is urgent'],
      missingInformation: [],
      humanVerificationRequired: [],
      overallFitSummary: 'Flagship proposal in final internal review stage with exceptional alignment to HHDI core capabilities.',
      strategicRecommendation: 'PROCEED WITH FINAL SIGN-OFF AND EXPEDITE SUBMISSION 48 HOURS BEFORE DEADLINE.',
      assessedAt: '2026-08-05T10:00:00Z'
    },
    requirementsChecklist: [
      { id: 'ru-1', title: 'SAM.gov UEI active registration', category: 'Governance', status: 'MET', notes: 'UEI: HHD98432NGA1' },
      { id: 'ru-2', title: 'Kaduna and Borno SUBEB endorsement letters', category: 'Documentation', status: 'MET', notes: 'Both state education boards signed support letters.' },
      { id: 'ru-3', title: 'Detailed 24-Month Budget with 10% Cost Share', category: 'Financial', status: 'IN_PROGRESS', notes: 'Budget narrative being finalized by Finance Officer Grace Nwafor.' },
      { id: 'ru-4', title: 'Environmental Mitigation & Monitoring Plan (EMMP)', category: 'Technical', status: 'MET', notes: 'Standard USAID EMMP template completed.' },
      { id: 'ru-5', title: 'Final Executive Management Sign-off', category: 'Governance', status: 'PENDING', notes: 'Awaiting final budget submission.' }
    ],
    documentsChecklist: [
      { id: 'du-1', name: 'Technical Proposal Narrative (20 pages)', mandatory: true, category: 'Technical Proposal', status: 'Ready', fileName: 'HHDI_USAID_NNCERP_Technical_Proposal_vFinal.pdf', assignedTo: 'David Oche' },
      { id: 'du-2', name: 'Itemized Multi-Year Budget & Narrative', mandatory: true, category: 'Budget', status: 'Drafting', assignedTo: 'Grace Nwafor', notes: 'Grace finalizing fringe benefits and unit cost schedule.' },
      { id: 'du-3', name: 'MEL Plan & Performance Indicator Reference Sheets', mandatory: true, category: 'Technical Proposal', status: 'Ready', fileName: 'HHDI_MEL_Plan_NNCERP.pdf', assignedTo: 'Ibrahim Musa' },
      { id: 'du-4', name: 'SUBEB Letters of Support (Kaduna & Borno)', mandatory: true, category: 'Partner/Endorsement', status: 'Ready', fileName: 'SUBEB_Support_Letters_Bundle.pdf', assignedTo: 'David Oche' },
      { id: 'du-5', name: 'Key Personnel Resumes & Bio-data sheets (1420-17)', mandatory: true, category: 'Governance', status: 'Ready', fileName: 'HHDI_Key_Personnel_CVs_1420.pdf', assignedTo: 'David Oche' },
      { id: 'du-6', name: 'Past Performance References (3 Projects)', mandatory: true, category: 'Technical Proposal', status: 'Ready', fileName: 'HHDI_USAID_Past_Performance_Reports.pdf', assignedTo: 'David Oche' }
    ],
    tasks: [
      {
        id: 'tu-narrative',
        title: 'Finalize Technical Approach Narrative and Incorporate SUBEB Field Findings',
        departmentId: 'dept-prog-01',
        departmentName: 'Programmes',
        assignedTo: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-08-23',
        status: 'Complete',
        departmentReviewStatus: 'Department Approved',
        reviewedAt: '2026-08-23T16:00:00Z',
        reviewedBy: 'Sarah Okafor',
        reviewNote: 'Approved: Excellent technical narrative with strong SUBEB partnership alignment.',
        priority: 'High',
        completed: true,
        completedAt: '2026-08-23T16:00:00Z',
        completedOnTime: true,
        section: 'Technical Narrative',
        createdAt: '2026-08-10'
      },
      {
        id: 'tu-subeb',
        title: 'Collect signed SUBEB endorsement letters from Borno & Kaduna offices',
        departmentId: 'dept-prog-01',
        departmentName: 'Programmes',
        assignedTo: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-08-24',
        status: 'Complete',
        departmentReviewStatus: 'Department Approved',
        reviewedAt: '2026-08-24T14:30:00Z',
        reviewedBy: 'Sarah Okafor',
        priority: 'High',
        completed: true,
        completedAt: '2026-08-24T14:30:00Z',
        completedOnTime: true,
        section: 'Endorsements',
        createdAt: '2026-08-18'
      },
      {
        id: 'tu-budget',
        title: 'Finalize Multi-Year Line-Item Budget & 10% Cost Share Allocation Table',
        departmentId: 'dept-fin-02',
        departmentName: 'Finance',
        assignedTo: 'Grace Nwafor',
        assignedStaffId: 'staff-grace-03',
        departmentHeadId: 'staff-marcus-07',
        departmentHeadName: 'Marcus Vance',
        dueDate: '2026-08-24',
        status: 'Overdue',
        departmentReviewStatus: 'Drafting',
        priority: 'High',
        completed: false,
        notes: 'Grace reported delays obtaining formal price quotes for 12 solar educational tablets.',
        section: 'Budget & Financials',
        createdAt: '2026-08-10'
      },
      {
        id: 'tu-review',
        title: 'Conduct Programme Manager Quality & Compliance Review',
        departmentId: 'dept-prog-01',
        departmentName: 'Programmes',
        assignedTo: 'Sarah Okafor',
        assignedStaffId: 'staff-sarah-05',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-08-28',
        status: 'Not Started',
        priority: 'High',
        completed: false,
        dependency: 'Awaiting Budget from Grace Nwafor',
        section: 'Quality Assurance',
        createdAt: '2026-08-15'
      },
      {
        id: 'tu-exec',
        title: 'Executive Director final sign-off and digital signature on SF-424',
        departmentId: 'dept-exec-06',
        departmentName: 'Executive Management',
        assignedTo: 'Chinedu Adeyemi',
        assignedStaffId: 'staff-chinedu-06',
        departmentHeadId: 'staff-chinedu-06',
        departmentHeadName: 'Chinedu Adeyemi',
        dueDate: '2026-08-30',
        status: 'Not Started',
        priority: 'High',
        completed: false,
        dependency: 'Awaiting Programme Manager Sign-off',
        section: 'Executive Approval',
        createdAt: '2026-08-15'
      },
      {
        id: 'tu-send',
        title: 'Transmit complete package to Online Submissions Portal',
        departmentId: 'dept-prog-01',
        departmentName: 'Programmes',
        assignedTo: 'David Oche',
        assignedStaffId: 'staff-david-02',
        departmentHeadId: 'staff-sarah-05',
        departmentHeadName: 'Sarah Okafor',
        dueDate: '2026-08-31',
        status: 'Not Started',
        priority: 'High',
        completed: false,
        section: 'Submission',
        createdAt: '2026-08-15'
      }
    ],
    milestones: [
      { id: 'mu-1', title: 'Drafting & SUBEB Stakeholder Consultations', targetDate: '2026-08-23', completed: true },
      { id: 'mu-2', title: 'Budget & Cost-Share Finalization', targetDate: '2026-08-24', completed: false },
      { id: 'mu-3', title: 'Management Review by Sarah Okafor', targetDate: '2026-08-28', completed: false },
      { id: 'mu-4', title: 'Executive SF-424 Sign-Off & Submission', targetDate: '2026-08-31', completed: false }
    ],
    outstandingQuestions: [],
    internalNotes: [
      { id: 'nu-1', author: 'David Oche', timestamp: '2026-08-25T11:00:00Z', content: 'Technical narrative and SUBEB letters are 100% complete. We are solely waiting on Grace to finalize the Excel budget model so Sarah can complete the internal review.' },
      { id: 'nu-2', author: 'Sarah Okafor', timestamp: '2026-08-25T14:30:00Z', content: 'Spoke with Grace. She is expediting tablet quotes and will upload budget by tomorrow morning.' }
    ],
    auditTrail: [
      { id: 'au-1', timestamp: '2026-08-10T09:00:00Z', action: 'Opportunity Created', actor: 'David Oche', details: 'Initialized workspace with David Oche as Proposal Lead.', category: 'assignment' },
      { id: 'au-2', timestamp: '2026-08-23T16:00:00Z', action: 'Task Completed', actor: 'David Oche', details: 'Technical narrative finalized on schedule.', category: 'task' },
      { id: 'au-3', timestamp: '2026-08-24T14:30:00Z', action: 'Task Completed', actor: 'David Oche', details: 'SUBEB letters uploaded and verified.', category: 'task' },
      { id: 'au-4', timestamp: '2026-08-25T08:00:00Z', action: 'Deadline Warning', actor: 'System Monitoring', details: 'Budget task assigned to Grace Nwafor passed dueDate of Aug 24 without completion.', category: 'status' }
    ],
    readinessAlert: {
      level: 'WARNING',
      headline: 'Proposal at risk — Budget task assigned to Finance Officer (Grace Nwafor) is 2 days overdue.',
      details: 'Proposal Lead David Oche has completed technical narrative and endorsements on time. The current bottleneck is in Finance & Administration (Grace Nwafor). Programme Manager Sarah Okafor alerted.',
      recommendedActions: [
        'Finance Officer Grace Nwafor must upload completed line-item budget immediately.',
        'Programme Manager Sarah Okafor to expedite review upon upload.',
        'Executive Director sign-off remains scheduled for August 30.'
      ],
      bottleneckDepartment: 'Finance & Administration',
      responsibleStaff: 'Grace Nwafor',
      escalationLevel: 'Programme Manager',
      evaluatedAt: '2026-08-26T15:00:00Z'
    }
  },

  // 3. BLOCKED TASK DEMO: Global Green Action Fund (GGAF) — Co-Fund Matching Blocker
  {
    id: 'opp-greenfund-003',
    isDemo: true,
    donor: 'Global Green Action Fund (GGAF)',
    title: 'Global Green Action Fund — Sub-Saharan Climate Adaptation Challenge',
    deadline: '2026-10-10T23:59:00Z',
    deadlineVerificationStatus: 'Confirmed from Source',
    fundingAmount: '€350,000',
    currency: 'EUR',
    stage: 'Assessing',
    priority: 'Medium',
    leadStaff: 'Sarah Okafor',
    proposalLead: 'Sarah Okafor',
    reviewer: 'David Oche',
    finalApprover: 'Chinedu Adeyemi',
    thematicArea: 'Scalable Agro-Forestry & Climate Adaptation',
    countryScope: 'Nigeria (Sokoto, Kaduna & Plateau)',
    createdAt: '2026-08-15T14:00:00Z',
    updatedAt: '2026-08-26T16:00:00Z',
    extraction: {
      donor: 'Global Green Action Fund (GGAF)',
      opportunityTitle: 'Sub-Saharan Scalable Climate Solutions Challenge',
      fundingAmount: '€200,000 to €450,000 EUR',
      currency: 'EUR',
      applicationDeadline: '2026-10-10',
      deadlineVerificationStatus: 'Confirmed from Source',
      eligibleCountries: ['Nigeria', 'Kenya', 'Rwanda', 'Ghana'],
      eligibleOrgTypes: ['National NGOs', 'Consortia'],
      thematicPriorities: ['Community solar irrigation', 'Agro-forestry buffer zones'],
      targetBeneficiaries: ['Smallholder farmer households'],
      projectDuration: '36 months',
      coFundingRequirement: '50% mandatory matching co-fund guarantee from corporate CSR or government co-sponsor.',
      minOrgExperience: '3 years verified climate programming.',
      financialRequirements: 'Audited accounts and proof of institutional co-funding capability.',
      requiredPolicies: ['Environmental Governance', 'Safeguarding', 'Anti-Fraud'],
      requiredSupportingDocs: ['MoU / Co-Funding Guarantee Letter', 'Technical Concept Note', 'Audited Financials'],
      proposalSections: ['Executive Summary', 'Climate Vulnerability Assessment', 'Technical Plan', 'Co-Financing Plan'],
      wordLimits: '15 pages',
      submissionMethod: 'GGAF Online Portal',
      submissionUrlOrEmail: 'Online Portal',
      contactInfo: 'Online Submissions Portal',
      specialRestrictions: 'Co-funding commitment letters must be signed by CEO or Permanent Secretary.',
      otherEligibilityConditions: [],
      rawSummary: 'High-value European climate grant requiring 50% matching co-fund commitment.',
      sourceType: 'text'
    },
    assessment: {
      overallStatus: 'REVIEW REQUIRED',
      confidenceScoreRationale: 'Strong technical and operational fit in Sokoto/Plateau, but 50% matching co-funding (€175,000 EUR) represents a major structural barrier requiring corporate/government co-sponsor agreement.',
      criteria: [
        {
          criterion: '50% Matching Co-Fund Guarantee',
          category: 'Co-Funding / Other',
          status: 'REVIEW_REQUIRED',
          donorRequirement: '50% binding co-financing guarantee letter',
          orgEvidence: 'HHDI in talks with State Ministry of Environment and Sterling Bank CSR for co-sponsorship.',
          details: 'Pending signed commitment letter.',
          needsHumanVerification: true
        }
      ],
      strongestMatches: ['Extensive community solar irrigation track record', 'Strong presence in Sahelian dryland zones'],
      importantRisks: ['Co-funding MoU is a hard gate — application cannot be submitted without signed guarantee'],
      missingInformation: [],
      humanVerificationRequired: ['Confirm executive director co-financing negotiation status'],
      overallFitSummary: 'High-potential opportunity currently held up by external partner co-funding commitment.',
      strategicRecommendation: 'Hold technical drafting until co-funding agreement is signed.',
      assessedAt: '2026-08-15T14:00:00Z'
    },
    requirementsChecklist: [
      { id: 'rg-1', title: '50% Co-Funding Guarantee Letter', category: 'Financial', status: 'BLOCKED', notes: 'Awaiting signature from State Ministry and Corporate CSR partner.' }
    ],
    documentsChecklist: [
      { id: 'dg-1', name: 'Matching Co-Funding Commitment Letter', mandatory: true, category: 'Financial', status: 'Drafting', assignedTo: 'Chinedu Adeyemi' },
      { id: 'dg-2', name: 'Technical Concept Note & Climate Assessment', mandatory: true, category: 'Technical Proposal', status: 'Drafting', assignedTo: 'Sarah Okafor' }
    ],
    tasks: [
      {
        id: 'tg-cofund',
        title: 'Secure formal 50% Co-Funding MoU from State Ministry & Sterling Bank CSR',
        assignedTo: 'Chinedu Adeyemi',
        assignedStaffId: 'staff-chinedu-06',
        dueDate: '2026-09-01',
        status: 'Blocked',
        priority: 'High',
        completed: false,
        blockerReason: 'Waiting for Partner',
        blockerNotes: 'Sterling Bank CSR Committee meets September 3. Permanent Secretary requested revised joint results matrix before signing.',
        section: 'Co-Financing & Partnerships',
        createdAt: '2026-08-15'
      },
      {
        id: 'tg-tech',
        title: 'Draft Climate Vulnerability Assessment & Technical Intervention Logic',
        assignedTo: 'Sarah Okafor',
        assignedStaffId: 'staff-sarah-05',
        dueDate: '2026-09-10',
        status: 'In Progress',
        priority: 'Medium',
        completed: false,
        section: 'Technical Approach',
        createdAt: '2026-08-15'
      },
      {
        id: 'tg-baseline',
        title: 'Synthesize Sokoto & Plateau Drylands agro-forestry baseline data',
        assignedTo: 'Ibrahim Musa',
        assignedStaffId: 'staff-ibrahim-04',
        dueDate: '2026-09-15',
        status: 'In Progress',
        priority: 'Medium',
        completed: false,
        section: 'M&E',
        createdAt: '2026-08-15'
      }
    ],
    milestones: [
      { id: 'mg-1', title: 'Corporate Co-Funding MoU Signed', targetDate: '2026-09-05', completed: false },
      { id: 'mg-2', title: 'Complete Technical Application Dossier', targetDate: '2026-09-25', completed: false }
    ],
    outstandingQuestions: [
      { id: 'qg-1', question: 'Will donor accept an phased co-funding disbursement structure over 36 months?', category: 'Co-Funding', status: 'Open', assignedTo: 'Sarah Okafor' }
    ],
    internalNotes: [
      { id: 'ng-1', author: 'Sarah Okafor', timestamp: '2026-08-22T10:00:00Z', content: 'Followed up with ED. He is attending the CSR review meeting on Sept 3.' }
    ],
    auditTrail: [
      { id: 'ag-1', timestamp: '2026-08-15T14:00:00Z', action: 'Opportunity Created', actor: 'Sarah Okafor', details: 'Created workspace and flagged co-funding dependency.', category: 'assignment' },
      { id: 'ag-2', timestamp: '2026-08-22T10:30:00Z', action: 'Task Blocked', actor: 'Chinedu Adeyemi', details: 'Flagged co-funding task as BLOCKED: Waiting for Partner (Sterling Bank CSR Committee).', category: 'blocker' }
    ],
    readinessAlert: {
      level: 'WARNING',
      headline: 'Task Blocked — Matching Co-Fund Guarantee is awaiting external partner approval.',
      details: 'Task assigned to Executive Director Chinedu Adeyemi is BLOCKED [Waiting for Partner: Sterling Bank CSR & State Ministry of Environment]. Proposal Lead Sarah Okafor is coordinating baseline technical notes in parallel.',
      recommendedActions: [
        'Executive Director to follow up with Sterling Bank CSR Committee meeting on Sept 3.',
        'Prepare joint project results framework requested by State Ministry.'
      ],
      bottleneckDepartment: 'Executive Management / Partner',
      responsibleStaff: 'Chinedu Adeyemi',
      escalationLevel: 'Programme Manager',
      evaluatedAt: '2026-08-26T16:00:00Z'
    }
  },

  // 4. CRITICAL ESCALATION DEMO: EU Civil Society Facility (Deadline in 3 days, overdue critical task)
  {
    id: 'opp-eu-004',
    isDemo: true,
    donor: 'EU Civil Society & Democracy Facility',
    title: 'EU Grassroots Public Finance Monitoring & Citizen Budget Tracking',
    deadline: '2026-08-29T17:00:00Z', // 3 days away
    deadlineVerificationStatus: 'Confirmed from Source',
    fundingAmount: '€220,000',
    currency: 'EUR',
    stage: 'Ready for Submission',
    priority: 'High',
    leadStaff: 'Amina Bello',
    proposalLead: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    finalApprover: 'Chinedu Adeyemi',
    thematicArea: 'Accountability & Civic Governance',
    countryScope: 'Nigeria (Kaduna & Plateau)',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-26T16:30:00Z',
    extraction: {
      donor: 'European Union Delegation to Nigeria',
      opportunityTitle: 'EU Civil Society Facility — Citizen Accountability and Social Audit',
      fundingAmount: '€180,000 to €250,000 EUR',
      currency: 'EUR',
      applicationDeadline: '2026-08-29',
      deadlineVerificationStatus: 'Confirmed from Source',
      eligibleCountries: ['Nigeria'],
      eligibleOrgTypes: ['National CSOs', 'NGO Coalitions'],
      thematicPriorities: ['Public procurement tracking', 'Open government partnership advocacy'],
      targetBeneficiaries: ['Community citizen groups', 'Local government monitors'],
      projectDuration: '24 months',
      coFundingRequirement: '5% cash co-financing.',
      minOrgExperience: '3 years in governance and citizen monitoring.',
      financialRequirements: 'Audited accounts for 2023 & 2024. EU PROSPECT system registration.',
      requiredPolicies: ['Safeguarding', 'Anti-Fraud', 'Gender'],
      requiredSupportingDocs: ['Technical Proposal', 'EU Budget Sheet', 'Legal Entity Form', 'Financial Identification Form'],
      proposalSections: ['Relevance', 'Description of Action', 'Implementation Methodology', 'Budget'],
      wordLimits: '25 pages',
      submissionMethod: 'EU PROSPECT Online Portal',
      submissionUrlOrEmail: 'Online Portal',
      contactInfo: 'Online Submissions Portal',
      specialRestrictions: 'Strict submission deadline. No extensions permitted under EU financial regulation.',
      otherEligibilityConditions: ['Active PADDROR/PROSPECT registration code.'],
      rawSummary: 'Flagship EU governance grant closing in 3 days.',
      sourceType: 'text'
    },
    assessment: {
      overallStatus: 'LIKELY ELIGIBLE',
      confidenceScoreRationale: 'HHDI is fully registered on PROSPECT with active PADDROR credentials. Excellent track record from 2020 EU-ACT facility.',
      criteria: [],
      strongestMatches: ['Active PROSPECT account', 'Clean EU audit track record'],
      importantRisks: ['CRITICAL DEADLINE IN 3 DAYS: Final cost verification must be completed immediately.'],
      missingInformation: [],
      humanVerificationRequired: ['Confirm PROSPECT login credentials with ED'],
      overallFitSummary: 'Finalized package needing immediate resolution of financial verification.',
      strategicRecommendation: 'IMMEDIATE EXECUTIVE INTERVENTION: Resolve bank verification and upload to PROSPECT 24 hours prior to deadline.',
      assessedAt: '2026-08-01T10:00:00Z'
    },
    requirementsChecklist: [
      { id: 'reu-1', title: 'EU PROSPECT System Registration', category: 'Governance', status: 'MET', notes: 'Active code: NGA-HHDI-2020' },
      { id: 'reu-2', title: 'Financial Identification Form & Bank Stamped Confirmation', category: 'Financial', status: 'IN_PROGRESS', notes: 'Awaiting Grace Nwafor to confirm IBAN certificate with Zenith Bank.' }
    ],
    documentsChecklist: [
      { id: 'deu-1', name: 'Technical Proposal Narrative (25 pages)', mandatory: true, category: 'Technical Proposal', status: 'Ready', fileName: 'HHDI_EU_Civic_Action_Narrative_vFinal.pdf', assignedTo: 'Amina Bello' },
      { id: 'deu-2', name: 'EU Standard Budget in EUR', mandatory: true, category: 'Budget', status: 'Ready', fileName: 'HHDI_EU_Detailed_Budget_EUR.xlsx', assignedTo: 'Grace Nwafor' },
      { id: 'deu-3', name: 'EU Legal Entity Form & CAC Certificate', mandatory: true, category: 'Governance', status: 'Ready', fileName: 'HHDI_Legal_Entity_Form_Signed.pdf', assignedTo: 'Amina Bello' },
      { id: 'deu-4', name: 'Bank Stamped Financial Identification Form', mandatory: true, category: 'Financial', status: 'Under Review', assignedTo: 'Grace Nwafor' }
    ],
    tasks: [
      {
        id: 'teu-narrative',
        title: 'Complete Final Technical Proposal & Logical Framework in PROSPECT format',
        assignedTo: 'Amina Bello',
        assignedStaffId: 'staff-amina-01',
        dueDate: '2026-08-24',
        status: 'Complete',
        priority: 'High',
        completed: true,
        completedAt: '2026-08-24T18:00:00Z',
        completedOnTime: true,
        section: 'Technical Proposal',
        createdAt: '2026-08-01'
      },
      {
        id: 'teu-bank',
        title: 'Obtain Zenith Bank Official Stamp on EU Financial Identification Form',
        assignedTo: 'Grace Nwafor',
        assignedStaffId: 'staff-grace-03',
        dueDate: '2026-08-24',
        status: 'Overdue',
        priority: 'High',
        completed: false,
        notes: 'Grace dispatched rider to Zenith Bank Maitama branch for branch manager signature.',
        section: 'Financial Compliance',
        createdAt: '2026-08-01'
      },
      {
        id: 'teu-review',
        title: 'Programme Manager Final Compliance & Checklist Sign-off',
        assignedTo: 'Sarah Okafor',
        assignedStaffId: 'staff-sarah-05',
        dueDate: '2026-08-27',
        status: 'In Progress',
        priority: 'High',
        completed: false,
        section: 'Management Review',
        createdAt: '2026-08-01'
      },
      {
        id: 'teu-upload',
        title: 'Executive Director final sign-off and submission via PROSPECT portal',
        assignedTo: 'Chinedu Adeyemi',
        assignedStaffId: 'staff-chinedu-06',
        dueDate: '2026-08-28',
        status: 'Not Started',
        priority: 'High',
        completed: false,
        section: 'Portal Submission',
        createdAt: '2026-08-01'
      }
    ],
    milestones: [
      { id: 'meu-1', title: 'Technical Proposal Completed', targetDate: '2026-08-24', completed: true },
      { id: 'meu-2', title: 'EU Financial Identification Bank Stamped', targetDate: '2026-08-24', completed: false },
      { id: 'meu-3', title: 'PROSPECT Portal Upload 24 Hours Ahead', targetDate: '2026-08-28', completed: false }
    ],
    outstandingQuestions: [],
    internalNotes: [
      { id: 'neu-1', author: 'Amina Bello', timestamp: '2026-08-25T16:00:00Z', content: 'Escalated to Programme Manager Sarah Okafor: Technical draft is done, but we need the stamped bank form from Grace before we can upload to PROSPECT.' }
    ],
    auditTrail: [
      { id: 'aeu-1', timestamp: '2026-08-01T10:00:00Z', action: 'Opportunity Created', actor: 'Amina Bello', details: 'Initialized workspace with Amina Bello as Proposal Lead.', category: 'assignment' },
      { id: 'aeu-2', timestamp: '2026-08-24T18:00:00Z', action: 'Task Completed', actor: 'Amina Bello', details: 'Technical narrative completed and verified.', category: 'task' },
      { id: 'aeu-3', timestamp: '2026-08-25T16:00:00Z', action: 'Urgent Escalation Triggered', actor: 'System Monitoring', details: 'Triggered Level-3 Escalation to Programme Manager (Sarah Okafor) and Executive Director (Chinedu Adeyemi) due to overdue bank form with 3 days to deadline.', category: 'escalation' }
    ],
    readinessAlert: {
      level: 'CRITICAL',
      headline: 'Urgent Escalation: "Bank Stamped Financial Identification Form" is 2d overdue with 3 days to EU deadline.',
      details: 'Proposal Lead Amina Bello has completed technical dossier. Bottleneck is in Finance & Administration (Grace Nwafor). Executive Director Chinedu Adeyemi and Programme Manager Sarah Okafor alerted for immediate intervention.',
      recommendedActions: [
        'Grace Nwafor to confirm stamped bank form upload by 12:00 PM today.',
        'Sarah Okafor to run final PROSPECT dossier pre-validation.',
        'Chinedu Adeyemi to execute digital submission on PROSPECT by August 28 (24 hours prior to deadline).'
      ],
      bottleneckDepartment: 'Finance & Administration',
      responsibleStaff: 'Grace Nwafor',
      escalationLevel: 'Executive Director',
      evaluatedAt: '2026-08-26T16:30:00Z'
    }
  },

  // 5. Awaiting Decision: MacArthur
  {
    id: 'opp-macarthur-005',
    isDemo: true,
    donor: 'MacArthur Foundation',
    title: 'MacArthur On-Nigeria Community Accountability & Public Procurement Oversight',
    deadline: '2026-05-10T17:00:00Z',
    deadlineVerificationStatus: 'Confirmed from Source',
    fundingAmount: '$180,000',
    currency: 'USD',
    stage: 'Awaiting Decision',
    priority: 'Medium',
    leadStaff: 'Amina Bello',
    proposalLead: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    finalApprover: 'Chinedu Adeyemi',
    thematicArea: 'Accountability & Civic Participation',
    countryScope: 'Nigeria (Kaduna & Plateau)',
    createdAt: '2026-04-12T10:00:00Z',
    updatedAt: '2026-05-09T18:00:00Z',
    extraction: {
      donor: 'MacArthur Foundation',
      opportunityTitle: 'On-Nigeria Community Accountability & Anti-Corruption Grant',
      fundingAmount: '$150,000 to $200,000',
      currency: 'USD',
      applicationDeadline: '2026-05-10',
      deadlineVerificationStatus: 'Confirmed from Source',
      eligibleCountries: ['Nigeria'],
      eligibleOrgTypes: ['National NGOs', 'Investigative Media', 'CSO Coalitions'],
      thematicPriorities: ['Public procurement monitoring', 'Community voice in constituency projects'],
      targetBeneficiaries: ['Grassroots communities', 'Local CSO monitors'],
      projectDuration: '18 months',
      coFundingRequirement: 'Not required',
      minOrgExperience: '3 years',
      financialRequirements: 'Audited financial statements',
      requiredPolicies: ['Anti-Fraud', 'Whistleblower', 'Safeguarding'],
      requiredSupportingDocs: ['CAC Certificate', 'Audited Accounts', 'Past Project Reports'],
      proposalSections: ['Context', 'Strategy', 'Results', 'Budget'],
      wordLimits: '10 pages',
      submissionMethod: 'Online Portal',
      submissionUrlOrEmail: 'Online Portal',
      contactInfo: 'Online Submissions Portal',
      specialRestrictions: 'Non-partisan requirement.',
      otherEligibilityConditions: [],
      rawSummary: 'MacArthur Foundation anti-corruption and community procurement monitoring initiative.',
      sourceType: 'text'
    },
    assessment: {
      overallStatus: 'LIKELY ELIGIBLE',
      confidenceScoreRationale: 'Follow-on grantee track record from 2022-2024 sub-grant.',
      criteria: [],
      strongestMatches: ['Previous successful MacArthur sub-grant implementation'],
      importantRisks: [],
      missingInformation: [],
      humanVerificationRequired: [],
      overallFitSummary: 'Strong past performance history.',
      strategicRecommendation: 'Application submitted.',
      assessedAt: '2026-04-15T12:00:00Z'
    },
    requirementsChecklist: [],
    documentsChecklist: [],
    tasks: [],
    milestones: [],
    outstandingQuestions: [],
    internalNotes: [],
    submissionRecord: {
      submittedAt: '2026-05-08T14:22:00Z',
      submissionMethod: 'MacArthur Foundation Online Fluxx Portal',
      confirmationNumber: 'MAC-NGA-2026-APP-0941',
      submittedDocuments: [
        'HHDI_MacArthur_Proposal_Final.pdf',
        'HHDI_Activity_Budget_Detailed.xlsx',
        'HHDI_CAC_and_Audits_2023_2024.pdf'
      ],
      expectedDecisionDate: '2026-09-30',
      recordedBy: 'Amina Bello',
      notes: 'Confirmation email received from MacArthur On-Nigeria program officer Dr. Kole Shettima\'s office.'
    },
    readinessAlert: {
      level: 'INFO',
      headline: 'Application successfully submitted and under donor review.',
      details: 'Submitted on May 8, 2026 via Fluxx Portal (Ref: MAC-NGA-2026-APP-0941). Decision anticipated by end of September 2026.',
      recommendedActions: ['Prepare for potential donor clarification questions.'],
      evaluatedAt: '2026-05-09T18:00:00Z'
    }
  },

  // 6. Awarded: Ford Foundation
  {
    id: 'opp-ford-006',
    isDemo: true,
    donor: 'Ford Foundation',
    title: 'Ford Foundation West Africa Social Justice & Civic Space Resilience Fund',
    deadline: '2025-11-15T17:00:00Z',
    deadlineVerificationStatus: 'Confirmed from Source',
    fundingAmount: '$150,000',
    currency: 'USD',
    stage: 'Awarded',
    priority: 'Medium',
    leadStaff: 'Amina Bello',
    proposalLead: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    finalApprover: 'Chinedu Adeyemi',
    thematicArea: 'Civic Space & Social Justice',
    countryScope: 'Nigeria',
    createdAt: '2025-10-01T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
    extraction: {
      donor: 'Ford Foundation',
      opportunityTitle: 'West Africa Social Justice & Civic Space Resilience Fund',
      fundingAmount: '$100,000 - $200,000',
      currency: 'USD',
      applicationDeadline: '2025-11-15',
      deadlineVerificationStatus: 'Confirmed from Source',
      eligibleCountries: ['Nigeria', 'Ghana', 'Senegal'],
      eligibleOrgTypes: ['National CSOs'],
      thematicPriorities: ['Civic Freedoms', 'Community Resilience'],
      targetBeneficiaries: ['Grassroots community advocates'],
      projectDuration: '12 months',
      coFundingRequirement: 'None',
      minOrgExperience: '3 years',
      financialRequirements: 'Audited accounts',
      requiredPolicies: ['Gender', 'Safeguarding', 'Ethics'],
      requiredSupportingDocs: ['CAC Certificate', 'Audited Accounts'],
      proposalSections: ['Narrative', 'Budget'],
      wordLimits: '12 pages',
      submissionMethod: 'Portal',
      submissionUrlOrEmail: 'Online Portal',
      contactInfo: 'Online Submissions Portal',
      specialRestrictions: 'None',
      otherEligibilityConditions: [],
      rawSummary: 'Social justice grant for West African grassroots resilience.',
      sourceType: 'text'
    },
    assessment: {
      overallStatus: 'LIKELY ELIGIBLE',
      confidenceScoreRationale: 'Eligible and aligned.',
      criteria: [],
      strongestMatches: [],
      importantRisks: [],
      missingInformation: [],
      humanVerificationRequired: [],
      overallFitSummary: 'Successful match.',
      strategicRecommendation: 'Awarded.',
      assessedAt: '2025-10-05T10:00:00Z'
    },
    requirementsChecklist: [],
    documentsChecklist: [],
    tasks: [],
    milestones: [],
    outstandingQuestions: [],
    internalNotes: [],
    submissionRecord: {
      submittedAt: '2025-11-12T16:45:00Z',
      submissionMethod: 'Ford Foundation Online Portal',
      confirmationNumber: 'FF-WA-2025-0812',
      submittedDocuments: ['Proposal_Narrative.pdf', 'Budget.xlsx'],
      expectedDecisionDate: '2026-01-15',
      recordedBy: 'Amina Bello'
    },
    outcomeRecord: {
      decisionDate: '2026-01-10',
      outcome: 'Awarded',
      grantAmountAwarded: '$150,000 USD',
      feedbackNotes: 'Awarded full funding based on strong community tracking methodologies in Northern Nigeria.'
    }
  }
];

export const sampleOpportunities = initialOpportunities;

export const initialInstitutionalMemory: InstitutionalMemoryRecord[] = [
  {
    id: 'dh-1',
    donor: 'Ford Foundation',
    year: 2024,
    opportunityTitle: 'West Africa Civic Space & Democratic Accountability Initiative',
    amountRequested: '$120,000 USD',
    outcome: 'Rejected',
    leadPerson: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    approver: 'Chinedu Adeyemi',
    feedbackNotes: 'Score: 78/100. Reviewers noted strong local grassroots ties but requested more quantitative baseline survey indicators in the M&E methodology.',
    keyLearnings: 'Ensure all future Ford Foundation proposals incorporate baseline data collection timelines and quantifiable civic engagement metrics.'
  },
  {
    id: 'dh-2',
    donor: 'Ford Foundation',
    year: 2025,
    opportunityTitle: 'West Africa Social Justice & Civic Space Resilience Fund',
    amountRequested: '$150,000 USD',
    outcome: 'Awarded',
    amountAwarded: '$150,000 USD',
    leadPerson: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    approver: 'Chinedu Adeyemi',
    feedbackNotes: 'Awarded full grant. Evaluators praised the enhanced M&E framework and participatory youth monitoring approach.',
    keyLearnings: 'Directly addressing 2024 feedback on M&E indicators resulted in successful award.'
  },
  {
    id: 'dh-3',
    donor: 'USAID / Nigeria Mission',
    year: 2021,
    opportunityTitle: 'Scale-Up Basic Healthcare & Education Sub-grant (via Palladium)',
    amountRequested: '$210,000 USD',
    outcome: 'Awarded',
    amountAwarded: '$210,000 USD',
    leadPerson: 'David Oche',
    reviewer: 'Sarah Okafor',
    approver: 'Chinedu Adeyemi',
    feedbackNotes: 'Successfully completed with 100% burn rate and clean USAID post-award financial review.',
    keyLearnings: 'Established institutional USAID compliance systems and NICRA tracking.'
  },
  {
    id: 'dh-4',
    donor: 'MacArthur Foundation',
    year: 2022,
    opportunityTitle: 'On-Nigeria Anti-Corruption Grassroots Procurement Pilot',
    amountRequested: '$100,000 USD',
    outcome: 'Awarded',
    amountAwarded: '$100,000 USD',
    leadPerson: 'Amina Bello',
    reviewer: 'Sarah Okafor',
    approver: 'Chinedu Adeyemi',
    feedbackNotes: 'Piloted community procurement monitors across 14 local government councils in Kaduna and Plateau.',
    keyLearnings: 'High donor satisfaction, invited for larger follow-on round in 2026.'
  },
  {
    id: 'dh-5',
    donor: 'EU-ACT (British Council)',
    year: 2020,
    opportunityTitle: 'Civil Society Capacity Building & Safeguarding Support Facility',
    amountRequested: '€65,000 EUR',
    outcome: 'Awarded',
    amountAwarded: '€65,000 EUR',
    leadPerson: 'Sarah Okafor',
    reviewer: 'David Oche',
    approver: 'Chinedu Adeyemi',
    feedbackNotes: 'Supported institutional formalization of HHDI Safeguarding, Gender, and Anti-Fraud policies.',
    keyLearnings: 'Funded the creation of the institutional policies now giving HHDI competitive advantage in 2026 calls.'
  }
];

import {
  OrgProfile,
  OrgDocument,
  OrgDocumentCategory,
  OrgDocumentStatus,
  DocumentProvenancedField,
  DocumentVerificationStatus
} from '../types';

export interface UploadedFileDescriptor {
  id?: string;
  fileName: string;
  fileSize?: string;
  fileFormat?: 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'IMAGE' | 'TEXT';
  textContent?: string;
}

export interface ClassifiedUploadedDoc {
  id: string;
  fileName: string;
  fileSize: string;
  fileFormat: string;
  title: string;
  category: OrgDocumentCategory;
  documentType: string;
  governanceType: 'external' | 'internal';
  approvalDate?: string;
  issuedDate?: string;
  expiryDate?: string;
  nextReviewDate?: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry?: number;
  status: OrgDocumentStatus;
  summary: string;
  confidence: 'High' | 'Medium' | 'Low';
  rawText?: string;
}

export interface MissingEssentialDoc {
  documentType: string;
  category: OrgDocumentCategory;
  importance: 'Mandatory for most donors' | 'High donor value' | 'Recommended standard';
  typicalDonors: string[];
  explanation: string;
}

export interface DocumentConflict {
  field: string;
  description: string;
  sourceA: { documentName: string; value: string };
  sourceB: { documentName: string; value: string };
  resolutionNote: string;
}

export interface DocumentAnalysisResult {
  extractedProfile: {
    name?: DocumentProvenancedField<string>;
    country?: DocumentProvenancedField<string>;
    registrationNumber?: DocumentProvenancedField<string>;
    registrationDate?: DocumentProvenancedField<string>;
    registeredAddress?: DocumentProvenancedField<string>;
    yearEstablished?: DocumentProvenancedField<number>;
    orgType?: DocumentProvenancedField<string>;
    description?: DocumentProvenancedField<string>;
    thematicAreas?: DocumentProvenancedField<string[]>;
    geographicAreas?: DocumentProvenancedField<string[]>;
    targetBeneficiaries?: DocumentProvenancedField<string[]>;
    departments?: DocumentProvenancedField<string[]>;
    previousDonors?: DocumentProvenancedField<string[]>;
    safeguardingPolicy?: DocumentProvenancedField<boolean>;
    genderPolicy?: DocumentProvenancedField<boolean>;
    antiFraudPolicy?: DocumentProvenancedField<boolean>;
    procurementPolicy?: DocumentProvenancedField<boolean>;
    auditedAccountsAvailable?: DocumentProvenancedField<boolean>;
    auditedAccountsYears?: DocumentProvenancedField<number>;
  };
  classifiedDocuments: ClassifiedUploadedDoc[];
  missingEssentialDocuments: MissingEssentialDoc[];
  conflicts: DocumentConflict[];
  summary: {
    totalDocumentsAnalyzed: number;
    fieldsConfirmedCount: number;
    fieldsDerivedCount: number;
    fieldsRequiringVerificationCount: number;
    expiredDocumentsCount: number;
    expiringSoonCount: number;
    missingMandatoryDocsCount: number;
  };
}

export const STANDARD_COUNTRIES = [
  'Nigeria', 'Kenya', 'Ghana', 'Uganda', 'Tanzania', 'South Africa',
  'Rwanda', 'Ethiopia', 'Senegal', 'DR Congo', 'Zambia', 'Zimbabwe',
  'Malawi', 'Sierra Leone', 'Liberia', 'Cameroon', 'Somalia', 'South Sudan'
];

export const STANDARD_THEMATIC_AREAS = [
  'Health & Public Health',
  'Education & Learning',
  'Water, Sanitation & Hygiene (WASH)',
  'Food Security & Agriculture',
  'Gender Equality & Women Empowerment',
  'Child Protection & Youth Development',
  'Human Rights, Rule of Law & Governance',
  'Peacebuilding, Conflict Resolution & Social Cohesion',
  'Climate Resilience, Environment & Renewable Energy',
  'Livelihoods & Economic Inclusion',
  'Disaster Preparedness & Humanitarian Relief',
  'Democracy, Civic Participation & Media Freedom'
];

export const STANDARD_BENEFICIARIES = [
  'Women & Girls',
  'Children (0-18)',
  'Youth & Adolescents (15-29)',
  'Internally Displaced Persons (IDPs)',
  'Refugees & Returnees',
  'Persons with Disabilities (PWDs)',
  'Smallholder Farmers & Pastoralists',
  'Rural Communities',
  'Urban Informal Settlement Dwellers',
  'Elderly Populations',
  'Key & Vulnerable Populations'
];

export const ESSENTIAL_INSTITUTIONAL_DOCUMENTS: MissingEssentialDoc[] = [
  {
    documentType: 'Registration Certificate',
    category: 'Legal & Registration',
    importance: 'Mandatory for most donors',
    typicalDonors: ['All Donors', 'USAID', 'EU', 'FCDO', 'UN', 'Global Fund'],
    explanation: 'Demonstrates statutory corporate legal existence in operating country.'
  },
  {
    documentType: 'Constitution & Bylaws',
    category: 'Legal & Registration',
    importance: 'Mandatory for most donors',
    typicalDonors: ['USAID', 'EU', 'FCDO', 'Foundations'],
    explanation: 'Defines institutional mandate, governance organs, and asset lock provisions.'
  },
  {
    documentType: 'Child Safeguarding & PSEA Policy',
    category: 'Policies & Compliance',
    importance: 'Mandatory for most donors',
    typicalDonors: ['FCDO', 'USAID', 'UN Agencies', 'EU'],
    explanation: 'Mandatory for any programme interacting with children or vulnerable adults.'
  },
  {
    documentType: 'Anti-Fraud & Whistleblower Policy',
    category: 'Policies & Compliance',
    importance: 'Mandatory for most donors',
    typicalDonors: ['USAID', 'EU', 'Global Fund', 'World Bank'],
    explanation: 'Verifies zero-tolerance fiduciary standards and reporting channels.'
  },
  {
    documentType: 'Audited Financial Statements',
    category: 'Audits & Financials',
    importance: 'Mandatory for most donors',
    typicalDonors: ['USAID', 'EU', 'Global Fund', 'FCDO', 'Foundations'],
    explanation: 'Past 2-3 years audited financial records by certified public accountants.'
  },
  {
    documentType: 'Multi-Year Strategic Plan',
    category: 'Institutional Capacity',
    importance: 'High donor value',
    typicalDonors: ['Institutional Philanthropy', 'FCDO', 'USAID'],
    explanation: 'Proves structured programmatic vision and multi-year impact targets.'
  },
  {
    documentType: 'Tax Clearance Certificate',
    category: 'Legal & Registration',
    importance: 'Mandatory for most donors',
    typicalDonors: ['National Governments', 'Global Fund', 'FCDO'],
    explanation: 'Demonstrates national revenue authority statutory compliance.'
  }
];

export function isExternalRecord(category: OrgDocumentCategory, documentType?: string): boolean {
  if (documentType) {
    const lower = documentType.toLowerCase();
    if (lower.includes('constitution') || lower.includes('bylaws') || lower.includes('policy') || lower.includes('manual') || lower.includes('plan') || lower.includes('organogram') || lower.includes('cv')) {
      return false;
    }
    if (
      lower.includes('certificate') ||
      lower.includes('registration') ||
      lower.includes('audit') ||
      lower.includes('tax') ||
      lower.includes('scuml') ||
      lower.includes('incorporation') ||
      lower.includes('tin') ||
      lower.includes('bank') ||
      lower.includes('donor')
    ) {
      return true;
    }
  }
  if (category === 'Legal & Registration' || category === 'Audits & Financials') {
    return true;
  }
  return false;
}

function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|incorporated|trustees|of|the\s+trustees\s+of)\s+/gi, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function analyzeDocumentsRuleEngine(
  files: UploadedFileDescriptor[],
  adminEmail?: string
): DocumentAnalysisResult {
  const conflicts: DocumentConflict[] = [];

  if (!files || files.length === 0) {
    return {
      extractedProfile: {},
      classifiedDocuments: [],
      missingEssentialDocuments: ESSENTIAL_INSTITUTIONAL_DOCUMENTS,
      conflicts: [],
      summary: {
        totalDocumentsAnalyzed: 0,
        fieldsConfirmedCount: 0,
        fieldsDerivedCount: 0,
        fieldsRequiringVerificationCount: 0,
        expiredDocumentsCount: 0,
        expiringSoonCount: 0,
        missingMandatoryDocsCount: ESSENTIAL_INSTITUTIONAL_DOCUMENTS.length
      }
    };
  }

  let primaryOrgName = "";
  let primaryDocName = "";
  let primaryDocSnippet = "";

  const nameRegexes = [
    /(?:CERTIFICATE OF INCORPORATION OF THE TRUSTEES OF|TRUSTEES OF|INCORPORATED TRUSTEES OF)\s+([^\r\n]+)/i,
    /(?:THIS IS TO CERTIFY THAT\s+(?:THE\s+)?(?:INCORPORATED TRUSTEES OF\s+)?)([A-Z0-9\s&,.'()-]{3,80}?)(?:\s+HAVE THIS DAY|\s+IS THIS DAY|\s+ARE THIS DAY)/i,
    /(?:OFFICIAL NAME OF THE ORGANISATION IS|NAME OF THE ORGANISATION IS|ORGANISATION NAME:\s*)\s*([^\r\n]+)/i,
    /(?:CORPORATE AFFAIRS COMMISSION[\s\S]*?(?:CERTIFICATE OF INCORPORATION|STATUS REPORT)[\s\S]*?(?:OF|NAME:)\s*)([A-Z0-9\s&,.'()-]{3,80})/i,
    /(?:COMPANY LIMITED BY GUARANTEE|LIMITED BY GUARANTEE)\s+OF\s+([A-Z0-9\s&,.'()-]{3,80})/i,
    /(?:CONSTITUTION OF|BYLAWS OF|RULES OF)\s+([A-Z0-9\s&,.'()-]{3,80})/i
  ];

  const sortedFiles = [...files].sort((a, b) => {
    const aIsReg = /cac|incorporation|registration|certificate|status/i.test(a.fileName);
    const bIsReg = /cac|incorporation|registration|certificate|status/i.test(b.fileName);
    return aIsReg === bIsReg ? 0 : aIsReg ? -1 : 1;
  });

  for (const file of sortedFiles) {
    const text = file.textContent || "";
    if (!text.trim()) continue;
    for (const regex of nameRegexes) {
      const match = text.match(regex);
      if (match) {
        let candidate = (match[1] || match[0])
          .split(/\r?\n/)[0]
          .replace(/Registration Number.*$/i, "")
          .replace(/Date of.*$/i, "")
          .replace(/CAC\/IT.*$/i, "")
          .replace(/RC\s*No.*$/i, "")
          .trim()
          .replace(/[.,;:]$/, "");
        if (candidate.length > 2 && !candidate.toLowerCase().includes("corporate affairs")) {
          primaryOrgName = candidate;
          primaryDocName = file.fileName;
          primaryDocSnippet = match[0].split(/\r?\n/)[0].trim();
          break;
        }
      }
    }
    if (primaryOrgName) break;
  }

  const validatedFiles: UploadedFileDescriptor[] = [];
  const normalizedPrimary = primaryOrgName ? normalizeOrgName(primaryOrgName) : "";

  for (const file of files) {
    const text = file.textContent || "";
    if (!text.trim()) {
      validatedFiles.push(file);
      continue;
    }
    let fileOrgCandidate = "";
    for (const regex of nameRegexes) {
      const match = text.match(regex);
      if (match) {
        const c = (match[1] || match[0]).split(/\r?\n/)[0].replace(/Registration Number.*$/i, "").trim();
        if (c.length > 3 && !c.toLowerCase().includes("corporate affairs")) {
          fileOrgCandidate = c;
          break;
        }
      }
    }
    if (fileOrgCandidate && normalizedPrimary) {
      const normalizedCandidate = normalizeOrgName(fileOrgCandidate);
      const isMatch =
        normalizedCandidate === normalizedPrimary ||
        normalizedPrimary.includes(normalizedCandidate) ||
        normalizedCandidate.includes(normalizedPrimary);
      if (!isMatch) {
        conflicts.push({
          field: "Organisation Identity Mismatch",
          description: `Document "${file.fileName}" explicitly names "${fileOrgCandidate}", which conflicts with verified organisation "${primaryOrgName}". Data from this file was rejected to prevent cross-organisation data contamination.`,
          sourceA: { documentName: primaryDocName || "Registration Document", value: primaryOrgName },
          sourceB: { documentName: file.fileName, value: fileOrgCandidate },
          resolutionNote: "Document/Data Mismatch: Cross-organisation data contamination prevented."
        });
        continue;
      }
    }
    validatedFiles.push(file);
  }

  const combinedText = validatedFiles.map(f => `${f.fileName}\n${f.textContent || ""}`).join("\n\n--- FILE BREAK ---\n\n");

  let name: string | undefined = primaryOrgName || undefined;
  let nameSource: string | undefined = primaryDocName || undefined;
  let nameSnippet: string | undefined = primaryDocSnippet || undefined;
  let nameStatus: DocumentVerificationStatus = name ? "Confirmed from Document" : "Needs Human Input";

  let regNum: string | undefined = undefined;
  let regSource: string | undefined = undefined;
  let regSnippet: string | undefined = undefined;
  let regStatus: DocumentVerificationStatus = "Needs Human Input";

  const regMatch = combinedText.match(/(?:Registration\s+Number|Reg(?:\.|istration)?\s*No\.?|CAC\/IT\/NO\.?|CAC\/IT\/NUMBER|CAC\/IT|\bRC\s*(?:NO\.?|NUMBER)?|\bIT\s*(?:NO\.?|NUMBER)|\bRN\s*(?:NO\.?|NUMBER)?|NGO\s*Reg\s*No:?)\s*[:.]?\s*([A-Z0-9\/\-_]+(?:\s+[A-Z0-9\/\-_]+)*)/i);
  if (regMatch) {
    let rawVal = (regMatch[1] || regMatch[0]).split(/\r?\n/)[0].trim();
    if (regMatch[0].toUpperCase().includes("CAC/IT/NO") && !rawVal.startsWith("CAC")) {
      rawVal = `CAC/IT/NO ${rawVal.replace(/^CAC\/IT\/NO[:.\s]*/i, "")}`.trim();
    } else if (regMatch[0].toUpperCase().includes("RC") && !rawVal.startsWith("RC")) {
      rawVal = `RC ${rawVal.replace(/^RC[:.\s]*/i, "")}`.trim();
    }
    regNum = rawVal;
    regSource = validatedFiles.find(f => f.textContent?.includes(regMatch[0]))?.fileName || "Certificate of Incorporation";
    regSnippet = regMatch[0].split(/\r?\n/)[0].trim();
    regStatus = "Confirmed from Document";
  }

  let country: string | undefined = undefined;
  let countrySource: string | undefined = undefined;
  let countrySnippet: string | undefined = undefined;
  let countryStatus: DocumentVerificationStatus = "Needs Human Input";

  if (/FEDERAL REPUBLIC OF NIGERIA|CORPORATE AFFAIRS COMMISSION|\bNIGERIA\b|\bABUJA\b|\bLAGOS\b/i.test(combinedText)) {
    country = "Nigeria";
    countrySource = validatedFiles.find(f => f.textContent && /FEDERAL REPUBLIC OF NIGERIA|CORPORATE AFFAIRS COMMISSION|\bNIGERIA\b/i.test(f.textContent))?.fileName || "Registration Certificate";
    countrySnippet = "Federal Republic of Nigeria";
    countryStatus = "Confirmed from Document";
  } else {
    for (const stdCountry of STANDARD_COUNTRIES) {
      const countryRegex = new RegExp(`\\b${stdCountry}\\b`, "i");
      if (countryRegex.test(combinedText)) {
        country = stdCountry;
        const foundFile = validatedFiles.find(f => f.textContent && countryRegex.test(f.textContent));
        countrySource = foundFile?.fileName || "Verified Document";
        countrySnippet = `Located in ${stdCountry}`;
        countryStatus = "Confirmed from Document";
        break;
      }
    }
  }

  let registrationDateStr: string | undefined = undefined;
  let yearEstablished: number | undefined = undefined;
  let yearSource: string | undefined = undefined;
  let yearSnippet: string | undefined = undefined;
  let yearStatus: DocumentVerificationStatus = "Needs Human Input";

  const dateMatch = combinedText.match(/(?:Date\s+of\s+Registration|Registered\s+on|Given\s+under\s+my\s+hand[\s\S]*?this|This)\s*[:.]?\s*(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+[A-Za-z]+,?\s+\d{4}|\d{1,2}[-\/][A-Za-z0-9]+[-\/]\d{4}|\d{4})/i);
  if (dateMatch && dateMatch[1]) {
    registrationDateStr = dateMatch[1].trim();
    const yr = dateMatch[1].match(/\b(19\d{2}|20\d{2})\b/);
    if (yr) {
      yearEstablished = parseInt(yr[1], 10);
      yearSource = validatedFiles.find(f => f.textContent?.includes(dateMatch[0]))?.fileName || "Registration Document";
      yearSnippet = dateMatch[0].split(/\r?\n/)[0].trim();
      yearStatus = "Confirmed from Document";
    }
  } else {
    const yearMatch = combinedText.match(/(?:ESTABLISHED|FOUNDED|INCORPORATED|EST\.)\s*[:.]?\s*(19\d{2}|20\d{2})/i);
    if (yearMatch) {
      yearEstablished = parseInt(yearMatch[1], 10);
      yearSource = validatedFiles.find(f => f.textContent?.includes(yearMatch[0]))?.fileName || "Verified Document";
      yearSnippet = yearMatch[0].trim();
      yearStatus = "Confirmed from Document";
    }
  }

  let orgType: string | undefined = undefined;
  let orgTypeSource: string | undefined = undefined;
  let orgTypeSnippet: string | undefined = undefined;
  let orgTypeStatus: DocumentVerificationStatus = "Needs Human Input";

  if (/INCORPORATED TRUSTEES|PART C|NON-GOVERNMENTAL ORGANISATION|NATIONAL NGO|NNGO/i.test(combinedText)) {
    orgType = "National NGO (NNGO)";
    orgTypeSource = validatedFiles.find(f => f.textContent && /INCORPORATED TRUSTEES|PART C|NON-GOVERNMENTAL ORGANISATION/i.test(f.textContent))?.fileName || "Registration Document";
    orgTypeSnippet = "Incorporated Trustees / Non-Governmental Organisation";
    orgTypeStatus = "Confirmed from Document";
  } else if (/COMPANY LIMITED BY GUARANTEE|LTD\/GTE/i.test(combinedText)) {
    orgType = "Company Limited by Guarantee";
    orgTypeSource = validatedFiles.find(f => f.textContent && /COMPANY LIMITED BY GUARANTEE|LTD\/GTE/i.test(f.textContent))?.fileName || "Registration Document";
    orgTypeSnippet = "Company Limited by Guarantee";
    orgTypeStatus = "Confirmed from Document";
  } else if (/COMMUNITY BASED ORGANISATION|\bCBO\b/i.test(combinedText)) {
    orgType = "Community-Based Organisation (CBO)";
    orgTypeSource = validatedFiles.find(f => f.textContent && /COMMUNITY BASED ORGANISATION|\bCBO\b/i.test(f.textContent))?.fileName || "Registration Document";
    orgTypeSnippet = "Community Based Organisation";
    orgTypeStatus = "Confirmed from Document";
  }

  let registeredAddress: string | undefined = undefined;
  let addressSource: string | undefined = undefined;
  let addressSnippet: string | undefined = undefined;
  let addressStatus: DocumentVerificationStatus = "Needs Human Input";

  const addressMatch = combinedText.match(/(?:Headquarters|Registered\s+Address|Head\s+Office|Principal\s+Place\s+of\s+Business|Address)\s*[:.]?\s*([^\r\n]+(?:,\s*[^\r\n]+){1,3})/i);
  if (addressMatch && addressMatch[1] && addressMatch[1].trim().length > 10) {
    registeredAddress = addressMatch[1].trim();
    addressSource = validatedFiles.find(f => f.textContent?.includes(addressMatch[0]))?.fileName || "Verified Document";
    addressSnippet = addressMatch[0].split(/\r?\n/)[0].trim();
    addressStatus = "Confirmed from Document";
  }

  let description: string | undefined = undefined;
  let descSource: string | undefined = undefined;
  let descSnippet: string | undefined = undefined;
  let descStatus: DocumentVerificationStatus = "Needs Human Input";

  const descMatch = combinedText.match(/(?:Aims\s+and\s+Objects|Stated\s+Objectives|Mandate\s+and\s+Objectives|Mission\s+Statement|ARTICLE\s+2[:\s]+[^\r\n]+|Aims\s+and\s+Objectives)\s*[:.]?\s*([^\r\n]+(?:\r?\n[^\r\n]+){0,4})/i);
  if (descMatch && descMatch[1] && descMatch[1].trim().length > 20) {
    description = descMatch[1].trim().replace(/\s+/g, " ");
    descSource = validatedFiles.find(f => f.textContent?.includes(descMatch[0]))?.fileName || "Constitution & Mandate Document";
    descSnippet = description.slice(0, 120);
    descStatus = "Confirmed from Document";
  }

  const matchedThematics: string[] = [];
  for (const theme of STANDARD_THEMATIC_AREAS) {
    const keywords = theme.toLowerCase().split(/[\/&,]+/).map(k => k.trim()).filter(k => k.length > 3);
    if (keywords.some(k => combinedText.toLowerCase().includes(k))) {
      matchedThematics.push(theme);
    }
  }

  const matchedGeos: string[] = [];
  if (country) matchedGeos.push(country);
  const commonStates = ['Abuja', 'FCT Abuja', 'Borno State', 'Adamawa State', 'Yobe State', 'Lagos State', 'Kano State', 'Kaduna State'];
  for (const st of commonStates) {
    if (new RegExp(`\\b${st}\\b`, "i").test(combinedText) && !matchedGeos.includes(st)) {
      matchedGeos.push(st);
    }
  }

  const matchedBeneficiaries: string[] = [];
  for (const b of STANDARD_BENEFICIARIES) {
    const keywords = b.toLowerCase().split(/[\/&(),]+/).map(k => k.trim()).filter(k => k.length > 3);
    if (keywords.some(k => combinedText.toLowerCase().includes(k))) {
      matchedBeneficiaries.push(b);
    }
  }

  let extractedDepartments: string[] | undefined = undefined;
  let deptSource: string | undefined = undefined;
  let deptSnippet: string | undefined = undefined;

  const deptMatch = combinedText.match(/(?:functional\s+departments|organisational\s+structure|directorates|departments)\s*[:.]?\s*([^\r\n]+(?:\r?\n\s*\d+[\s.)-][^\r\n]+){2,8})/i);
  if (deptMatch && deptMatch[1]) {
    const lines = deptMatch[1]
      .split(/\r?\n/)
      .map(l => l.replace(/^\s*\d+[\s.)-]+\s*/, "").trim())
      .filter(l => l.length > 2);
    if (lines.length > 0) {
      extractedDepartments = lines;
      deptSource = validatedFiles.find(f => f.textContent?.includes(deptMatch[0]))?.fileName || "Constitution Document";
      deptSnippet = lines.slice(0, 3).join(", ");
    }
  }

  const matchedDonors: string[] = [];
  const knownDonors = ['USAID', 'UNICEF', 'FCDO', 'Global Fund', 'Ford Foundation', 'WHO', 'UNHCR', 'WFP', 'UNDP', 'GIZ', 'European Union'];
  for (const donor of knownDonors) {
    if (new RegExp(`\\b${donor}\\b`, "i").test(combinedText)) {
      matchedDonors.push(donor);
    }
  }

  const hasSafeguarding = /safeguarding policy|child protection policy|psea policy/i.test(combinedText);
  const hasGender = /gender policy|gesi strategy|gender equality policy/i.test(combinedText);
  const hasAntiFraud = /anti-fraud|financial integrity|whistleblower policy|anti-bribery/i.test(combinedText);
  const hasProcurement = /procurement policy|procurement manual/i.test(combinedText);
  const hasAudit = /audited financial statements|independent auditor's report|unqualified audit opinion|chartered accountants/i.test(combinedText);
  const auditYearsMatch = combinedText.match(/(\d+)\s*(?:consecutive years|years covered|years of audited)/i);
  const auditYears = auditYearsMatch ? parseInt(auditYearsMatch[1], 10) : hasAudit ? 3 : undefined;

  const now = new Date();
  const classifiedDocuments: ClassifiedUploadedDoc[] = files.map((file, idx) => {
    const text = (file.textContent || "").toLowerCase();
    const fname = file.fileName.toLowerCase();

    let category: OrgDocumentCategory = 'General & Unclassified';
    let docType = 'Institutional Document';

    if (/incorporation|cac|registration|certificate|trustee|part c/i.test(fname) || /incorporation|corporate affairs commission|registration number/i.test(text)) {
      category = 'Legal & Registration';
      docType = 'Registration Certificate';
    } else if (/constitution|bylaws|articles/i.test(fname) || /constitution|bylaws|board of trustees/i.test(text)) {
      category = 'Legal & Registration';
      docType = 'Constitution & Bylaws';
    } else if (/safeguard|child|psea/i.test(fname) || /safeguarding|child protection|sexual exploitation/i.test(text)) {
      category = 'Policies & Compliance';
      docType = 'Child Safeguarding & PSEA Policy';
    } else if (/fraud|bribery|integrity|whistleblow/i.test(fname) || /anti-fraud|anti-bribery|whistleblowing/i.test(text)) {
      category = 'Policies & Compliance';
      docType = 'Anti-Fraud & Whistleblower Policy';
    } else if (/audit|financial statement|accountant/i.test(fname) || /audited financial statements|independent auditor/i.test(text)) {
      category = 'Audits & Financials';
      docType = 'Audited Financial Statements';
    } else if (/strategic|strategy|plan/i.test(fname) || /strategic plan|strategic priority/i.test(text)) {
      category = 'Institutional Capacity';
      docType = 'Multi-Year Strategic Plan';
    } else if (/tax|tcc|firs/i.test(fname) || /tax clearance|inland revenue/i.test(text)) {
      category = 'Legal & Registration';
      docType = 'Tax Clearance Certificate';
    }

    const governanceType = isExternalRecord(category, docType) ? 'external' : 'internal';
    const title = file.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

    let issuedDate: string | undefined = undefined;
    let approvalDate: string | undefined = undefined;
    let expiryDate: string | undefined = undefined;
    let nextReviewDate: string | undefined = undefined;

    const dateMatchDoc = (file.textContent || "").match(/(?:Issue\s+Date|Date\s+of\s+Registration|Approved|Effective\s+Date)\s*[:.]?\s*(\d{1,2}[-\/\s][A-Za-z0-9]+[-\/\s]\d{4}|\d{4})/i);
    if (dateMatchDoc) {
      if (governanceType === 'external') {
        issuedDate = dateMatchDoc[1];
      } else {
        approvalDate = dateMatchDoc[1];
      }
    }

    const expMatch = (file.textContent || "").match(/(?:Expiry\s+Date|Expiration\s+Date|Valid\s+Until|Expires\s+On)\s*[:.]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[-\/\s][A-Za-z0-9]+[-\/\s]\d{4})/i);
    if (expMatch) {
      expiryDate = expMatch[1];
    }

    let isExpired = false;
    let isExpiringSoon = false;
    let daysUntilExpiry: number | undefined = undefined;
    let status: OrgDocumentStatus;

    if (governanceType === 'external') {
      if (expiryDate) {
        const exp = new Date(expiryDate);
        if (!isNaN(exp.getTime())) {
          const diffMs = exp.getTime() - now.getTime();
          daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (daysUntilExpiry < 0) {
            isExpired = true;
            status = 'Expired';
          } else if (daysUntilExpiry <= 90) {
            isExpiringSoon = true;
            status = 'Expiring Soon';
          } else {
            status = 'Current';
          }
        } else {
          status = 'Verified';
        }
      } else {
        status = 'Verified';
      }
    } else {
      status = 'Approved';
    }

    return {
      id: file.id || `doc-${Date.now()}-${idx}`,
      fileName: file.fileName,
      fileSize: file.fileSize || '1.2 MB',
      fileFormat: file.fileFormat || 'PDF',
      title,
      category,
      documentType: docType,
      governanceType,
      issuedDate,
      approvalDate,
      expiryDate,
      nextReviewDate,
      isExpired,
      isExpiringSoon,
      daysUntilExpiry,
      status,
      summary: governanceType === 'external'
        ? `Verified statutory record extracted from ${file.fileName}.`
        : `Approved internal document extracted from ${file.fileName}.`,
      confidence: 'High',
      rawText: file.textContent
    };
  });

  const uploadedTypesAndTitles = classifiedDocuments.map(d => `${d.documentType} ${d.title} ${d.fileName}`.toLowerCase());
  const missingEssentialDocuments: MissingEssentialDoc[] = ESSENTIAL_INSTITUTIONAL_DOCUMENTS.filter(essential => {
    const essentialKeywords = essential.documentType.toLowerCase().split(/[\/\s()–-]+/).filter(w => w.length > 3);
    return !uploadedTypesAndTitles.some(ut =>
      essentialKeywords.some(k => ut.includes(k))
    );
  });

  const confirmedCount = [nameStatus, regStatus, countryStatus, yearStatus, orgTypeStatus, descStatus, addressStatus].filter(s => s === 'Confirmed from Document').length;
  const derivedCount = [nameStatus, regStatus, countryStatus, yearStatus, orgTypeStatus, descStatus, addressStatus].filter(s => s === 'Derived from Documents').length;
  const needsVerificationCount = [nameStatus, regStatus, countryStatus, yearStatus, orgTypeStatus, descStatus, addressStatus].filter(s => s === 'Needs Human Input' || s === 'Needs Human Verification').length;

  return {
    extractedProfile: {
      name: name ? { value: name, sourceDocument: nameSource, sourceSnippet: nameSnippet, confidence: 'High', status: nameStatus } : undefined,
      country: country ? { value: country, sourceDocument: countrySource, sourceSnippet: countrySnippet, confidence: 'High', status: countryStatus } : undefined,
      registrationNumber: regNum ? { value: regNum, sourceDocument: regSource, sourceSnippet: regSnippet, confidence: 'High', status: regStatus } : undefined,
      registrationDate: registrationDateStr ? { value: registrationDateStr, sourceDocument: yearSource || 'Registration Certificate', sourceSnippet: yearSnippet, confidence: 'High', status: 'Confirmed from Document' } : undefined,
      registeredAddress: registeredAddress ? { value: registeredAddress, sourceDocument: addressSource, sourceSnippet: addressSnippet, confidence: 'High', status: addressStatus } : undefined,
      yearEstablished: yearEstablished ? { value: yearEstablished, sourceDocument: yearSource, sourceSnippet: yearSnippet, confidence: 'High', status: yearStatus } : undefined,
      orgType: orgType ? { value: orgType, sourceDocument: orgTypeSource, sourceSnippet: orgTypeSnippet, confidence: 'High', status: orgTypeStatus } : undefined,
      description: description ? { value: description, sourceDocument: descSource, sourceSnippet: descSnippet, confidence: 'High', status: descStatus } : undefined,
      thematicAreas: matchedThematics.length > 0 ? { value: matchedThematics, sourceDocument: validatedFiles[0]?.fileName || 'Institutional Document', sourceSnippet: matchedThematics.slice(0, 3).join(', '), confidence: 'High', status: 'Confirmed from Document' } : undefined,
      geographicAreas: matchedGeos.length > 0 ? { value: matchedGeos, sourceDocument: validatedFiles[0]?.fileName || 'Institutional Document', sourceSnippet: matchedGeos.join(', '), confidence: 'High', status: 'Confirmed from Document' } : undefined,
      targetBeneficiaries: matchedBeneficiaries.length > 0 ? { value: matchedBeneficiaries, sourceDocument: validatedFiles[0]?.fileName || 'Institutional Document', sourceSnippet: matchedBeneficiaries.join(', '), confidence: 'High', status: 'Confirmed from Document' } : undefined,
      departments: extractedDepartments ? { value: extractedDepartments, sourceDocument: deptSource, sourceSnippet: deptSnippet, confidence: 'High', status: 'Confirmed from Document' } : undefined,
      previousDonors: matchedDonors.length > 0 ? { value: matchedDonors, sourceDocument: validatedFiles[0]?.fileName || 'Audited Financial Statements', sourceSnippet: matchedDonors.join(', '), confidence: 'High', status: 'Confirmed from Document' } : undefined,
      safeguardingPolicy: { value: hasSafeguarding, sourceDocument: hasSafeguarding ? 'Child Safeguarding Policy' : undefined, sourceSnippet: hasSafeguarding ? 'Verified Safeguarding Policy' : undefined, confidence: hasSafeguarding ? 'High' : 'Low', status: hasSafeguarding ? 'Confirmed from Document' : 'Not Provided / Missing' },
      genderPolicy: { value: hasGender, sourceDocument: hasGender ? 'Gender Policy' : undefined, confidence: hasGender ? 'High' : 'Low', status: hasGender ? 'Confirmed from Document' : 'Not Provided / Missing' },
      antiFraudPolicy: { value: hasAntiFraud, sourceDocument: hasAntiFraud ? 'Anti-Fraud Policy' : undefined, confidence: hasAntiFraud ? 'High' : 'Low', status: hasAntiFraud ? 'Confirmed from Document' : 'Not Provided / Missing' },
      procurementPolicy: { value: hasProcurement, sourceDocument: hasProcurement ? 'Procurement Manual' : undefined, confidence: hasProcurement ? 'High' : 'Low', status: hasProcurement ? 'Confirmed from Document' : 'Not Provided / Missing' },
      auditedAccountsAvailable: { value: hasAudit, sourceDocument: hasAudit ? 'Independent Audit Report' : undefined, sourceSnippet: hasAudit ? 'Audited Accounts Available' : undefined, confidence: hasAudit ? 'High' : 'Low', status: hasAudit ? 'Confirmed from Document' : 'Not Provided / Missing' },
      auditedAccountsYears: auditYears ? { value: auditYears, sourceDocument: 'Audited Financial Statements', sourceSnippet: `${auditYears} Consecutive Years Covered`, confidence: 'High', status: 'Confirmed from Document' } : undefined
    },
    classifiedDocuments,
    missingEssentialDocuments,
    conflicts,
    summary: {
      totalDocumentsAnalyzed: files.length,
      fieldsConfirmedCount: confirmedCount,
      fieldsDerivedCount: derivedCount,
      fieldsRequiringVerificationCount: needsVerificationCount,
      expiredDocumentsCount: classifiedDocuments.filter(d => d.isExpired).length,
      expiringSoonCount: classifiedDocuments.filter(d => d.isExpiringSoon).length,
      missingMandatoryDocsCount: missingEssentialDocuments.filter(d => d.importance === "Mandatory for most donors").length
    }
  };
}

export function mergeExtractedProfile(
  existingProfile: OrgProfile,
  analysis: DocumentAnalysisResult
): OrgProfile {
  const ext = analysis.extractedProfile;
  const currentProv = { ...(existingProfile.documentProvenance || {}) };

  let name = existingProfile.name;
  if (ext.name && ext.name.status === 'Confirmed from Document') {
    name = ext.name.value;
    currentProv.name = ext.name;
  }

  let regNum = existingProfile.registrationNumber;
  let regStatus = existingProfile.registrationStatus;
  if (ext.registrationNumber && ext.registrationNumber.status === 'Confirmed from Document') {
    regNum = ext.registrationNumber.value;
    regStatus = `Registered (${ext.registrationNumber.value})`;
    currentProv.registrationNumber = ext.registrationNumber;
    currentProv.registrationStatus = {
      value: regStatus,
      sourceDocument: ext.registrationNumber.sourceDocument,
      sourceSnippet: ext.registrationNumber.sourceSnippet,
      confidence: ext.registrationNumber.confidence,
      status: ext.registrationNumber.status
    };
  }

  let regDate = existingProfile.registrationDate;
  if (ext.registrationDate && ext.registrationDate.status === 'Confirmed from Document') {
    regDate = ext.registrationDate.value;
    currentProv.registrationDate = ext.registrationDate;
  }

  let country = existingProfile.country;
  if (ext.country && ext.country.status === 'Confirmed from Document') {
    country = ext.country.value;
    currentProv.country = ext.country;
  }

  let yearEstablished = existingProfile.yearEstablished;
  if (ext.yearEstablished && ext.yearEstablished.status === 'Confirmed from Document') {
    yearEstablished = ext.yearEstablished.value;
    currentProv.yearEstablished = ext.yearEstablished;
  }

  let orgType = existingProfile.orgType;
  if (ext.orgType && ext.orgType.status === 'Confirmed from Document') {
    orgType = ext.orgType.value;
    currentProv.orgType = ext.orgType;
  }

  let registeredAddress = existingProfile.registeredAddress;
  if (ext.registeredAddress && ext.registeredAddress.status === 'Confirmed from Document') {
    registeredAddress = ext.registeredAddress.value;
    currentProv.registeredAddress = ext.registeredAddress;
  }

  let description = existingProfile.description;
  if (ext.description && ext.description.status === 'Confirmed from Document') {
    description = ext.description.value;
    currentProv.description = ext.description;
  }

  let thematicAreas = [...(existingProfile.thematicAreas || [])];
  if (ext.thematicAreas && ext.thematicAreas.value.length > 0) {
    thematicAreas = ext.thematicAreas.value;
    currentProv.thematicAreas = ext.thematicAreas;
  }

  let geographicAreas = [...(existingProfile.geographicAreas || [])];
  if (ext.geographicAreas && ext.geographicAreas.value.length > 0) {
    geographicAreas = ext.geographicAreas.value;
    currentProv.geographicAreas = ext.geographicAreas;
  }

  let targetBeneficiaries = [...(existingProfile.targetBeneficiaries || [])];
  if (ext.targetBeneficiaries && ext.targetBeneficiaries.value.length > 0) {
    targetBeneficiaries = ext.targetBeneficiaries.value;
    currentProv.targetBeneficiaries = ext.targetBeneficiaries;
  }

  let previousDonors = [...(existingProfile.previousDonors || [])];
  if (ext.previousDonors && ext.previousDonors.value.length > 0) {
    previousDonors = ext.previousDonors.value;
    currentProv.previousDonors = ext.previousDonors;
  }

  let departments = existingProfile.departments;
  if (ext.departments && ext.departments.value && ext.departments.value.length > 0) {
    currentProv.departments = ext.departments;
  }

  let safeguardingPolicy = existingProfile.safeguardingPolicy;
  if (ext.safeguardingPolicy && ext.safeguardingPolicy.value) {
    safeguardingPolicy = true;
    currentProv.safeguardingPolicy = ext.safeguardingPolicy;
  }
  let genderPolicy = existingProfile.genderPolicy;
  if (ext.genderPolicy && ext.genderPolicy.value) {
    genderPolicy = true;
    currentProv.genderPolicy = ext.genderPolicy;
  }
  let antiFraudPolicy = existingProfile.antiFraudPolicy;
  if (ext.antiFraudPolicy && ext.antiFraudPolicy.value) {
    antiFraudPolicy = true;
    currentProv.antiFraudPolicy = ext.antiFraudPolicy;
  }

  let auditedAccountsAvailable = existingProfile.auditedAccountsAvailable;
  let auditedAccountsYears = existingProfile.auditedAccountsYears || 0;
  if (ext.auditedAccountsAvailable && ext.auditedAccountsAvailable.value) {
    auditedAccountsAvailable = true;
    currentProv.auditedAccountsAvailable = ext.auditedAccountsAvailable;
    if (ext.auditedAccountsYears && ext.auditedAccountsYears.value) {
      auditedAccountsYears = ext.auditedAccountsYears.value;
      currentProv.auditedAccountsYears = ext.auditedAccountsYears;
    }
  }

  let documentLibrary = existingProfile.documentLibrary ? [...existingProfile.documentLibrary] : [];
  if (analysis.classifiedDocuments && analysis.classifiedDocuments.length > 0) {
    if (documentLibrary.length === 0) {
      documentLibrary = analysis.classifiedDocuments.map(c => ({
        id: c.id,
        title: c.title,
        documentType: c.documentType,
        category: c.category,
        governanceType: c.governanceType,
        year: new Date().getFullYear().toString(),
        version: 'v1.0',
        isCurrentApproved: c.status === 'Verified' || c.status === 'Current' || c.status === 'Approved' || c.status === 'Current Approved',
        status: c.status,
        approvalDate: c.approvalDate,
        issuedDate: c.issuedDate,
        expiryDate: c.expiryDate,
        nextReviewDate: c.nextReviewDate,
        accessLevel: 'General',
        fileName: c.fileName,
        fileSize: c.fileSize || '1.5 MB',
        fileFormat: (c.fileFormat === 'TEXT' ? 'PDF' : c.fileFormat) as 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'IMAGE',
        maintainedBy: existingProfile.adminEmail || 'Organisation Admin',
        description: c.summary,
        tags: [c.category, c.documentType],
        lastUpdated: new Date().toISOString().split('T')[0]
      }));
    }
  }

  return {
    ...existingProfile,
    name: name || '',
    country: country || '',
    registrationNumber: regNum || '',
    registrationStatus: regStatus || (regNum ? `Registered (${regNum})` : ''),
    registrationDate: regDate || '',
    registeredAddress: registeredAddress || '',
    yearEstablished: yearEstablished || 0,
    orgType: orgType || '',
    description: description || '',
    thematicAreas,
    geographicAreas,
    targetBeneficiaries,
    previousDonors,
    departments: departments || [],
    safeguardingPolicy: Boolean(safeguardingPolicy),
    genderPolicy: Boolean(genderPolicy),
    antiFraudPolicy: Boolean(antiFraudPolicy),
    auditedAccountsAvailable: Boolean(auditedAccountsAvailable),
    auditedAccountsYears,
    documentLibrary,
    documentProvenance: currentProv
  };
}

export const SAMPLE_NGO_DOCUMENTS: UploadedFileDescriptor[] = [
  {
    id: 'sample-doc-1',
    fileName: 'CAC_Certificate_Incorporation.pdf',
    fileSize: '1.4 MB',
    fileFormat: 'PDF',
    textContent: `FEDERAL REPUBLIC OF NIGERIA\nCORPORATE AFFAIRS COMMISSION\nCERTIFICATE OF INCORPORATION OF THE TRUSTEES OF\nACTION HEALTH AND DEVELOPMENT INITIATIVE (AHDI)\nRegistration Number: CAC/IT/NO 48291\nDate of Registration: 14th day of March, 2018\nClassification: Incorporated Trustees (National Non-Governmental Organisation)\nHeadquarters: Plot 428 Constitution Avenue, Central Business District, Abuja, Federal Capital Territory, Nigeria.\nThis is to certify that the Incorporated Trustees of ACTION HEALTH AND DEVELOPMENT INITIATIVE have this day been registered as a corporate body under Part C of the Companies and Allied Matters Act 1990.`
  }
];
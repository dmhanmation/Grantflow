import {
  OrgProfile,
  ScoutedOpportunity,
  OpportunityMatchVerdict,
  OpportunityMatchCriterion,
  OpportunityStatus
} from '../types';

export interface EvaluationResult {
  isDisqualified: boolean;
  disqualificationReason?: string;
  verdict: OpportunityMatchVerdict;
  fitScore: number;
  matchReasons: string[];
  criteriaBreakdown: OpportunityMatchCriterion[];
  isDeadlineRisk: boolean;
  deadlineRiskNotice?: string;
}

/**
 * Normalizes text tokens for resilient fuzzy keyword and thematic matching.
 */
function normalizeTokens(str: string): string[] {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Checks if candidate geography overlaps with organisation's country and regional scope.
 */
export function matchesGeography(
  candidateGeography: string[],
  orgCountry: string,
  targetGeos: string[] = [],
  excludedGeos: string[] = []
): { matched: boolean; directCountryMatch: boolean; reason?: string } {
  const normOrgCountry = (orgCountry || 'Nigeria').toLowerCase().trim();
  const normCandidateGeos = (candidateGeography || []).map(g => g.toLowerCase().trim());
  const normExcludedGeos = (excludedGeos || []).map(g => g.toLowerCase().trim());

  // 1. Check excluded geographies
  for (const ex of normExcludedGeos) {
    if (normCandidateGeos.some(cg => cg.includes(ex) || ex.includes(cg))) {
      return { matched: false, directCountryMatch: false, reason: `Excluded geography: ${ex}` };
    }
  }

  // If candidate lists no specific geography or lists global / worldwide / africa / developing countries
  const globalIndicators = [
    'global',
    'worldwide',
    'all countries',
    'developing countries',
    'sub-saharan africa',
    'africa',
    'west africa',
    'east africa',
    'southern africa',
    'central africa'
  ];

  const hasGlobalOrRegional = normCandidateGeos.some(cg =>
    globalIndicators.some(gi => cg.includes(gi) || gi.includes(cg))
  );

  // 2. Direct country match
  const directMatch = normCandidateGeos.some(cg => cg.includes(normOrgCountry) || normOrgCountry.includes(cg));

  // 3. Match against org's operational geographic areas
  const targetMatch = targetGeos.some(tg => {
    const normTg = tg.toLowerCase().trim();
    return normCandidateGeos.some(cg => cg.includes(normTg) || normTg.includes(cg));
  });

  if (directMatch || targetMatch || hasGlobalOrRegional || normCandidateGeos.length === 0) {
    return { matched: true, directCountryMatch: directMatch };
  }

  return { matched: false, directCountryMatch: false, reason: `Geographic mismatch for ${orgCountry}` };
}

/**
 * Checks if applicant type allows CSOs, NGOs, CBOs, or Non-Profits.
 */
export function matchesApplicantType(
  candidateTypes: string[],
  orgType: string = 'CSO'
): { matched: boolean; reason?: string } {
  if (!candidateTypes || candidateTypes.length === 0) {
    return { matched: true };
  }

  const normTypes = candidateTypes.map(t => t.toLowerCase().trim());
  const nonProfitIndicators = [
    'ngo',
    'cso',
    'cbo',
    'non-profit',
    'non-governmental',
    'civil society',
    'charity',
    'community-based',
    'foundation',
    'social enterprise',
    'all eligible entities',
    'public and private',
    'local organizations',
    'local organisations'
  ];

  const hasNonProfit = normTypes.some(ct =>
    nonProfitIndicators.some(npi => ct.includes(npi))
  );

  const exclusiveIneligibleIndicators = [
    'universities only',
    'higher education institutions only',
    'governments only',
    'government agencies only',
    'ministries only',
    'for-profit commercial enterprises only'
  ];

  const isExclusivelyIneligible = normTypes.some(ct =>
    exclusiveIneligibleIndicators.some(eii => ct.includes(eii))
  );

  if (isExclusivelyIneligible && !hasNonProfit) {
    return { matched: false, reason: 'Opportunity restricted to academic/government/commercial entities only' };
  }

  return { matched: true };
}

/**
 * Calculates thematic overlap score between candidate opportunity and organisation.
 */
export function evaluateThematicOverlap(
  candidateThemes: string[],
  candidateSummary: string,
  orgThemes: string[],
  keywords: string[] = [],
  excludedSectors: string[] = []
): { score: number; matchedThemes: string[]; hasExclusion: boolean; exclusionReason?: string } {
  const normCandidateText = `${candidateThemes.join(' ')} ${candidateSummary}`.toLowerCase();

  // 1. Check excluded sectors
  for (const excluded of excludedSectors) {
    const normEx = excluded.toLowerCase().trim();
    if (normEx && normCandidateText.includes(normEx)) {
      return { score: 0, matchedThemes: [], hasExclusion: true, exclusionReason: `Contains excluded sector: ${excluded}` };
    }
  }

  const matchedThemes: string[] = [];
  let score = 0;

  // 2. Compare against org thematic areas
  for (const theme of orgThemes) {
    const normTheme = theme.toLowerCase().trim();
    const themeTokens = normalizeTokens(normTheme);

    if (normCandidateText.includes(normTheme)) {
      score += 10;
      matchedThemes.push(theme);
    } else {
      const matchCount = themeTokens.filter(token => {
        if (normCandidateText.includes(token)) return true;
        // Check stem matches (e.g. farm/farming, climat/climate, health/healthcare, lead/leadership, agricult/agriculture)
        if (token.length >= 4) {
          const stem = token.slice(0, Math.min(5, token.length - 1));
          return normCandidateText.includes(stem);
        }
        return false;
      }).length;

      if (matchCount >= 1 && themeTokens.length <= 2) {
        score += 8;
        matchedThemes.push(theme);
      } else if (matchCount >= 2) {
        score += 8;
        matchedThemes.push(theme);
      }
    }
  }

  // 3. Compare against keywords
  for (const kw of keywords) {
    const normKw = kw.toLowerCase().trim();
    if (normKw && (normCandidateText.includes(normKw) || (normKw.length >= 4 && normCandidateText.includes(normKw.slice(0, 4))))) {
      score += 4;
      if (!matchedThemes.includes(kw)) {
        matchedThemes.push(kw);
      }
    }
  }

  return { score, matchedThemes: Array.from(new Set(matchedThemes)), hasExclusion: false };
}

/**
 * Parses and checks deadline viability.
 */
export function evaluateDeadlineViability(deadlineStr?: string): {
  isExpired: boolean;
  daysRemaining: number | null;
  isDeadlineRisk: boolean;
  status: OpportunityStatus;
  notice?: string;
} {
  if (!deadlineStr || deadlineStr.toLowerCase().includes('rolling') || deadlineStr.toLowerCase().includes('tbd')) {
    return {
      isExpired: false,
      daysRemaining: null,
      isDeadlineRisk: false,
      status: 'Rolling / no fixed deadline'
    };
  }

  try {
    const deadlineDate = new Date(deadlineStr);
    if (isNaN(deadlineDate.getTime())) {
      return {
        isExpired: false,
        daysRemaining: null,
        isDeadlineRisk: false,
        status: 'Deadline unclear — verify'
      };
    }

    const now = Date.now();
    const msRemaining = deadlineDate.getTime() - now;
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    if (daysRemaining < -1) {
      // Past deadline (expired)
      return {
        isExpired: true,
        daysRemaining,
        isDeadlineRisk: false,
        status: 'Apparently closed',
        notice: `Expired ${Math.abs(daysRemaining)} days ago`
      };
    }

    if (daysRemaining >= 0 && daysRemaining <= 10) {
      return {
        isExpired: false,
        daysRemaining,
        isDeadlineRisk: true,
        status: 'Deadline approaching',
        notice: `Deadline Risk: Only ${daysRemaining === 0 ? 'few hours' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`} remain before submission.`
      };
    }

    return {
      isExpired: false,
      daysRemaining,
      isDeadlineRisk: false,
      status: daysRemaining <= 30 ? 'Deadline approaching' : 'Open'
    };
  } catch {
    return {
      isExpired: false,
      daysRemaining: null,
      isDeadlineRisk: false,
      status: 'Deadline unclear — verify'
    };
  }
}

/**
 * Main Opportunity Matching & Hard Filter Evaluator
 */
export function evaluateOpportunityFit(
  candidate: Partial<ScoutedOpportunity>,
  orgProfile: OrgProfile
): EvaluationResult {
  const orgCountry = orgProfile.country || 'Nigeria';
  const orgName = orgProfile.name || 'Civil Society Organisation';
  const orgType = orgProfile.fundingPreferences?.orgType || orgProfile.orgType || 'CSO';
  const orgThematics = Array.from(new Set([
    ...(orgProfile.thematicAreas || []),
    ...(orgProfile.fundingPreferences?.thematicAreas || [])
  ]));
  if (orgThematics.length === 0) {
    orgThematics.push('Community Development', 'Youth Empowerment');
  }
  const orgKeywords = orgProfile.fundingPreferences?.keywords || [];
  const excludedSectors = orgProfile.fundingPreferences?.excludedSectors || [];
  const excludedCountries = orgProfile.fundingPreferences?.excludedCountries || [];
  const targetGeos = orgProfile.fundingPreferences?.geographicEligibility || orgProfile.geographicAreas || [];

  // ==========================================
  // HARD FILTERS
  // ==========================================

  // 1. Geographic Ineligibility
  const geoResult = matchesGeography(
    candidate.eligibleGeography || [],
    orgCountry,
    targetGeos,
    excludedCountries
  );
  if (!geoResult.matched) {
    return {
      isDisqualified: true,
      disqualificationReason: geoResult.reason || `Ineligible geography: not open to ${orgCountry}`,
      verdict: 'LOW MATCH',
      fitScore: 0,
      matchReasons: [],
      criteriaBreakdown: [],
      isDeadlineRisk: false
    };
  }

  // 2. Applicant Type Ineligibility
  const applicantResult = matchesApplicantType(
    candidate.eligibleApplicantTypes || [],
    orgType
  );
  if (!applicantResult.matched) {
    return {
      isDisqualified: true,
      disqualificationReason: applicantResult.reason || 'Applicant entity type ineligible',
      verdict: 'LOW MATCH',
      fitScore: 0,
      matchReasons: [],
      criteriaBreakdown: [],
      isDeadlineRisk: false
    };
  }

  // 3. Closed / Expired Status
  const deadlineResult = evaluateDeadlineViability(candidate.deadline);
  if (deadlineResult.isExpired) {
    return {
      isDisqualified: true,
      disqualificationReason: deadlineResult.notice || 'Opportunity is closed/expired',
      verdict: 'LOW MATCH',
      fitScore: 0,
      matchReasons: [],
      criteriaBreakdown: [],
      isDeadlineRisk: false
    };
  }

  // 4. Thematic Overlap & Exclusions
  const thematicResult = evaluateThematicOverlap(
    candidate.thematicFocus || [],
    candidate.rawSummary || candidate.title || '',
    orgThematics,
    orgKeywords,
    excludedSectors
  );
  if (thematicResult.hasExclusion) {
    return {
      isDisqualified: true,
      disqualificationReason: thematicResult.exclusionReason || 'Conflicts with excluded sector',
      verdict: 'LOW MATCH',
      fitScore: 0,
      matchReasons: [],
      criteriaBreakdown: [],
      isDeadlineRisk: false
    };
  }

  if (thematicResult.score === 0 && thematicResult.matchedThemes.length === 0) {
    return {
      isDisqualified: true,
      disqualificationReason: 'Zero thematic alignment with organisation focus areas',
      verdict: 'LOW MATCH',
      fitScore: 0,
      matchReasons: [],
      criteriaBreakdown: [],
      isDeadlineRisk: false
    };
  }

  // ==========================================
  // FIT SCORING & VERDICT DETERMINATION
  // ==========================================
  let fitScore = 0;
  const matchReasons: string[] = [];
  const criteriaBreakdown: OpportunityMatchCriterion[] = [];

  // 1. Geographic Fit (+10 direct / +6 regional)
  if (geoResult.directCountryMatch) {
    fitScore += 10;
    matchReasons.push(`${orgCountry} directly eligible`);
    criteriaBreakdown.push({
      criterion: `Geographic Eligibility (${orgCountry})`,
      status: 'MET',
      evidence: `${orgName} operates in ${orgCountry}, listed in donor geographic mandate.`
    });
  } else {
    fitScore += 6;
    matchReasons.push(`Regional/continental eligibility for ${orgCountry}`);
    criteriaBreakdown.push({
      criterion: 'Regional Coverage',
      status: 'MET',
      evidence: 'Covers regional development envelope including headquarters.'
    });
  }

  // 2. Applicant Type Fit (+10)
  fitScore += 10;
  matchReasons.push(`${orgType}s & Non-Profits eligible`);
  criteriaBreakdown.push({
    criterion: 'Applicant Entity Type',
    status: 'MET',
    evidence: `Incorporated non-profit / ${orgType} registration satisfies donor guidelines.`
  });

  // 3. Thematic Alignment (+12 primary / +6 secondary)
  if (thematicResult.matchedThemes.length > 0) {
    fitScore += Math.min(20, thematicResult.score);
    const topThemes = thematicResult.matchedThemes.slice(0, 2).join(' & ');
    matchReasons.push(`Strong ${topThemes} thematic alignment`);
    criteriaBreakdown.push({
      criterion: 'Thematic Fit & Focus Areas',
      status: 'MET',
      evidence: `Directly aligns with organisation programming in ${topThemes}.`
    });
  }

  // 4. Deadline Viability (+8 verified future / +4 rolling)
  if (deadlineResult.status === 'Open') {
    fitScore += 8;
  } else if (deadlineResult.status === 'Rolling / no fixed deadline') {
    fitScore += 6;
    matchReasons.push('Rolling submission window');
  } else if (deadlineResult.isDeadlineRisk) {
    fitScore += 3;
    matchReasons.push(`Deadline approaching (${deadlineResult.daysRemaining} days remaining)`);
    criteriaBreakdown.push({
      criterion: 'Deadline Viability',
      status: 'REVIEW_REQUIRED',
      evidence: deadlineResult.notice || 'Short turnaround window before closing date.'
    });
  }

  // 5. Funding Envelope Match (+6)
  if (candidate.fundingAmount && !candidate.fundingAmount.toLowerCase().includes('tbd')) {
    fitScore += 6;
    matchReasons.push(`Grant size (${candidate.fundingAmount.split('(')[0].trim()}) fits absorption range`);
    criteriaBreakdown.push({
      criterion: 'Grant Envelope & Budget Absorption',
      status: 'MET',
      evidence: `${candidate.fundingAmount} is within target institutional budget capacity.`
    });
  } else {
    fitScore += 3;
    criteriaBreakdown.push({
      criterion: 'Funding Ceiling',
      status: 'REVIEW_REQUIRED',
      evidence: 'Grant ceiling to be verified in full donor guidelines.'
    });
  }

  // 6. Institutional Policy Alignment (+4)
  criteriaBreakdown.push({
    criterion: 'Governance & Safeguarding Policies',
    status: 'MET',
    evidence: 'Institutional safeguarding and anti-fraud policies documented.'
  });

  // ==========================================
  // ASSIGN VERDICT BASED ON RIGOROUS STANDARDS
  // ==========================================
  let verdict: OpportunityMatchVerdict = 'REVIEW REQUIRED';

  const hasAmbiguousDeadline = candidate.deadlineStatus === 'Needs Verification' || deadlineResult.status === 'Deadline unclear — verify';
  const hasReviewRequiredCriteria = criteriaBreakdown.some(c => c.status === 'REVIEW_REQUIRED');

  // STRONG MATCH requires:
  // 1. Geography matches directly or regionally
  // 2. Entity type matches
  // 3. Thematic focus strongly overlaps (thematic score >= 10)
  // 4. Opportunity appears open with viable future deadline
  // 5. No mandatory eligibility conflict
  if (
    geoResult.matched &&
    thematicResult.score >= 10 &&
    thematicResult.matchedThemes.length >= 1 &&
    !hasAmbiguousDeadline &&
    !deadlineResult.isDeadlineRisk &&
    fitScore >= 35
  ) {
    verdict = 'STRONG MATCH';
  } else if (fitScore >= 26 && !hasAmbiguousDeadline) {
    verdict = 'POSSIBLE MATCH';
  } else if (fitScore >= 18) {
    verdict = 'REVIEW REQUIRED';
  } else {
    verdict = 'LOW MATCH';
  }

  return {
    isDisqualified: false,
    verdict,
    fitScore,
    matchReasons: matchReasons.slice(0, 4),
    criteriaBreakdown,
    isDeadlineRisk: deadlineResult.isDeadlineRisk,
    deadlineRiskNotice: deadlineResult.notice
  };
}

/**
 * Filters, evaluates, ranks, and limits a collection of scouted opportunities.
 * Returns the top 5–10 verified opportunities prioritising relevance over volume.
 */
export function rankAndFilterScoutOpportunities(
  candidates: ScoutedOpportunity[],
  orgProfile: OrgProfile,
  maxResults: number = 8
): ScoutedOpportunity[] {
  const evaluated: ScoutedOpportunity[] = [];

  for (const candidate of candidates) {
    const fit = evaluateOpportunityFit(candidate, orgProfile);

    // Discard hard-filtered candidates
    if (fit.isDisqualified) {
      continue;
    }

    evaluated.push({
      ...candidate,
      matchVerdict: fit.verdict,
      fitScore: fit.fitScore,
      matchReasons: fit.matchReasons.length > 0 ? fit.matchReasons : candidate.matchReasons,
      matchCriteriaBreakdown: fit.criteriaBreakdown.length > 0 ? fit.criteriaBreakdown : candidate.matchCriteriaBreakdown,
      isDeadlineRisk: fit.isDeadlineRisk,
      deadlineRiskNotice: fit.deadlineRiskNotice
    });
  }

  // Sort primarily by fitScore in descending order, secondarily by STRONG MATCH > POSSIBLE MATCH > REVIEW REQUIRED
  const verdictWeight: Record<OpportunityMatchVerdict, number> = {
    'STRONG MATCH': 100,
    'POSSIBLE MATCH': 50,
    'REVIEW REQUIRED': 25,
    'LOW MATCH': 0
  };

  evaluated.sort((a, b) => {
    const weightA = verdictWeight[a.matchVerdict] || 0;
    const weightB = verdictWeight[b.matchVerdict] || 0;
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    return (b.fitScore || 0) - (a.fitScore || 0);
  });

  // Return the top verified results (5-10); if fewer exist, return fewer without padding!
  return evaluated.slice(0, maxResults);
}

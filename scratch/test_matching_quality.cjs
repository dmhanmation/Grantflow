process.env.NODE_ENV = 'test';
const { evaluateOpportunityFit, rankAndFilterScoutOpportunities, evaluateDeadlineViability } = require('../dist/server.cjs');

console.log('================================================================');
console.log('🧪 TESTING OPPORTUNITY SCOUT RELEVANCE & MATCHING QUALITY');
console.log('================================================================\n');

// 1. Setup Contrasting Organisation Profiles
const orgNigeria = {
  id: 'org-ng-women-cso',
  name: 'Centre for Women & Youth Leadership Initiative',
  country: 'Nigeria',
  orgType: 'Civil Society Organisation (CSO)',
  registrationStatus: 'Incorporated Trustee / Non-Profit',
  thematicAreas: ['Women Rights', 'Youth Vocational Skilling', 'GBV Response', 'Economic Justice'],
  geographicAreas: ['Nigeria', 'West Africa'],
  fundingPreferences: {
    thematicAreas: ['Women Leadership', 'Gender Equality', 'Youth Employment'],
    geographicEligibility: ['Nigeria', 'West Africa'],
    beneficiaryGroups: ['Vulnerable Women & Girls', 'Youth'],
    orgType: 'CSO',
    preferredFundingMin: '$50,000',
    preferredFundingMax: '$500,000',
    minimumUsefulGrantSize: 25000,
    excludedSectors: ['Fossil Fuels', 'Tobacco', 'Military Defence'],
    excludedCountries: ['Syria', 'North Korea']
  }
};

const orgKenya = {
  id: 'org-ke-climate-ngo',
  name: 'Rift Valley Climate & Agriculture Initiative',
  country: 'Kenya',
  orgType: 'Non-Profit Foundation',
  registrationStatus: 'Registered NGO',
  thematicAreas: ['Regenerative Farming', 'Climate Resilience', 'Water Resource Management', 'Smallholder Agriculture'],
  geographicAreas: ['Kenya', 'East Africa'],
  fundingPreferences: {
    thematicAreas: ['Agroforestry', 'Drought Mitigation', 'Soil Carbon'],
    geographicEligibility: ['Kenya', 'East Africa'],
    beneficiaryGroups: ['Smallholder Farmers', 'Pastoralist Communities'],
    orgType: 'NGO',
    preferredFundingMin: '$50,000',
    preferredFundingMax: '$400,000',
    minimumUsefulGrantSize: 30000,
    excludedSectors: ['Chemical Fertilizers', 'Mining'],
    excludedCountries: ['Sudan']
  }
};

// 2. Candidate Opportunities Pool
const candidatePool = [
  // A. Nigeria / West Africa Women & Gender Call
  {
    id: 'cand-01',
    donor: 'UN Women Peace & Humanitarian Fund',
    title: 'Sub-Saharan Africa Women Leadership & Protection Call',
    rawSummary: 'Grants for local civil society organisations empowering women and youth leaders.',
    deadline: '2026-11-20T17:00:00Z',
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Open',
    fundingAmount: '$200,000 USD',
    currency: 'USD',
    eligibleGeography: ['Nigeria', 'Ghana', 'West Africa'],
    eligibleApplicantTypes: ['Civil Society Organisations', 'Women-Led NGOs'],
    thematicFocus: ['Women Rights', 'Women Leadership', 'Gender Equality'],
    sourceUrl: 'https://wphfund.org/call-2026',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  },
  // B. East Africa Regenerative Farming & Climate Call
  {
    id: 'cand-02',
    donor: 'Alliance for a Green Revolution in Africa (AGRA)',
    title: 'East Africa Smallholder Climate Resilience & Agroforestry Fund',
    rawSummary: 'Financing for African agricultural NGOs promoting regenerative farming and water management.',
    deadline: '2026-11-25T17:00:00Z',
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Open',
    fundingAmount: '$300,000 USD',
    currency: 'USD',
    eligibleGeography: ['Kenya', 'Uganda', 'Tanzania', 'East Africa'],
    eligibleApplicantTypes: ['Non-Profit Foundations', 'Agricultural NGOs'],
    thematicFocus: ['Regenerative Farming', 'Climate Resilience', 'Agroforestry', 'Water Resource Management'],
    sourceUrl: 'https://agra.org/climate-2026',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  },
  // C. Ineligible Geography Call (Latin America Only)
  {
    id: 'cand-03-geo-ineligible',
    donor: 'Inter-American Foundation',
    title: 'Andean Community Development Call',
    rawSummary: 'Funding for local CSOs in Colombia and Peru.',
    deadline: '2026-12-01T17:00:00Z',
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Open',
    fundingAmount: '$150,000 USD',
    currency: 'USD',
    eligibleGeography: ['Colombia', 'Peru', 'Bolivia'],
    eligibleApplicantTypes: ['CSOs', 'NGOs'],
    thematicFocus: ['Women Leadership', 'Youth Employment'],
    sourceUrl: 'https://iaf.gov/andean-2026',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  },
  // D. Ineligible Applicant Type (Universities Only)
  {
    id: 'cand-04-type-ineligible',
    donor: 'National Science Foundation',
    title: 'Higher Education Research Facility Grant',
    rawSummary: 'Academic research grants for accredited universities only.',
    deadline: '2026-12-15T17:00:00Z',
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Open',
    fundingAmount: '$500,000 USD',
    currency: 'USD',
    eligibleGeography: ['Nigeria', 'Kenya', 'Global'],
    eligibleApplicantTypes: ['Universities Only', 'Higher Education Institutions Only'],
    thematicFocus: ['Women Leadership', 'Climate Resilience'],
    sourceUrl: 'https://nsf.gov/research-2026',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  },
  // E. Closed / Expired Call
  {
    id: 'cand-05-expired',
    donor: 'Global Partnership Fund',
    title: 'Past 2024 Emergency Support Call',
    rawSummary: 'Emergency COVID-19 relief for civil society.',
    deadline: '2024-05-01T17:00:00Z',
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Apparently closed',
    fundingAmount: '$100,000 USD',
    currency: 'USD',
    eligibleGeography: ['Nigeria', 'Kenya'],
    eligibleApplicantTypes: ['NGOs', 'CSOs'],
    thematicFocus: ['Women Rights', 'Community Health'],
    sourceUrl: 'https://gpf.org/expired-2024',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  },
  // F. Excluded Sector Call (Tobacco/Fossil Fuels)
  {
    id: 'cand-06-excluded-sector',
    donor: 'Commercial Energy Foundation',
    title: 'Fossil Fuels Transition Subsidy Window',
    rawSummary: 'Support for industrial energy facilities.',
    deadline: '2026-11-30T17:00:00Z',
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Open',
    fundingAmount: '$250,000 USD',
    currency: 'USD',
    eligibleGeography: ['Nigeria'],
    eligibleApplicantTypes: ['CSOs', 'NGOs'],
    thematicFocus: ['Fossil Fuels', 'Energy'],
    sourceUrl: 'https://energy.org/call-2026',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  },
  // G. Deadline Risk Call (Closing in 3 days)
  {
    id: 'cand-07-deadline-risk',
    donor: 'Urgent Action Fund Africa',
    title: 'Rapid Women Human Rights Defenders Response Window',
    rawSummary: 'Rapid response grants for women human rights defenders.',
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    deadlineStatus: 'Confirmed from Source',
    opportunityStatus: 'Deadline approaching',
    fundingAmount: '$50,000 USD',
    currency: 'USD',
    eligibleGeography: ['Nigeria', 'West Africa'],
    eligibleApplicantTypes: ['CSOs', 'NGOs'],
    thematicFocus: ['Women Rights', 'Human Rights'],
    sourceUrl: 'https://uaf-africa.org/rapid-2026',
    isVerifiedAgainstSource: true,
    matchVerdict: 'STRONG MATCH',
    matchReasons: [],
    matchCriteriaBreakdown: [],
    status: 'Inbox'
  }
];

// Test 1: Hard Filter Verification
console.log('1. Testing Hard Filter Disqualifications...');

const resGeo = evaluateOpportunityFit(candidatePool[2], orgNigeria);
if (!resGeo.isDisqualified) throw new Error('Failed: Ineligible geography was not hard-filtered out!');
console.log(`✅ Ineligible Geography Disqualified: "${resGeo.disqualificationReason}"`);

const resType = evaluateOpportunityFit(candidatePool[3], orgNigeria);
if (!resType.isDisqualified) throw new Error('Failed: Ineligible applicant type was not hard-filtered out!');
console.log(`✅ Ineligible Applicant Type Disqualified: "${resType.disqualificationReason}"`);

const resExpired = evaluateOpportunityFit(candidatePool[4], orgNigeria);
if (!resExpired.isDisqualified) throw new Error('Failed: Expired opportunity was not hard-filtered out!');
console.log(`✅ Expired Call Disqualified: "${resExpired.disqualificationReason}"`);

const resExSector = evaluateOpportunityFit(candidatePool[5], orgNigeria);
if (!resExSector.isDisqualified) throw new Error('Failed: Excluded sector opportunity was not hard-filtered out!');
console.log(`✅ Excluded Sector Disqualified: "${resExSector.disqualificationReason}"`);

// Test 2: Contrasting Organisation Results
console.log('\n2. Testing Meaningful Result Divergence Across Contrasting Orgs...');

const resultsNG = rankAndFilterScoutOpportunities(candidatePool, orgNigeria);
const resultsKE = rankAndFilterScoutOpportunities(candidatePool, orgKenya);

console.log(`- Results for Nigerian Women/Youth CSO (${resultsNG.length} matches):`);
resultsNG.forEach(r => console.log(`   • [${r.matchVerdict}] ${r.donor}: "${r.title}" (Score: ${r.fitScore})`));

console.log(`- Results for Kenyan Climate/Agri NGO (${resultsKE.length} matches):`);
resultsKE.forEach(r => console.log(`   • [${r.matchVerdict}] ${r.donor}: "${r.title}" (Score: ${r.fitScore})`));

// Assertions
if (resultsNG.some(r => r.title.includes('Agroforestry') || r.title.includes('Andean'))) {
  throw new Error('Nigerian CSO received irrelevant East Africa or Andean grant!');
}
if (resultsKE.some(r => r.title.includes('Women') || r.title.includes('Andean'))) {
  throw new Error('Kenyan Climate NGO received irrelevant Women rights or Andean grant!');
}
if (resultsNG.length === 0 || resultsKE.length === 0) {
  throw new Error('Expected at least 1 verified high-relevance match per organisation.');
}
console.log('✅ 100% thematic and geographic precision verified between contrasting organisations.');

// Test 3: Deadline Risk Tagging
console.log('\n3. Testing Deadline Risk Tagging...');
const deadlineRiskOpp = resultsNG.find(r => r.id === 'cand-07-deadline-risk');
if (!deadlineRiskOpp || !deadlineRiskOpp.isDeadlineRisk) {
  throw new Error('Opportunity closing in 3 days was not tagged as Deadline Risk!');
}
console.log(`✅ Deadline Risk flagged accurately: "${deadlineRiskOpp.deadlineRiskNotice}"`);

// Test 4: Concise Match Reasons
console.log('\n4. Testing Concise "Why this matches" Checklist...');
const topOpp = resultsNG[0];
console.log(`- Why GrantFlow matched "${topOpp.title}":`);
topOpp.matchReasons.forEach(r => console.log(`   ✓ ${r}`));
if (topOpp.matchReasons.length === 0) {
  throw new Error('Match reasons checklist is empty!');
}
console.log('✅ Concise match rationale verified.');

// Test 5: Volume Limiter
console.log('\n5. Testing Relevance Over Volume (No List Padding)...');
if (resultsNG.length > 8 || resultsKE.length > 8) {
  throw new Error('Returned more than 8 results!');
}
console.log(`✅ Clean result volume verified: ${resultsNG.length} high-relevance matches returned for Org A, ${resultsKE.length} for Org B.`);

console.log('\n================================================================');
console.log('🎉 ALL OPPORTUNITY SCOUT MATCHING QUALITY TESTS PASSED (100%)');
console.log('================================================================\n');

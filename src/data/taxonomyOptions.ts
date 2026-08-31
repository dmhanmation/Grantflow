/**
 * Standard international development, humanitarian aid, and NGO grant taxonomy options.
 * Used for structured dropdowns, multi-select controls, and AI opportunity matching.
 */

export const STANDARD_THEMATIC_SECTORS: string[] = [
  'Health & Public Health',
  'Education & Learning',
  'Water, Sanitation & Hygiene (WASH)',
  'Food Security & Agriculture',
  'Climate Resilience & Environment',
  'Livelihoods & Economic Empowerment',
  'Human Rights, Rule of Law & Governance',
  'Peacebuilding & Conflict Resolution',
  'Child Protection & Youth Development',
  'Gender Equality & Women Empowerment',
  'Emergency Response & Humanitarian Aid',
  'Disability Inclusion',
  'Nutrition & Maternal Care',
  'Renewable Energy & Sustainability',
  'Technology, AI & Digital Rights',
  'Civil Society Strengthening & Advocacy',
  'Mental Health & Psychosocial Support (MHPSS)',
  'Migration, Forced Displacement & Protection',
  'Arts, Culture & Heritage',
  'Biodiversity & Wildlife Conservation'
];

export const STANDARD_COUNTRIES: string[] = [
  'Nigeria',
  'Kenya',
  'Ghana',
  'Uganda',
  'South Africa',
  'Tanzania',
  'Ethiopia',
  'Rwanda',
  'Senegal',
  'Liberia',
  'Sierra Leone',
  'Democratic Republic of Congo',
  'Somalia',
  'South Sudan',
  'Sudan',
  'Egypt',
  'Morocco',
  'Zimbabwe',
  'Zambia',
  'Malawi',
  'Mozambique',
  'Cameroon',
  'Ivory Coast',
  'Burkina Faso',
  'Mali',
  'Niger',
  'Chad',
  'Gambia',
  'Benin',
  'Togo',
  'Angola',
  'Namibia',
  'Botswana',
  'United Kingdom',
  'United States',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'Sweden',
  'Norway',
  'Switzerland',
  'India',
  'Pakistan',
  'Bangladesh',
  'Nepal',
  'Philippines',
  'Indonesia',
  'Jordan',
  'Lebanon',
  'Colombia',
  'Brazil',
  'Guatemala',
  'Haiti'
];

export const STANDARD_BENEFICIARY_GROUPS: string[] = [
  'Women & Girls',
  'Youth & Adolescents (15-24)',
  'Children (0-14)',
  'Internally Displaced Persons (IDPs)',
  'Refugees & Asylum Seekers',
  'Persons with Disabilities (PWDs)',
  'Smallholder Farmers & Pastoralists',
  'Rural & Hard-to-Reach Communities',
  'Urban Poor & Informal Settlement Dwellers',
  'Indigenous Peoples & Ethnic Minorities',
  'Elderly & Senior Citizens',
  'Survivors of Gender-Based Violence (GBV)',
  'Key Populations & Marginalized Communities',
  'Local Community-Based Organisations (CBOs)',
  'Micro, Small & Medium Enterprises (MSMEs)',
  'Healthcare Workers & Community Health Volunteers',
  'School Children & Out-of-School Youth'
];

export const STANDARD_ORG_CLASSIFICATIONS: string[] = [
  'National NGO (NNGO)',
  'International NGO (INGO)',
  'Civil Society Organisation (CSO)',
  'Community-Based Organisation (CBO)',
  'Non-Profit Foundation / Trust',
  'Faith-Based Organisation (FBO)',
  'Academic & Research Institution',
  'Social Enterprise',
  'Women-Led Organisation (WLO)',
  'Youth-Led Organisation (YLO)',
  'Professional / Trade Association',
  'Think Tank / Policy Advocacy Institute'
];

export const STANDARD_DONOR_TYPES: string[] = [
  'Bilateral Agencies (USAID, FCDO, GIZ, JICA, Sida, Global Affairs Canada)',
  'Multilateral & UN Agencies (UNICEF, UNDP, UNHCR, WHO, EU / ECHO, Global Fund)',
  'Private Philanthropic Foundations (Ford, Gates, MacArthur, Rockefeller, Open Society)',
  'Corporate Social Responsibility (CSR) & Corporate Foundations',
  'Development Finance Institutions (World Bank, AfDB, IFC, EIB)',
  'Challenge Funds & Innovation Grantmakers',
  'Intermediary Grantmakers & INGO Sub-grantors',
  'Embassy & High Commission Small Grants Funds',
  'Regional / Local Trust Funds'
];

export const STANDARD_FUNDING_INSTRUMENTS: string[] = [
  'Standard Project Grant',
  'Core / Unrestricted Operating Support',
  'Challenge Fund / Innovation Grant',
  'Sub-grant / Consortium Partnership',
  'Direct Award / Rapid Response Grant',
  'Capacity Building & Technical Assistance Grant',
  'Seed Funding / Incubator Grant',
  'Prize Award / Challenge Bounty',
  'Fellowship / Research Grant',
  'Matching / Challenge Co-financing Grant'
];

export interface StandardDepartmentOption {
  name: string;
  code: string;
  color: string;
  mandate: string;
}

export const STANDARD_DEPARTMENT_OPTIONS: StandardDepartmentOption[] = [
  {
    name: 'Programmes',
    code: 'PROG',
    color: 'indigo',
    mandate: 'Technical project design, intervention delivery, thematic sector expertise, and field activity execution across active grants.'
  },
  {
    name: 'Finance',
    code: 'FIN',
    color: 'emerald',
    mandate: 'Budget formulation, financial reporting, co-financing verification, audit compliance, and cost-share tracking.'
  },
  {
    name: 'Monitoring, Evaluation, Accountability & Learning (MEAL)',
    code: 'MEAL',
    color: 'blue',
    mandate: 'Logframes, theory of change, key performance indicators, baseline studies, and community accountability mechanisms.'
  },
  {
    name: 'Grants / Resource Mobilisation',
    code: 'GRANTS',
    color: 'purple',
    mandate: 'Donor scouting, call analysis, proposal coordination, submission management, and institutional partnership development.'
  },
  {
    name: 'Communications',
    code: 'COMMS',
    color: 'amber',
    mandate: 'Visibility plans, stakeholder engagement, advocacy campaigns, and donor branding compliance.'
  },
  {
    name: 'Legal',
    code: 'LEGAL',
    color: 'slate',
    mandate: 'Contractual review, MoUs, consortium agreements, sub-grant contracts, and legal risk assessment.'
  },
  {
    name: 'Human Resources',
    code: 'HR',
    color: 'cyan',
    mandate: 'Key personnel staffing plans, organograms, CV formatting, recruitment timelines, and labor compliance.'
  },
  {
    name: 'Administration',
    code: 'ADMIN',
    color: 'slate',
    mandate: 'Logistics, office infrastructure, asset registries, travel planning, and administrative support.'
  },
  {
    name: 'Operations',
    code: 'OPS',
    color: 'cyan',
    mandate: 'Procurement plans, supply chain logistics, vendor vetting, and operational security.'
  },
  {
    name: 'Executive Management',
    code: 'EXEC',
    color: 'rose',
    mandate: 'Institutional sign-off, strategic alignment, board oversight, and final proposal authorization.'
  },
  {
    name: 'Compliance',
    code: 'COMP',
    color: 'amber',
    mandate: 'Anti-fraud, safeguarding, vetting, regulatory adherence, and donor statutory requirements.'
  }
];


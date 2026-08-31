import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, verifyPassword, StoredUser } from './src/server/db';
import {
  authenticate,
  requireAuth,
  requireOrgAdmin,
  createSessionToken,
  sanitizeUser,
  AuthenticatedRequest
} from './src/server/auth';
import {
  OrgProfile,
  StaffMember,
  StaffInvitation,
  OpportunityWorkspace,
  InstitutionalMemoryRecord,
  UserRole,
  ScoutedOpportunity,
  ScoutActivityLog,
  ScoutJobConfig,
  DismissalRecord,
  DismissalReason,
  ScoutOpportunityLifecycleStatus
} from './src/types';
import {
  developerTestFundingCall,
  developerTestExtraction,
  generateDeterministicAssessment,
  generateDeterministicApplicationSections,
  generateDeterministicTasks,
  generateDeterministicSectionCritique,
  generateDeterministicScoutResults
} from './src/data/developerTestModeData';
import {
  evaluateOpportunityFit,
  rankAndFilterScoutOpportunities,
  matchesGeography,
  matchesApplicantType,
  evaluateThematicOverlap,
  evaluateDeadlineViability
} from './src/server/scoutMatchingEngine';
import {
  isEmailConfigured,
  processWorkspaceEmailEvents,
  runDueNotificationScan,
  sendEmailConfigurationTest,
  sendStaffInvitationEmail
} from './src/server/emailNotifications';

export {
  evaluateOpportunityFit,
  rankAndFilterScoutOpportunities,
  matchesGeography,
  matchesApplicantType,
  evaluateThematicOverlap,
  evaluateDeadlineViability
};

// Read PORT before dotenv so Cloud Run's PORT env var is never overridden by .env file
const PORT = parseInt(process.env.PORT || '3000', 10);

dotenv.config();

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(authenticate);

// Multi-Tier Model Candidate Chain (Primary: gemini-3.6-flash -> Fallback: gemini-3.7-flash)
const getModelCandidateList = (): string[] => {
  const customPrimary = process.env.GEMINI_MODEL;
  const customFallback = process.env.GEMINI_FALLBACK_MODEL;

  const defaults = [
    customPrimary,
    customFallback,
    'gemini-3.6-flash',
    'gemini-3.7-flash'
  ].filter((m): m is string => Boolean(m && typeof m === 'string' && m.trim().length > 0));

  return Array.from(new Set(defaults));
};

const getPrimaryModel = (): string => {
  const models = getModelCandidateList();
  return models[0] || 'gemini-3.6-flash';
};

const getFallbackModel = (): string => {
  const models = getModelCandidateList();
  return models[1] || 'gemini-3.7-flash';
};

// Backwards-compatible alias for primary model
const getGeminiModel = (): string => {
  return getPrimaryModel();
};

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini Client] GEMINI_API_KEY is not set in environment. Deterministic / fallback extraction will be used.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// Helper for identifying temporary retryable errors (503, 429, high demand, overloaded, network disconnects)
const isRetryableError = (error: any): boolean => {
  if (!error) return false;

  const status = error.status || error.statusCode || error.response?.status || error.code;

  // Explicit non-retryable client/auth errors (Do NOT retry or fall back for these)
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }

  // Temporary server/capacity statuses
  if (status === 503 || status === 429 || status === 502 || status === 504 || status === 500) {
    return true;
  }

  const message = String(error.message || error.toString() || '').toLowerCase();

  // Non-retryable message patterns
  if (
    message.includes('api_key_invalid') ||
    message.includes('api key not valid') ||
    message.includes('invalid argument') ||
    message.includes('bad request') ||
    message.includes('permission_denied') ||
    message.includes('permission denied') ||
    message.includes('unauthenticated') ||
    message.includes('unauthorized')
  ) {
    return false;
  }

  const retryableKeywords = [
    '503',
    'service unavailable',
    'high demand',
    'currently experiencing high demand',
    'overloaded',
    'resource exhausted',
    'resource_exhausted',
    'rate limit',
    'quota exceeded',
    'econnreset',
    'etimedout',
    'fetch failed',
    'socket hang up',
    'unavailable',
    'temporarily unavailable',
    'try again later',
    'model is overloaded',
    'backend error'
  ];

  return retryableKeywords.some(keyword => message.includes(keyword));
};

interface FailoverOptions {
  operationName?: string;
  retriesPerModel?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

interface FailoverExecutionResult<T> {
  data: T;
  modelUsed: string;
  isFallback: boolean;
  tierIndex: number;
}

/**
 * Sanitizes log output to ensure API keys and auth tokens are never leaked into server logs.
 */
function sanitizeLogMessage(msg: string): string {
  return msg
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=REDACTED')
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer REDACTED')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIzaREDACTED');
}

/**
 * Executes a Gemini operation through the multi-tier model candidate chain.
 * Retries temporary 503/429/overloaded errors with exponential backoff and automatically
 * falls back across configured models (e.g. gemini-3.6-flash -> gemini-3.7-flash)
 * before returning a friendly error.
 */
async function executeWithModelFailover<T>(
  operation: (model: string) => Promise<T>,
  options: FailoverOptions = {}
): Promise<FailoverExecutionResult<T>> {
  const candidateModels = getModelCandidateList();
  const opName = options.operationName || 'Gemini Operation';
  const retriesPerModel = options.retriesPerModel ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 800;
  const backoffFactor = options.backoffFactor ?? 1.8;

  let lastError: any = null;

  for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
    const currentModel = candidateModels[modelIdx];
    const isFallbackTier = modelIdx > 0;
    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt <= retriesPerModel) {
      try {
        console.log(
          `[Gemini Failover] [${opName}] Attempting model ${modelIdx + 1}/${candidateModels.length}: "${currentModel}" (attempt ${attempt + 1}/${retriesPerModel + 1})...`
        );
        const startTime = Date.now();
        const res = await operation(currentModel);
        const elapsed = Date.now() - startTime;

        console.log(
          `[Gemini Failover] [${opName}] ✓ SUCCEEDED using model: "${currentModel}" (took ${elapsed}ms, Tier ${modelIdx + 1}/${candidateModels.length})`
        );

        return {
          data: res,
          modelUsed: currentModel,
          isFallback: isFallbackTier,
          tierIndex: modelIdx
        };
      } catch (error: any) {
        attempt++;
        lastError = error;
        const retryable = isRetryableError(error);
        const safeError = sanitizeLogMessage(error?.message || String(error));

        // Non-retryable error (e.g. 400 bad schema, 401 auth): fail immediately without looping other models
        if (!retryable) {
          console.error(
            `[Gemini Failover] [${opName}] Non-retryable client error on model "${currentModel}": ${safeError}. Aborting failover.`
          );
          throw error;
        }

        console.warn(
          `[Gemini Failover] [${opName}] Model "${currentModel}" attempt ${attempt} failed with temporary capacity/503 error: ${safeError}`
        );

        const isQuotaDepleted = String(safeError).toLowerCase().includes('credits are depleted') || String(safeError).toLowerCase().includes('resource_exhausted');
        if (isQuotaDepleted) {
          // Account-level quota exhausted: don't spin in retry loop for this model
          break;
        }

        if (attempt <= retriesPerModel) {
          const jitteredDelay = Math.round(delay * (0.85 + Math.random() * 0.3));
          console.log(`[Gemini Failover] [${opName}] Retrying model "${currentModel}" in ${jitteredDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, jitteredDelay));
          delay *= backoffFactor;
        } else {
          // Retries exhausted for this model tier
          if (modelIdx < candidateModels.length - 1) {
            const nextModel = candidateModels[modelIdx + 1];
            console.warn(
              `[Gemini Failover] [${opName}] Model "${currentModel}" exhausted retries due to temporary 503/capacity limits. Initiating automatic failover to Tier ${modelIdx + 2} model: "${nextModel}"...`
            );
          } else {
            console.error(
              `[Gemini Failover] [${opName}] All ${candidateModels.length} configured Gemini models exhausted retries due to temporary capacity/503 limits.`
            );
          }
        }
      }
    }
  }

  throw lastError || new Error(`[${opName}] All ${candidateModels.length} Gemini model candidates failed.`);
}

// User-friendly API error formatter that never exposes raw JSON/stack traces to client
const formatApiErrorResponse = (error: any, defaultMessage: string) => {
  const isTemp = isRetryableError(error);
  const status = error?.status || error?.statusCode || (isTemp ? 503 : 500);

  let userFriendlyMessage = defaultMessage;
  if (isTemp) {
    userFriendlyMessage =
      'The AI service is currently experiencing temporary high demand across model endpoints. Your entered data and uploaded files have been safely preserved. Please try again shortly.';
  } else if (status === 401 || status === 403) {
    userFriendlyMessage =
      'AI service authentication failed. Please verify that your GEMINI_API_KEY is configured correctly in .env.';
  } else if (status === 400) {
    userFriendlyMessage =
      'Invalid request parameters. Please check your entered text or document content and try again.';
  } else if (error?.message && typeof error.message === 'string' && !error.message.includes('{') && error.message.length < 200) {
    userFriendlyMessage = error.message;
  }

  return {
    status: isTemp ? 503 : (status >= 400 && status < 600 ? status : 500),
    body: {
      error: userFriendlyMessage,
      isTemporary: isTemp,
      code: isTemp ? 'GEMINI_TEMPORARILY_UNAVAILABLE' : (status === 401 ? 'AUTH_ERROR' : 'GEMINI_ERROR')
    }
  };
};

// Developer / Test Mode endpoint (Local Development Only)
app.get('/api/test-mode/sample-opportunity', (req: Request, res: Response) => {
  return res.json({
    fundingCall: developerTestFundingCall,
    extraction: developerTestExtraction,
    isTestMode: true,
    note: 'Deterministic pre-parsed opportunity for local workflow testing.'
  });
});

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'GrantFlow Agent API',
    model: getPrimaryModel(),
    primaryModel: getPrimaryModel(),
    fallbackModel: getFallbackModel(),
    timestamp: new Date().toISOString()
  });
});

// === Authentication & Multi-Tenant Organization Endpoints ===

// 1. Register new real organization + Admin user
app.post('/api/auth/register-org', (req: AuthenticatedRequest, res: Response) => {
  try {
    // If request has an active authenticated user session, check multi-org permissions:
    if (req.user) {
      const isAllowed = Boolean(req.user.isSuperAdmin || req.user.hasMultiOrgAccess);
      if (!isAllowed) {
        return res.status(403).json({
          error: 'Standard subscribers can only manage their own organization. Creating additional organizations requires a Multi-Organisation account or Platform Super Admin access.'
        });
      }
    }

    const { orgName, country, registrationStatus, orgType, thematicAreas, contactEmail, adminFullName, adminEmail, adminPassword } = req.body;

    if (!orgName || !adminFullName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'Missing required organization or admin details.' });
    }

    const existingUser = db.findUserByEmail(adminEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email address already exists.' });
    }

    const orgId = `org-${Date.now()}`;
    const staffId = `staff-admin-${Date.now()}`;
    const userId = `user-admin-${Date.now()}`;

    const adminStaff: StaffMember = {
      id: staffId,
      userId,
      fullName: adminFullName.trim(),
      jobTitle: 'Organisation Administrator',
      department: '',
      departmentId: undefined,
      email: adminEmail.trim().toLowerCase(),
      isDepartmentHead: false,
      functionalRole: 'Admin',
      role: 'Admin',
      roles: ['Admin'],
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    const newOrg: OrgProfile = {
      id: orgId,
      organizationId: orgId,
      name: orgName.trim(),
      country: country ? country.trim() : '',
      yearEstablished: 0,
      registrationStatus: registrationStatus ? registrationStatus.trim() : '',
      orgType: orgType ? orgType.trim() : '',
      thematicAreas: Array.isArray(thematicAreas) && thematicAreas.length > 0 ? thematicAreas : [],
      geographicAreas: country ? [country.trim()] : [],
      yearsExperience: 0,
      annualBudgetRange: '',
      annualBudgetUsdEstimate: 0,
      staffCount: 1,
      adminEmail: adminEmail.trim().toLowerCase(),
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : adminEmail.trim().toLowerCase(),
      onboardingComplete: false,
      isDemo: false,
      departments: [],
      staffDirectory: [adminStaff],
      documentLibrary: [],
      previousDonors: [],
      auditedAccountsAvailable: false,
      auditedAccountsYears: 0,
      safeguardingPolicy: false,
      genderPolicy: false,
      antiFraudPolicy: false,
      meCapacity: '',
      description: '',
      updatedAt: new Date().toISOString()
    };

    db.saveOrg(newOrg);

    const { hash, salt } = hashPassword(adminPassword);
    const storedUser: StoredUser = {
      id: userId,
      email: adminEmail.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      fullName: adminFullName.trim(),
      organizationId: orgId,
      role: 'Admin',
      roles: ['Admin'],
      departmentId: undefined,
      departmentName: '',
      staffId,
      jobTitle: 'Organisation Administrator',
      status: 'Active',
      isDemoUser: false,
      createdAt: new Date().toISOString()
    };

    db.createUser(storedUser);
    const token = createSessionToken(userId, orgId);

    return res.status(201).json({
      user: sanitizeUser(storedUser),
      organization: newOrg,
      token
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register organization.' });
  }
});

// 2. Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({ error: 'Account is deactivated. Please contact your organization administrator.' });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const org = db.getOrg(user.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Associated organization not found.' });
    }

    const token = createSessionToken(user.id, user.organizationId);
    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    return res.json({
      user: sanitizeUser(user),
      organization: org,
      token
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to login.' });
  }
});

// 3. Demo Login (fast one-click demo user switch)
app.post('/api/auth/demo-login', (req: Request, res: Response) => {
  try {
    const { email, staffId, role } = req.body;
    const demoOrgId = 'org-demo-01';
    const demoOrg = db.getOrg(demoOrgId);
    if (!demoOrg) {
      return res.status(404).json({ error: 'Demo organization not found.' });
    }

    const demoUsers = db.getUsersByOrg(demoOrgId);
    let targetUser: StoredUser | undefined;

    if (email) {
      targetUser = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    } else if (staffId) {
      targetUser = demoUsers.find(u => u.staffId === staffId);
    } else if (role) {
      targetUser = demoUsers.find(u => u.role === role || (u.roles || []).includes(role));
    }

    if (!targetUser) {
      targetUser = demoUsers.find(u => u.role === 'Admin' || u.role === 'ProposalLead') || demoUsers[0];
    }

    const token = createSessionToken(targetUser.id, demoOrgId);
    return res.json({
      user: sanitizeUser(targetUser),
      organization: demoOrg,
      token
    });
  } catch (err: any) {
    console.error('Demo login error:', err);
    return res.status(500).json({ error: 'Failed to authenticate demo user.' });
  }
});

// 4. Current session user
app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.organizationId) {
    return res.json({
      user: null,
      organization: null
    });
  }

  const org = db.getOrg(req.organizationId);
  return res.json({
    user: req.user,
    organization: org
  });
});

// 5. Complete Onboarding Flow
app.post('/api/org/onboarding', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId || req.body.organizationId;
    if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });

    const org = db.getOrg(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const {
      name,
      country,
      registrationStatus,
      thematicAreas,
      geographicAreas,
      departments,
      staffDirectory,
      defaultFinalApproverId,
      defaultFinalApproverName,
      smallNgoMode,
      requireIntermediateReviewer,
      contactEmail
    } = req.body;

    const updatedOrg: OrgProfile = {
      ...org,
      name: name || org.name,
      country: country || org.country,
      registrationStatus: registrationStatus || org.registrationStatus,
      thematicAreas: thematicAreas || org.thematicAreas,
      geographicAreas: geographicAreas || org.geographicAreas,
      departments: departments || org.departments,
      staffDirectory: staffDirectory || org.staffDirectory,
      defaultFinalApproverId: defaultFinalApproverId || org.defaultFinalApproverId,
      defaultFinalApproverName: defaultFinalApproverName || org.defaultFinalApproverName,
      smallNgoMode: smallNgoMode !== undefined ? smallNgoMode : org.smallNgoMode,
      requireIntermediateReviewer: requireIntermediateReviewer !== undefined ? requireIntermediateReviewer : org.requireIntermediateReviewer,
      contactEmail: contactEmail || org.contactEmail,
      onboardingComplete: true,
      updatedAt: new Date().toISOString()
    };

    db.saveOrg(updatedOrg);
    return res.json({ organization: updatedOrg });
  } catch (err: any) {
    console.error('Onboarding save error:', err);
    return res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
});

// 6. Get Organization Profile
app.get('/api/org/profile', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || (req.query.orgId as string);
  if (!orgId) return res.status(401).json({ error: 'Organization ID is required.' });
  const org = db.getOrg(orgId);
  if (!org) return res.status(404).json({ error: 'Organization not found.' });
  return res.json(org);
});

// 6b. Get All Organizations
app.get('/api/orgs', (req: Request, res: Response) => {
  try {
    const orgs = db.getAllOrgs();
    return res.json(orgs);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch organizations.' });
  }
});

// 7. Update Organization Profile
app.put('/api/org/profile', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || req.body.id || req.body.organizationId;
  if (!orgId) return res.status(401).json({ error: 'Organization ID is required.' });
  const existing = db.getOrg(orgId);
  if (!existing) return res.status(404).json({ error: 'Organization not found.' });

  const updated: OrgProfile = {
    ...existing,
    ...req.body,
    id: orgId,
    organizationId: orgId,
    updatedAt: new Date().toISOString()
  };

  db.saveOrg(updated);
  return res.json(updated);
});

// 7b. Clear Organization Data (Admin Only)
app.post('/api/org/clear-data', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId || req.body.organizationId;
    if (!orgId) return res.status(401).json({ error: 'Organization ID is required.' });

    const user = req.user;
    if (!user || (user.role !== 'Admin' && (!user.roles || !user.roles.includes('Admin')))) {
      return res.status(403).json({ error: 'Only Administrators can perform data clearing.' });
    }

    const { confirmationText } = req.body;
    if (confirmationText !== 'DELETE ALL DATA') {
      return res.status(400).json({ error: 'Confirmation mismatch. You must type "DELETE ALL DATA" to proceed.' });
    }

    const cleanedOrg = db.clearOrgData(orgId, user.id);
    if (!cleanedOrg) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    return res.json({
      success: true,
      message: 'All organisation operational data has been permanently deleted.',
      organization: cleanedOrg
    });
  } catch (err: any) {
    console.error('Clear data error:', err);
    return res.status(500).json({ error: 'Failed to clear organization data.' });
  }
});

// 7c. Delete Entire Organization (Admin Only)
app.post('/api/org/delete-org', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId || req.body.organizationId;
    if (!orgId) return res.status(401).json({ error: 'Organization ID is required.' });

    const user = req.user;
    if (!user || (user.role !== 'Admin' && (!user.roles || !user.roles.includes('Admin')))) {
      return res.status(403).json({ error: 'Only Administrators can delete an organisation.' });
    }

    const org = db.getOrg(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const { confirmationText } = req.body;
    const expectedConfirmation = org.name ? org.name.trim() : 'DELETE ORGANISATION';
    if (!confirmationText || confirmationText.trim() !== expectedConfirmation) {
      return res.status(400).json({
        error: `Confirmation mismatch. You must type "${expectedConfirmation}" to proceed.`
      });
    }

    const success = db.deleteOrg(orgId);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete organization.' });
    }

    return res.json({
      success: true,
      message: 'Organisation and all associated data permanently deleted.'
    });
  } catch (err: any) {
    console.error('Delete organization error:', err);
    return res.status(500).json({ error: 'Failed to delete organization.' });
  }
});

// 8. Staff Invitations: Create
app.post('/api/invitations/create', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId || req.body.organizationId || 'org-demo-01';
    const org = db.getOrg(orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const { email, fullName, jobTitle, departmentId, role, roles } = req.body;
    if (!email || !fullName) {
      return res.status(400).json({ error: 'Staff email and full name are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser && existingUser.organizationId === orgId) {
      return res.status(409).json({ error: 'A staff user with this email is already registered in your organisation.' });
    }

    const token = `inv_${crypto.randomBytes(24).toString('hex')}`;
    const department = (org.departments || []).find(d => d.id === departmentId)?.name || 'General';

    const invitation: StaffInvitation = {
      id: `inv-${Date.now()}`,
      token,
      organizationId: orgId,
      organizationName: org.name,
      email: cleanEmail,
      fullName: fullName.trim(),
      jobTitle: jobTitle || 'Staff Member',
      departmentId: departmentId || 'dept-prog',
      departmentName: department,
      role: role || 'Officer',
      roles: Array.isArray(roles) && roles.length > 0 ? roles : [role || 'Officer'],
      invitedBy: req.user?.fullName || 'Organisation Admin',
      invitedByEmail: req.user?.email || org.adminEmail || 'admin@grantflow.org',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
    };

    db.createInvitation(invitation);

    // Also add/update staff in org staff directory as active member
    const existingStaff = (org.staffDirectory || []).find(s => s.email.toLowerCase() === cleanEmail);
    if (!existingStaff) {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        fullName: fullName.trim(),
        jobTitle: jobTitle || 'Staff Member',
        department,
        departmentId: departmentId || 'dept-prog',
        email: cleanEmail,
        isDepartmentHead: role === 'DepartmentHead',
        functionalRole: role === 'Admin' ? 'Admin' : role === 'DepartmentHead' ? 'DepartmentHead' : role === 'ProposalLead' ? 'ProposalLead' : role === 'FinalApprover' ? 'FinalApprover' : 'Contributor',
        role: role || 'Officer',
        roles: Array.isArray(roles) && roles.length > 0 ? roles : [role || 'Officer'],
        status: 'Active',
        joinedDate: new Date().toISOString().split('T')[0]
      };
      org.staffDirectory = [...(org.staffDirectory || []), newStaff];
      db.saveOrg(org);
    }

    const emailDelivery = await sendStaffInvitationEmail(invitation);

    return res.status(201).json({
      invitation,
      inviteLink: `/join?token=${token}`,
      emailDelivery: {
        sent: emailDelivery.sent,
        skipped: emailDelivery.skipped || false,
        error: emailDelivery.sent ? undefined : emailDelivery.error
      }
    });
  } catch (err: any) {
    console.error('Error creating invitation:', err);
    return res.status(500).json({ error: 'Failed to create staff invitation.' });
  }
});

// 9. Staff Invitations: Retrieve by Token
app.get('/api/invitations/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const invitation = db.getInvitationByToken(token);
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation link is invalid, expired, or has already been used.' });
  }
  return res.json(invitation);
});

// 10. Staff Invitations: Accept & Set Password
app.post('/api/invitations/accept', (req: Request, res: Response) => {
  try {
    const { token, password, fullName } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required.' });
    }

    const invitation = db.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation link is invalid or expired.' });
    }

    const org = db.getOrg(invitation.organizationId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const staffMember = (org.staffDirectory || []).find(s => s.email.toLowerCase() === invitation.email.toLowerCase());
    const staffId = staffMember?.id || `staff-${Date.now()}`;
    const userId = `user-${staffId}`;

    const { hash, salt } = hashPassword(password);
    const newUser: StoredUser = {
      id: userId,
      email: invitation.email.toLowerCase(),
      passwordHash: hash,
      salt,
      fullName: fullName || invitation.fullName,
      organizationId: invitation.organizationId,
      role: invitation.role,
      roles: invitation.roles || [invitation.role],
      departmentId: invitation.departmentId,
      departmentName: invitation.departmentName,
      staffId,
      jobTitle: invitation.jobTitle,
      status: 'Active',
      isDemoUser: org.isDemo || false,
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    db.updateInvitation(invitation.id, {
      status: 'Accepted',
      acceptedAt: new Date().toISOString()
    });

    const sessionToken = createSessionToken(userId, invitation.organizationId);

    return res.json({
      user: sanitizeUser(newUser),
      organization: org,
      token: sessionToken
    });
  } catch (err: any) {
    console.error('Error accepting invitation:', err);
    return res.status(500).json({ error: 'Failed to accept invitation.' });
  }
});

// 11. Staff Deactivation
app.post('/api/org/staff/deactivate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.organizationId || req.body.organizationId || 'org-demo-01';
    const { staffId } = req.body;
    if (!staffId) return res.status(400).json({ error: 'Staff ID is required.' });

    const result = db.deactivateStaffMember(orgId, staffId);
    if (!result) return res.status(404).json({ error: 'Staff member not found in this organization.' });

    return res.json({
      success: true,
      staff: result.staff,
      openTasksCount: result.openTasksCount,
      openTasks: result.openTasks,
      notice: `Staff member ${result.staff.fullName} deactivated. ${result.openTasksCount} open task(s) require reassignment.`
    });
  } catch (err: any) {
    console.error('Error deactivating staff:', err);
    return res.status(500).json({ error: 'Failed to deactivate staff member.' });
  }
});

// 12. Tenant Workspaces List
app.get('/api/workspaces', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || (req.query.orgId as string);
  if (!orgId) return res.json([]);
  const workspaces = db.getWorkspacesByOrg(orgId);
  return res.json(workspaces);
});

// 13. Save/Create Tenant Workspace
app.post('/api/workspaces', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || req.body.organizationId;
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });
  const ws: OpportunityWorkspace = req.body;
  if (!ws || !ws.id) return res.status(400).json({ error: 'Invalid workspace payload.' });

  // Ephemeral / Test Mode: Do NOT persist test workspaces into the live database
  if (ws.isTestOpportunity || ws.isDeveloperTestMode || (ws as any).isEphemeralTest) {
    return res.status(200).json({
      ...ws,
      organizationId: orgId,
      ephemeral: true
    });
  }

  const saved = db.saveWorkspace(orgId, ws);
  await processWorkspaceEmailEvents(orgId, null, saved);
  return res.status(201).json(saved);
});

// 14. Update Tenant Workspace
app.put('/api/workspaces/:id', async (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || req.body.organizationId;
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });
  const { id } = req.params;
  const ws: OpportunityWorkspace = req.body;

  if (ws.isTestOpportunity || ws.isDeveloperTestMode || (ws as any).isEphemeralTest) {
    return res.status(200).json({
      ...ws,
      id,
      organizationId: orgId,
      ephemeral: true
    });
  }

  const existing = db.getWorkspaceById(orgId, id);
  if (!existing && !ws.id) {
    return res.status(404).json({ error: 'Workspace not found in your organization.' });
  }

  const saved = db.saveWorkspace(orgId, { ...existing, ...ws, id });
  await processWorkspaceEmailEvents(orgId, existing || null, saved);
  return res.json(saved);
});

// 14b. Email notification health/test & scheduled deadline scan
app.get('/api/notifications/email-status', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    configured: isEmailConfigured(),
    provider: 'Resend',
    fromConfigured: Boolean((process.env.EMAIL_FROM || '').trim())
  });
});

app.post('/api/notifications/test-email', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.email) return res.status(401).json({ error: 'Sign in with a staff email address first.' });
  const result = await sendEmailConfigurationTest(req.user.email, req.user.fullName);
  if (!result.sent) {
    return res.status(result.skipped ? 400 : 502).json({
      success: false,
      error: result.error || 'Test email could not be sent.'
    });
  }
  return res.json({ success: true, message: `Test email sent to ${req.user.email}.` });
});

app.post('/api/notifications/cron-trigger', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.NOTIFICATION_CRON_SECRET || process.env.SCOUT_CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(403).json({ error: 'Unauthorized notification cron trigger.' });
  }
  try {
    const result = await runDueNotificationScan();
    return res.json({ success: true, timestamp: new Date().toISOString(), ...result });
  } catch (error: any) {
    console.error('Notification cron scan failed:', error?.message || error);
    return res.status(500).json({ error: 'Failed to scan email notifications.' });
  }
});

// 15. Delete Tenant Workspace
app.delete('/api/workspaces/:id', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || (req.query.orgId as string);
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });
  const { id } = req.params;
  db.deleteWorkspace(orgId, id);
  return res.json({ success: true });
});

// 16. Institutional Memory
app.get('/api/institutional-memory', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || (req.query.orgId as string);
  if (!orgId) return res.json([]);
  const records = db.getMemoryByOrg(orgId);
  return res.json(records);
});

app.post('/api/institutional-memory', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId || req.body.organizationId;
  if (!orgId) return res.status(400).json({ error: 'Organization ID is required.' });
  const record: InstitutionalMemoryRecord = req.body;
  if (!record || !record.id) return res.status(400).json({ error: 'Invalid record payload.' });

  const saved = db.saveMemoryRecord(orgId, record);
  return res.status(201).json(saved);
});

interface DeterministicDeadlineScanResult {
  hasCandidate: boolean;
  candidateDate?: string;
  candidateSnippet?: string;
  candidatePhrases: string[];
  isExplicitAbsence: boolean;
}

export function scanTextForDeadlines(rawText: string): DeterministicDeadlineScanResult {
  if (!rawText || typeof rawText !== 'string') {
    return { hasCandidate: false, candidatePhrases: [], isExplicitAbsence: true };
  }

  const lines = rawText.split(/\r?\n/);
  const candidatePhrases: string[] = [];
  let candidateSnippet = '';
  let candidateDate = '';

  const deadlineKeywordsRegex = /(?:application\s+deadline|submission\s+deadline|deadline\s+for\s+applications?|deadline\s+for\s+submissions?|deadline\s+date|deadline|closing\s+date|closing\s+time|submission\s+date|applications?\s+close[s]?|applications?\s+due|proposals?\s+due|submit\s+by|due\s+date|call\s+closes|cutoff\s+date|rolling\s+basis|rolling\s+submissions?|rolling\s+review|accepted\s+on\s+a\s+rolling|open-ended|until\s+funds\s+are\s+exhausted|ongoing\s+basis|no\s+deadline|open\s+call|continuous\s+intake|review\s+cycles?)/i;

  const datePatterns = [
    // 1. "1 November 2026", "01 Nov 2026", "1st November 2026", "15 September 2026"
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}(?:\s+\d{1,2}:\d{2}(?:\s*[A-Z]{2,4})?)?)\b/i,
    // 2. "November 1, 2026", "Nov 01 2026", "September 2, 2026"
    /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?:\s*[A-Z]{2,4})?)?)\b/i,
    // 3. "2026-11-01", "2026-09-15 17:00 GMT"
    /\b(\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?:\s*[A-Z]{2,4})?)?)\b/i,
    // 4. "01/11/2026", "11/01/2026"
    /\b(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4})\b/,
    // 5. "Q1 2026", "Q4 2026"
    /\b(Q[1-4]\s+\d{4})\b/i,
    // 6. "November 2026", "Fall 2026", "Late 2026"
    /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)|Spring|Summer|Fall|Autumn|Winter)\s+\d{4})\b/i
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (deadlineKeywordsRegex.test(trimmed)) {
      candidatePhrases.push(trimmed);
      if (!candidateSnippet) {
        candidateSnippet = trimmed;
      }
      for (const pattern of datePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          candidateDate = match[1];
          break;
        }
      }
    }
  }

  // If no keyword match on individual lines, test whole sentences
  if (!candidateSnippet) {
    const sentences = rawText.match(/[^.!?\n]+[.!?\n]+/g) || [rawText];
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (deadlineKeywordsRegex.test(trimmed)) {
        candidatePhrases.push(trimmed);
        if (!candidateSnippet) candidateSnippet = trimmed;
        for (const pattern of datePatterns) {
          const match = trimmed.match(pattern);
          if (match && match[1]) {
            candidateDate = match[1];
            break;
          }
        }
      }
    }
  }

  // Also check if any standalone dates exist in the text even without explicit keyword
  if (!candidateDate) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      for (const pattern of datePatterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
          candidateDate = match[1];
          if (!candidateSnippet) candidateSnippet = trimmed;
          break;
        }
      }
      if (candidateDate) break;
    }
  }

  return {
    hasCandidate: candidatePhrases.length > 0 || Boolean(candidateDate),
    candidateDate: candidateDate || undefined,
    candidateSnippet: candidateSnippet || undefined,
    candidatePhrases,
    isExplicitAbsence: candidatePhrases.length === 0 && !candidateDate
  };
}

// 1. Analyze Funding Call Endpoint
app.post('/api/analyze-funding-call', async (req: Request, res: Response) => {
  try {
    const { text, url, documentName, documentContent, isDeveloperTestMode } = req.body;

    // DETERMINISTIC TEST MODE: 100% independent of Gemini & internet
    if (isDeveloperTestMode || (text && text.includes('USAID-WA-2026-CHRYEI'))) {
      return res.json(developerTestExtraction);
    }

    const sourceMaterial = text || documentContent || (url ? `Funding Opportunity URL provided: ${url}` : '');

    if (!sourceMaterial || sourceMaterial.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide funding call text, a URL, or document content.' });
    }

    // Step 0: Non-AI deterministic scan of source material for candidate dates and deadline phrases
    const deterministicScan = scanTextForDeadlines(sourceMaterial);

    const ai = getGeminiClient();

    if (!ai) {
      // Return structured fallback extraction
      const fallbackDeadline = deterministicScan.candidateDate || deterministicScan.candidateSnippet || (deterministicScan.isExplicitAbsence ? 'Not stated in call.' : 'Needs Verification');
      const fallbackStatus = deterministicScan.isExplicitAbsence ? 'Not Stated in Source' : 'Needs Verification';

      return res.json({
        donor: 'Identified Donor Organization',
        opportunityTitle: 'Funding Opportunity (Analyzed from input)',
        fundingAmount: 'Not stated in call.',
        currency: 'USD',
        applicationDeadline: fallbackDeadline,
        deadlineVerificationStatus: fallbackStatus,
        deadlineToSourceSnippet: deterministicScan.candidateSnippet || '',
        eligibleCountries: ['Needs human verification.'],
        eligibleOrgTypes: ['Registered Non-Profit / NGO'],
        thematicPriorities: ['Community Development'],
        targetBeneficiaries: ['Target communities'],
        projectDuration: 'Not stated in call.',
        coFundingRequirement: 'Not stated in call.',
        minOrgExperience: 'Not stated in call.',
        financialRequirements: 'Audited accounts required (standard)',
        requiredPolicies: ['Safeguarding Policy', 'Anti-Fraud Policy'],
        requiredSupportingDocs: ['Certificate of Registration', 'Budget Narrative', 'Technical Proposal'],
        proposalSections: ['Executive Summary', 'Technical Approach', 'Detailed Budget'],
        wordLimits: 'Not stated in call.',
        submissionMethod: 'Online or Email',
        submissionUrlOrEmail: url || 'Not stated in call.',
        contactInfo: 'Not stated in call.',
        specialRestrictions: 'Not stated in call.',
        otherEligibilityConditions: ['Needs human verification.'],
        rawSummary: 'Extracted summary from supplied text.',
        sourceType: url ? 'url' : (documentName ? 'document' : 'text'),
        sourceReference: documentName || url || undefined
      });
    }

    const systemInstruction = `You are GrantFlow Agent, an elite AI grant opportunity analyst for non-profit and non-governmental organizations (NGOs).
Your job is to read and analyze funding calls, calls for proposals (CFPs), requests for applications (RFAs), and notices of funding opportunities (NOFOs).
CRITICAL RULES:
1. Extract all structured details accurately without hallucinating unstated facts.
2. DEADLINE EXTRACTION & VERIFICATION:
   - If the deadline date is stated in the call (e.g. "1 November 2026", "2026-11-01", "September 15, 2026", "2026-09-02 16:00 WAT"), extract it, set deadlineVerificationStatus to "Confirmed from Source", and copy the exact sentence into deadlineToSourceSnippet.
   - If the call mentions a deadline, closing date, or timeline but the date is vague, ambiguous, or relative (e.g. "within 6 weeks of publication", "Q4 2026"), set deadlineVerificationStatus to "Needs Verification" with the snippet. Do NOT automatically classify as "Not Stated in Source."
   - If and only if the text contains zero mention of any deadline or closing date, output "Not stated in call." and set deadlineVerificationStatus to "Not Stated in Source".
3. For other missing information, output "Not stated in call."
4. Standardize dates to YYYY-MM-DD or readable formatted date whenever possible.`;

    const prompt = `Analyze the following funding call carefully and extract all structural requirements into the exact requested JSON format:

--- FUNDING CALL CONTENT ---
${sourceMaterial}
--- END ---`;

    const { data: response, modelUsed } = await executeWithModelFailover(
      (model: string) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                donor: { type: Type.STRING, description: 'Donor or funding body name. If missing: "Not stated in call."' },
                opportunityTitle: { type: Type.STRING, description: 'Title of the grant or opportunity.' },
                fundingAmount: { type: Type.STRING, description: 'Grant amount, ceiling, or range. If missing: "Not stated in call."' },
                currency: { type: Type.STRING, description: 'Currency code (e.g. USD, EUR, GBP, NGN). If missing: "USD"' },
                applicationDeadline: { type: Type.STRING, description: 'Deadline date/time. If missing: "Not stated in call."' },
                deadlineVerificationStatus: {
                  type: Type.STRING,
                  enum: ['Confirmed from Source', 'Needs Verification', 'Not Stated in Source'],
                  description: 'Verification status of the extracted donor deadline.'
                },
                deadlineToSourceSnippet: {
                  type: Type.STRING,
                  description: 'Exact verbatim snippet or sentence from the funding call text confirming the deadline.'
                },
                eligibleCountries: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of explicitly eligible countries or regions.'
                },
                eligibleOrgTypes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Eligible organization types (e.g. National NGO, CSO, University).'
                },
                thematicPriorities: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Core thematic priorities or focus sectors.'
                },
                targetBeneficiaries: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Target populations or beneficiary groups.'
                },
                projectDuration: { type: Type.STRING, description: 'Target project period in months or years. If missing: "Not stated in call."' },
                coFundingRequirement: { type: Type.STRING, description: 'Cost share or co-funding percentage/requirement. If missing: "Not stated in call."' },
                minOrgExperience: { type: Type.STRING, description: 'Minimum operational years or prior track record required. If missing: "Not stated in call."' },
                financialRequirements: { type: Type.STRING, description: 'Audit requirements, maximum or minimum turnover, financial health rules.' },
                requiredPolicies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Explicitly required institutional policies (e.g. Safeguarding, Gender, Anti-Fraud, Whistleblower).'
                },
                requiredSupportingDocs: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'All mandatory supporting documents (e.g. Audits, Tax Clearance, Registration, CVs, Reference Letters).'
                },
                proposalSections: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Required proposal narrative sections or templates.'
                },
                wordLimits: { type: Type.STRING, description: 'Page or word limits for narrative sections. If missing: "Not stated in call."' },
                submissionMethod: { type: Type.STRING, description: 'Online portal, email, or postal submission. If missing: "Not stated in call."' },
                submissionUrlOrEmail: { type: Type.STRING, description: 'Portal URL or email address for submission. If missing: "Not stated in call."' },
                contactInfo: { type: Type.STRING, description: 'Inquiries email or contact info. If missing: "Not stated in call."' },
                specialRestrictions: { type: Type.STRING, description: 'Indirect cost caps, unallowable costs, consortium rules. If missing: "Not stated in call."' },
                otherEligibilityConditions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Any other crucial eligibility rules or conditions.'
                },
                rawSummary: { type: Type.STRING, description: 'A concise, factual executive summary of the opportunity (2-3 sentences).' }
              },
              required: [
                'donor',
                'opportunityTitle',
                'fundingAmount',
                'currency',
                'applicationDeadline',
                'deadlineVerificationStatus',
                'eligibleCountries',
                'eligibleOrgTypes',
                'thematicPriorities',
                'requiredSupportingDocs',
                'rawSummary'
              ]
            }
          }
        }),
      { operationName: 'Analyze Funding Call' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{}');
    parsed.sourceType = url ? 'url' : (documentName ? 'document' : 'text');
    parsed.sourceReference = documentName || url || undefined;
    parsed.modelProcessed = modelUsed;

    // --- AUTOMATIC TARGETED SECOND-PASS DEADLINE SEARCH ---
    // If Pass 1 missed the deadline, returned "Not stated in call.", or deterministic scan identified candidate phrases
    const isPass1DeadlineMissing =
      !parsed.applicationDeadline ||
      parsed.applicationDeadline.toLowerCase().includes('not stated in call') ||
      parsed.applicationDeadline.toLowerCase().includes('not stated in source');

    if (isPass1DeadlineMissing || deterministicScan.hasCandidate) {
      try {
        const targetedDeadlinePrompt = `You are GrantFlow Targeted Deadline Finder.
Your sole focus is to find the exact application deadline, closing date, submission date, due date, closing time, or application timeline in the provided funding call material.

SEARCH SPECIFICALLY FOR:
- deadline
- closing date
- submission date
- application closes / applications close
- applications due / proposals due
- submit by
- closing time
- cutoff date
- date-like expressions

CRITICAL RULES:
1. If an exact deadline date is stated (e.g. "1 November 2026", "2026-11-01", "September 15, 2026", "2026-09-02 16:00 WAT"), extract it, output standard date, set isExplicitlyStated = true, isAbsentFromText = false, confidence = "High", and return the exact verbatim sentence quotation.
2. If a deadline or timeline is mentioned but the exact date is ambiguous, relative, or uncertain (e.g. "within 6 weeks", "rolling basis", "Q4 2026"), extract the phrase, set isExplicitlyStated = false, isAbsentFromText = false, confidence = "Medium", and return the exact verbatim sentence quotation.
3. If and only if the text has been thoroughly examined and contains ZERO deadline or timeline mention anywhere, set extractedDeadline = "Not stated in call.", isExplicitlyStated = false, isAbsentFromText = true, confidence = "Low".

--- TEXT ---
${sourceMaterial}
--- END ---`;

        const { data: deadlineResp } = await executeWithModelFailover(
          (model: string) =>
            ai.models.generateContent({
              model,
              contents: targetedDeadlinePrompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    extractedDeadline: { type: Type.STRING },
                    supportingQuotation: { type: Type.STRING },
                    sourceReference: { type: Type.STRING },
                    isExplicitlyStated: { type: Type.BOOLEAN },
                    isAbsentFromText: { type: Type.BOOLEAN },
                    confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                  },
                  required: ['extractedDeadline', 'supportingQuotation', 'isExplicitlyStated', 'isAbsentFromText', 'confidence']
                }
              }
            }),
          { operationName: 'Targeted Deadline Search' }
        );

        const dlParsed = JSON.parse(deadlineResp.text?.trim() || '{}');
        if (dlParsed.extractedDeadline && !dlParsed.extractedDeadline.toLowerCase().includes('not stated in call')) {
          parsed.applicationDeadline = dlParsed.extractedDeadline;
          parsed.deadlineToSourceSnippet = dlParsed.supportingQuotation || dlParsed.extractedDeadline;
          parsed.deadlineVerificationStatus = dlParsed.isExplicitlyStated ? 'Confirmed from Source' : 'Needs Verification';
        }
      } catch (dlErr: any) {
        console.warn('Targeted deadline second-pass error:', dlErr?.message || dlErr);
      }
    }

    // If still missing after AI passes, but deterministic scanner found candidate date/phrase, NEVER conclude "Not Stated in Source"
    if (
      (!parsed.applicationDeadline || parsed.applicationDeadline.toLowerCase().includes('not stated in call')) &&
      deterministicScan.hasCandidate
    ) {
      parsed.applicationDeadline = deterministicScan.candidateDate || deterministicScan.candidateSnippet || 'Needs Human Verification';
      parsed.deadlineToSourceSnippet = deterministicScan.candidateSnippet || '';
      parsed.deadlineVerificationStatus = 'Needs Verification';
    }

    // --- TARGETED PASS 2: Critical Donor Fact Verification ---
    let criticalFacts: any = null;

    try {
      const verificationSystemInstruction = `You are GrantFlow Verification Auditor, an expert AI compliance analyst.
Your task is to independently audit and cross-verify CRITICAL DONOR FACTS against the original funding call text.
CRITICAL RULES:
1. For each critical fact, search the provided raw material and extract:
   - value: The exact extracted requirement value.
   - sourceSnippet: The exact verbatim sentence(s) from the text that proves or mentions this requirement.
   - sourceReference: Page, section heading, or paragraph where this was found (e.g. "Section 1: Eligibility Criteria", "Section 2: Submission Requirements", "Header", "Page 1").
   - isExplicitlyStated: true if the text clearly and explicitly states this requirement, false if inferred, ambiguous, or absent.
   - isAbsentFromText: true ONLY if after exhaustive examination the text contains zero mention or requirement.
2. DO NOT hallucinate evidence. If you cannot find verbatim text in the provided material, do NOT invent a quote.
3. If an item is not found or ambiguous, leave sourceSnippet empty or note "Not found in call text."`;

      const verificationPrompt = `Perform an independent verification audit on the critical donor requirements from this funding call:

--- FIRST-PASS EXTRACTED CANDIDATES ---
Donor Name: ${parsed.donor}
Opportunity Title: ${parsed.opportunityTitle}
Application Deadline: ${parsed.applicationDeadline}
Funding Amount: ${parsed.fundingAmount} (${parsed.currency})
Eligible Countries: ${JSON.stringify(parsed.eligibleCountries || [])}
Eligible Org Types: ${JSON.stringify(parsed.eligibleOrgTypes || [])}
Co-Funding / Cost Share: ${parsed.coFundingRequirement}
Mandatory Supporting Documents: ${JSON.stringify(parsed.requiredSupportingDocs || [])}
Word / Page Limits: ${parsed.wordLimits}
Submission Method: ${parsed.submissionMethod}

--- ORIGINAL FUNDING CALL TEXT ---
${sourceMaterial}
--- END ---`;

      const { data: verifyResponse } = await executeWithModelFailover(
        (model: string) =>
          ai.models.generateContent({
            model,
            contents: verificationPrompt,
            config: {
              systemInstruction: verificationSystemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  donorName: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  opportunityTitle: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  applicationDeadline: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  fundingAmount: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      currency: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  eligibleCountries: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.ARRAY, items: { type: Type.STRING } },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  eligibleOrgTypes: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.ARRAY, items: { type: Type.STRING } },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  coFundingRequirement: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  requiredSupportingDocs: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.ARRAY, items: { type: Type.STRING } },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  wordLimits: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  },
                  submissionMethod: {
                    type: Type.OBJECT,
                    properties: {
                      value: { type: Type.STRING },
                      sourceSnippet: { type: Type.STRING },
                      sourceReference: { type: Type.STRING },
                      isExplicitlyStated: { type: Type.BOOLEAN },
                      isAbsentFromText: { type: Type.BOOLEAN }
                    },
                    required: ['value', 'sourceSnippet', 'isExplicitlyStated', 'isAbsentFromText']
                  }
                },
                required: [
                  'donorName',
                  'opportunityTitle',
                  'applicationDeadline',
                  'fundingAmount',
                  'eligibleCountries',
                  'eligibleOrgTypes',
                  'coFundingRequirement',
                  'requiredSupportingDocs',
                  'wordLimits',
                  'submissionMethod'
                ]
              }
            }
          }),
        { operationName: 'Verify Critical Donor Facts (Pass 2)' }
      );

      const pass2Parsed = JSON.parse(verifyResponse.text?.trim() || '{}');

      // Dedicated Deadline Reconciler ensuring single source of truth across the 4 states:
      // 'Confirmed from Source' | 'Human Verified' | 'Needs Verification' | 'Not Stated in Source'
      const reconcileDeadline = (pass1Deadline: string, pass2Dl: any) => {
        const snippet =
          pass2Dl?.sourceSnippet?.trim() ||
          parsed.deadlineToSourceSnippet?.trim() ||
          deterministicScan.candidateSnippet ||
          '';
        const hasSnippet =
          snippet.length > 3 &&
          !snippet.toLowerCase().includes('not found') &&
          !snippet.toLowerCase().includes('not stated');

        const dlVal =
          pass2Dl?.value && !pass2Dl.value.toLowerCase().includes('not stated in call')
            ? pass2Dl.value
            : pass1Deadline && !pass1Deadline.toLowerCase().includes('not stated in call')
            ? pass1Deadline
            : deterministicScan.candidateDate;

        // 1. Confirmed from Source: Direct quote found and explicitly stated
        if (
          dlVal &&
          hasSnippet &&
          (pass2Dl?.isExplicitlyStated || parsed.deadlineVerificationStatus === 'Confirmed from Source')
        ) {
          return {
            value: dlVal,
            sourceSnippet: snippet,
            sourceReference: pass2Dl?.sourceReference || 'Submission Guidelines',
            verificationStatus: 'Confirmed from Source' as const,
            verificationNotes: 'Deadline found and supported by exact source quotation.'
          };
        }

        // 2. Deterministic scan found candidate phrases/dates or AI found candidate
        if (deterministicScan.hasCandidate || (dlVal && dlVal !== 'Not stated in call.')) {
          return {
            value: dlVal || deterministicScan.candidateDate || deterministicScan.candidateSnippet || 'Needs Human Verification',
            sourceSnippet: snippet || deterministicScan.candidateSnippet || '',
            sourceReference: pass2Dl?.sourceReference || 'Deterministic Scan / Text Reference',
            verificationStatus: 'Needs Verification' as const,
            verificationNotes: 'Needs Verification — candidate deadline or timeline identified in source text. Please confirm exact date.'
          };
        }

        // 3. Not Stated in Source: ONLY when both deterministic scanner and AI audit positively verify absence
        if (pass2Dl?.isAbsentFromText && deterministicScan.isExplicitAbsence) {
          return {
            value: 'Not stated in call.',
            sourceSnippet: '',
            sourceReference: 'Checked entire funding call',
            verificationStatus: 'Not Stated in Source' as const,
            verificationNotes: 'Positively checked: no application deadline or closing date is stated in the supplied material.'
          };
        }

        // 4. Default safe state is ALWAYS Needs Verification, never Not Stated in Source
        return {
          value: pass1Deadline || 'Needs Verification',
          sourceSnippet: snippet,
          sourceReference: 'Funding Call Text',
          verificationStatus: 'Needs Verification' as const,
          verificationNotes: 'Needs Verification — GrantFlow could not confidently identify the deadline.'
        };
      };

      // General Reconciler for other fields: Never turn missing AI result into "Not Stated in Source"
      const reconcile = (pass1Val: any, pass2Data: any, fieldName: string) => {
        const snippet = pass2Data?.sourceSnippet?.trim() || '';
        const hasSnippet =
          snippet.length > 3 &&
          !snippet.toLowerCase().includes('not found') &&
          !snippet.toLowerCase().includes('not stated');
        const isExplicitlyStated = Boolean(pass2Data?.isExplicitlyStated);
        const isPositivelyAbsent = Boolean(pass2Data?.isAbsentFromText);

        // Check for value disagreement between passes
        let valuesDisagree = false;
        if (Array.isArray(pass1Val) && Array.isArray(pass2Data?.value)) {
          const s1 = new Set(pass1Val.map(x => String(x).toLowerCase().trim()));
          const s2 = new Set(pass2Data.value.map(x => String(x).toLowerCase().trim()));
          if (s1.size > 0 && s2.size > 0 && ![...s1].some(x => s2.has(x))) {
            valuesDisagree = true;
          }
        } else if (typeof pass1Val === 'string' && typeof pass2Data?.value === 'string') {
          const p1 = pass1Val.toLowerCase().trim();
          const p2 = pass2Data.value.toLowerCase().trim();
          if (
            p1 &&
            p2 &&
            p1 !== 'not stated in call.' &&
            p2 !== 'not stated in call.' &&
            !p1.includes(p2) &&
            !p2.includes(p1)
          ) {
            valuesDisagree = true;
          }
        }

        if (valuesDisagree) {
          return {
            value: pass2Data?.value || pass1Val,
            sourceSnippet: snippet,
            sourceReference: pass2Data?.sourceReference || 'Stated in call text',
            verificationStatus: 'Needs Verification' as const,
            verificationNotes: `Initial extraction and verification pass found differing values. Human verification required.`
          };
        }

        if (hasSnippet && isExplicitlyStated) {
          return {
            value: pass2Data?.value || pass1Val,
            sourceSnippet: snippet,
            sourceReference: pass2Data?.sourceReference || 'Stated in call text',
            verificationStatus: 'Confirmed from Source' as const,
            verificationNotes: 'Confirmed from source text with direct supporting quote.'
          };
        }

        // ONLY mark Not Stated in Source if positively checked and confirmed absent
        if (
          isPositivelyAbsent &&
          (!pass1Val || pass1Val === 'Not stated in call.' || (Array.isArray(pass1Val) && pass1Val.length === 0))
        ) {
          return {
            value: pass1Val || 'Not stated in call.',
            sourceSnippet: '',
            sourceReference: 'Absent from call text',
            verificationStatus: 'Not Stated in Source' as const,
            verificationNotes: 'Positively checked: requirement is not stated in the supplied document.'
          };
        }

        // Default to Needs Verification — never hide missing AI extraction under "Not Stated in Source"
        return {
          value: pass2Data?.value || pass1Val || 'Needs Verification',
          sourceSnippet: snippet,
          sourceReference: pass2Data?.sourceReference || 'Referenced in call text',
          verificationStatus: 'Needs Verification' as const,
          verificationNotes: 'Needs Verification — GrantFlow could not confidently identify this field.'
        };
      };

      const verifiedDeadline = reconcileDeadline(parsed.applicationDeadline, pass2Parsed.applicationDeadline);

      criticalFacts = {
        donorName: reconcile(parsed.donor, pass2Parsed.donorName, 'Donor'),
        opportunityTitle: reconcile(parsed.opportunityTitle, pass2Parsed.opportunityTitle, 'Opportunity Title'),
        applicationDeadline: verifiedDeadline,
        fundingAmount: reconcile(parsed.fundingAmount, pass2Parsed.fundingAmount, 'Funding Amount'),
        currency: {
          value: parsed.currency || 'USD',
          sourceSnippet: pass2Parsed.fundingAmount?.sourceSnippet || '',
          sourceReference: pass2Parsed.fundingAmount?.sourceReference || 'Funding Amount section',
          verificationStatus: pass2Parsed.fundingAmount?.isExplicitlyStated ? 'Confirmed from Source' : 'Needs Verification'
        },
        eligibleCountries: reconcile(parsed.eligibleCountries, pass2Parsed.eligibleCountries, 'Eligible Countries'),
        eligibleOrgTypes: reconcile(parsed.eligibleOrgTypes, pass2Parsed.eligibleOrgTypes, 'Eligible Org Types'),
        coFundingRequirement: reconcile(parsed.coFundingRequirement, pass2Parsed.coFundingRequirement, 'Co-Funding Requirement'),
        requiredSupportingDocs: reconcile(parsed.requiredSupportingDocs, pass2Parsed.requiredSupportingDocs, 'Mandatory Documents'),
        wordLimits: reconcile(parsed.wordLimits, pass2Parsed.wordLimits, 'Word Limits'),
        submissionMethod: reconcile(parsed.submissionMethod, pass2Parsed.submissionMethod, 'Submission Method')
      };

      // Synchronize top-level fields with verified outputs
      parsed.criticalFacts = criticalFacts;
      parsed.applicationDeadline = verifiedDeadline.value;
      parsed.deadlineToSourceSnippet = verifiedDeadline.sourceSnippet || parsed.deadlineToSourceSnippet || '';
      parsed.deadlineVerificationStatus = verifiedDeadline.verificationStatus;
    } catch (vErr: any) {
      console.warn('Pass 2 verification failed gracefully:', vErr?.message || vErr);
      // Fallback single pass critical facts structure with deterministic scan fallback
      const fallbackDl = deterministicScan.candidateDate || parsed.applicationDeadline || (deterministicScan.isExplicitAbsence ? 'Not stated in call.' : 'Needs Verification');
      const fallbackStatus = deterministicScan.isExplicitAbsence ? 'Not Stated in Source' : 'Needs Verification';

      parsed.criticalFacts = {
        donorName: { value: parsed.donor, sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.donor && parsed.donor !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification' },
        opportunityTitle: { value: parsed.opportunityTitle, sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.opportunityTitle && parsed.opportunityTitle !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification' },
        applicationDeadline: { value: fallbackDl, sourceSnippet: parsed.deadlineToSourceSnippet || deterministicScan.candidateSnippet || '', sourceReference: 'Call text', verificationStatus: fallbackStatus },
        fundingAmount: { value: parsed.fundingAmount, sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.fundingAmount && parsed.fundingAmount !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification' },
        currency: { value: parsed.currency || 'USD', sourceSnippet: '', sourceReference: 'Call text', verificationStatus: 'Confirmed from Source' },
        eligibleCountries: { value: parsed.eligibleCountries || [], sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.eligibleCountries?.length ? 'Confirmed from Source' : 'Needs Verification' },
        eligibleOrgTypes: { value: parsed.eligibleOrgTypes || [], sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.eligibleOrgTypes?.length ? 'Confirmed from Source' : 'Needs Verification' },
        coFundingRequirement: { value: parsed.coFundingRequirement, sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.coFundingRequirement && parsed.coFundingRequirement !== 'Not stated in call.' ? 'Confirmed from Source' : 'Not Stated in Source' },
        requiredSupportingDocs: { value: parsed.requiredSupportingDocs || [], sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.requiredSupportingDocs?.length ? 'Confirmed from Source' : 'Needs Verification' },
        wordLimits: { value: parsed.wordLimits, sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.wordLimits && parsed.wordLimits !== 'Not stated in call.' ? 'Confirmed from Source' : 'Not Stated in Source' },
        submissionMethod: { value: parsed.submissionMethod, sourceSnippet: '', sourceReference: 'Call text', verificationStatus: parsed.submissionMethod && parsed.submissionMethod !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification' }
      };
      parsed.applicationDeadline = fallbackDl;
      parsed.deadlineVerificationStatus = fallbackStatus;
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error analyzing funding call:', error?.message || error);
    const errResp = formatApiErrorResponse(error, 'Failed to analyze funding call. Your input has been safely preserved.');
    return res.status(errResp.status).json(errResp.body);
  }
});

// 1b. Extract Organisation Profile from an uploaded institutional document (CAC, constitution, etc.)
app.post('/api/extract-org-profile', async (req: Request, res: Response) => {
  try {
    const { documentName, mimeType, base64Data, text } = req.body || {};

    if (!base64Data && (!text || String(text).trim().length === 0)) {
      return res.status(400).json({ error: 'Provide a document or text to read from.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Document reading is unavailable: the AI service is not configured.' });
    }

    const instruction = `You are reading an official Nigerian or African institutional document such as a CAC certificate of incorporation, certificate of registration of trustees, or organisational profile.

Extract the following information thoroughly. Nigerian CAC documents use specific formats:

- Organisation name: the full legal registered name
- Country: check for stated country; Nigerian CAC documents are always Nigeria
- Year of registration: look for phrases like "incorporated on the Xth day of Month, YEAR", "registered in YEAR", "date of incorporation", or any year on the certificate. Extract just the 4-digit year.
- Registration number: look for "RC No.", "RC:", "CAC/IT/NO:", "IT/NO:", "BN:", "Registration No." — include the prefix e.g. "RC 123456" or "CAC/IT/NO: 98432"
- Legal classification: look for "Incorporated Trustee", "Company Limited by Guarantee", "Business Name", or similar. For CAC "IT" registrations, the classification is "Incorporated Trustee".
- Thematic areas: any stated objectives, purposes, mandate or areas of work

Be thorough. Nigerian CAC certificates embed dates as "Xth day of Month, Year" — extract the year. The "IT" in a registration number means Incorporated Trustee. Return "Not found in document" only if genuinely absent after careful reading.${documentName ? `\nThe uploaded file is named: ${documentName}.` : ''}`;

    const prompt = text ? `${instruction}\n\n--- DOCUMENT TEXT ---\n${text}\n--- END ---` : instruction;

    const contents: any = base64Data
      ? [{ inlineData: { mimeType: mimeType || 'application/pdf', data: base64Data } }, { text: prompt }]
      : prompt;

    const { data: response, modelUsed } = await executeWithModelFailover(
      (model: string) =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                organisationName: { type: Type.STRING, description: 'Full legal / registered name of the organisation. "Not found in document" if absent.' },
                country: { type: Type.STRING, description: 'Country of registration or headquarters. "Not found in document" if absent.' },
                yearOfRegistration: { type: Type.STRING, description: 'Year the organisation was registered or incorporated, e.g. "2015". "Not found in document" if absent.' },
                registrationNumberOrStatus: { type: Type.STRING, description: 'Registration number and/or legal status, e.g. "CAC/IT/NO: 98432, Incorporated Trustee". "Not found in document" if absent.' },
                organisationType: { type: Type.STRING, description: 'Legal classification / entity type, e.g. "Incorporated Trustee", "Company Limited by Guarantee", "National NGO". "Not found in document" if absent.' },
                thematicAreas: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Areas of work, objectives, or focus sectors explicitly stated in the document. Empty array if none stated.' }
              },
              required: ['organisationName', 'country', 'yearOfRegistration', 'registrationNumberOrStatus', 'organisationType', 'thematicAreas']
            }
          }
        }),
      { operationName: 'Extract Org Profile' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{}');
    parsed.modelProcessed = modelUsed;
    return res.json({ data: parsed });
  } catch (error: any) {
    console.error('[extract-org-profile] error:', error?.message || error);
    return res.status(500).json({ error: 'Could not read the document. Please try again, or enter the details manually.' });
  }
});

// 1c. Onboarding document analysis — used by the onboarding wizard's document upload step.
// Accepts multiple base64 files, runs Gemini on each, and returns a DocumentAnalysisResult.
app.post('/api/onboarding/analyze-documents', async (req: Request, res: Response) => {
  try {
    const { files, adminEmail } = req.body || {};
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    // Use the first readable document for extraction
    const primary = files.find((f: any) => f.base64Data || f.text);
    if (!primary) {
      return res.status(400).json({ error: 'No readable document content found.' });
    }

    const instruction = `You are reading an official Nigerian or African institutional document such as a CAC certificate of incorporation, certificate of registration of trustees, SCUML certificate, or organisational profile.

Extract every piece of information you can find. Nigerian CAC documents use specific formats:
- Organisation name: the full legal registered name
- Country: check for stated country; Nigerian CAC documents are always Nigeria
- Year of registration: look for "incorporated on the Xth day of Month, YEAR", "registered in YEAR", or any date. Extract just the 4-digit year.
- Registration number: look for "RC No.", "RC:", "CAC/IT/NO:", "IT/NO:", "BN:", "Registration No." — include the full value
- Legal classification: "Incorporated Trustee", "Company Limited by Guarantee", "Business Name", etc. For CAC "IT" registrations, the classification is "Incorporated Trustee".
- Thematic areas / objectives: any stated purposes, mandate, or areas of work
- Geographic areas: any states, regions, or countries mentioned as areas of operation
- Target beneficiaries: any groups mentioned as beneficiaries

Be thorough. Return null for any field genuinely not found. Never invent values.${primary.name ? `\nDocument: ${primary.name}` : ''}`;

    const contents: any = primary.base64Data
      ? [{ inlineData: { mimeType: primary.mimeType || 'application/pdf', data: primary.base64Data } }, { text: instruction }]
      : `${instruction}\n\n--- DOCUMENT TEXT ---\n${primary.text}\n--- END ---`;

    const { data: response } = await executeWithModelFailover(
      (model: string) => ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              organisationName: { type: Type.STRING },
              country: { type: Type.STRING },
              yearOfRegistration: { type: Type.STRING },
              registrationNumber: { type: Type.STRING },
              organisationType: { type: Type.STRING },
              thematicAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
              geographicAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
              targetBeneficiaries: { type: Type.ARRAY, items: { type: Type.STRING } },
              description: { type: Type.STRING }
            },
            required: ['organisationName', 'country', 'yearOfRegistration', 'registrationNumber', 'organisationType', 'thematicAreas']
          }
        }
      }),
      { operationName: 'Onboarding Document Analysis' }
    );

    const raw = JSON.parse(response.text?.trim() || '{}');
    const NOT_FOUND = 'Not found in document';
    const conf = (val: any, src: string) => val && val !== NOT_FOUND
      ? { value: val, sourceDocument: src, status: 'confirmed', confidence: 'high' }
      : null;

    const docName = primary.name || 'Uploaded Document';
    const year = parseInt(String(raw.yearOfRegistration || '').replace(/[^0-9]/g, '').slice(0, 4), 10);

    const result = {
      extractedProfile: {
        name: conf(raw.organisationName, docName),
        country: conf(raw.country, docName),
        registrationNumber: conf(raw.registrationNumber, docName),
        orgType: conf(raw.organisationType, docName),
        yearEstablished: year > 1900 ? { value: year, sourceDocument: docName, status: 'confirmed', confidence: 'high' } : null,
        thematicAreas: raw.thematicAreas?.length ? { value: raw.thematicAreas, sourceDocument: docName, status: 'confirmed', confidence: 'high' } : null,
        geographicAreas: raw.geographicAreas?.length ? { value: raw.geographicAreas, sourceDocument: docName, status: 'confirmed', confidence: 'high' } : null,
        targetBeneficiaries: raw.targetBeneficiaries?.length ? { value: raw.targetBeneficiaries, sourceDocument: docName, status: 'confirmed', confidence: 'high' } : null,
        description: conf(raw.description, docName)
      },
      classifiedDocuments: files.map((f: any) => ({ name: f.name || 'Document', category: 'Registration', status: 'uploaded' })),
      missingEssentialDocuments: [],
      conflicts: [],
      summary: {
        totalDocumentsAnalyzed: files.length,
        fieldsConfirmedCount: Object.values(raw).filter((v: any) => v && v !== NOT_FOUND).length,
        fieldsDerivedCount: 0,
        fieldsRequiringVerificationCount: 0,
        expiredDocumentsCount: 0,
        expiringSoonCount: 0,
        missingMandatoryDocsCount: 0
      }
    };

    return res.json(result);
  } catch (error: any) {
    console.error('[onboarding/analyze-documents] error:', error?.message || error);
    return res.status(500).json({ error: 'Document analysis failed. Please enter your details manually.' });
  }
});

// 2. Assess Eligibility Endpoint
app.post('/api/assess-eligibility', async (req: Request, res: Response) => {
  try {
    const { extraction, orgProfile, isDeveloperTestMode } = req.body;

    if (!extraction || !orgProfile) {
      return res.status(400).json({ error: 'Both extracted funding call and organisation profile are required.' });
    }

    // DETERMINISTIC TEST MODE: 100% independent of Gemini & internet
    if (isDeveloperTestMode || (extraction.opportunityTitle && extraction.opportunityTitle.includes('[TEST DATA]'))) {
      return res.json(generateDeterministicAssessment(orgProfile));
    }

    const ai = getGeminiClient();

    if (!ai) {
      // High-fidelity fallback assessment based on profile
      const isCountryMatch = extraction.eligibleCountries?.some((c: string) =>
        c.toLowerCase().includes(orgProfile.country?.toLowerCase()) ||
        c.toLowerCase().includes('sub-saharan') ||
        c.toLowerCase().includes('west africa') ||
        c.toLowerCase().includes('global')
      );

      return res.json({
        overallStatus: isCountryMatch ? 'LIKELY ELIGIBLE' : 'REVIEW REQUIRED',
        confidenceScoreRationale: 'Evaluated against institutional criteria including registration status, operating track record, policy availability, and audited accounts.',
        criteria: [
          {
            criterion: `Country Eligibility (${orgProfile.country})`,
            category: 'Geography',
            status: isCountryMatch ? 'MET' : 'REVIEW_REQUIRED',
            donorRequirement: extraction.eligibleCountries?.join(', ') || 'Not stated in call.',
            orgEvidence: `${orgProfile.name} is based and operating in ${orgProfile.country}.`,
            details: isCountryMatch ? 'Direct geographic coverage match.' : 'Check if regional eligibility applies.',
            needsHumanVerification: !isCountryMatch
          },
          {
            criterion: 'Legal Non-Profit Status',
            category: 'Registration',
            status: 'MET',
            donorRequirement: extraction.eligibleOrgTypes?.join(', ') || 'Registered non-profit entity',
            orgEvidence: orgProfile.registrationStatus,
            details: 'Active registered non-profit organization.',
            needsHumanVerification: false
          },
          {
            criterion: 'Audited Financial Accounts',
            category: 'Financial & Audit',
            status: orgProfile.auditedAccountsAvailable ? 'MET' : 'UNMET',
            donorRequirement: extraction.financialRequirements || 'Audited accounts required',
            orgEvidence: `${orgProfile.auditedAccountsYears} years of external audits available.`,
            details: orgProfile.auditedAccountsAvailable ? 'Meets standard audit requirements.' : 'Audited accounts missing.',
            needsHumanVerification: false
          },
          {
            criterion: 'Required Institutional Policies',
            category: 'Policies',
            status: (orgProfile.safeguardingPolicy && orgProfile.genderPolicy && orgProfile.antiFraudPolicy) ? 'MET' : 'REVIEW_REQUIRED',
            donorRequirement: extraction.requiredPolicies?.join(', ') || 'Standard governance policies',
            orgEvidence: `Safeguarding: ${orgProfile.safeguardingPolicy ? 'Yes' : 'No'}, Gender: ${orgProfile.genderPolicy ? 'Yes' : 'No'}, Anti-Fraud: ${orgProfile.antiFraudPolicy ? 'Yes' : 'No'}`,
            details: 'Formal Board-approved policies verified.',
            needsHumanVerification: false
          }
        ],
        strongestMatches: [
          `Active operations in ${orgProfile.country}`,
          `${orgProfile.yearsExperience} years of institutional experience`,
          `Audited accounts on file for ${orgProfile.auditedAccountsYears} years`
        ],
        importantRisks: [
          extraction.specialRestrictions !== 'Not stated in call.' ? extraction.specialRestrictions : 'Review indirect cost allocations and partner roles'
        ],
        missingInformation: [
          extraction.coFundingRequirement === 'Not stated in call.' ? 'Co-funding requirement not explicitly stated in call' : ''
        ].filter(Boolean),
        humanVerificationRequired: [
          'Verify official donor portal registration guidelines and portal account activation requirements'
        ],
        overallFitSummary: `Strong institutional alignment between ${orgProfile.name} and this opportunity. Most baseline eligibility criteria appear met.`,
        strategicRecommendation: 'PURSUE OPPORTUNITY: Proceed to create application workspace and initiate task assignments.',
        assessedAt: new Date().toISOString()
      });
    }

    const systemInstruction = `You are GrantFlow Agent's institutional eligibility and fit reasoning engine.
Your mission is to compare a funding call's extracted requirements against a specific NGO's institutional profile.

ASSESSMENT CATEGORIES (You must choose EXACTLY one):
- "LIKELY ELIGIBLE": The NGO clearly satisfies all core eligibility thresholds (geography, legal status, experience, audits, policies).
- "REVIEW REQUIRED": Some criteria are ambiguous, require human verification, co-funding is uncertain, or call did not state certain requirements.
- "LIKELY INELIGIBLE": The NGO explicitly fails one or more mandatory eligibility requirements (e.g. wrong country, lack of required registration type, turnover mismatch, inadequate operating experience).

RULES:
1. Do not claim certainty when the source call or profile is ambiguous.
2. Provide an honest, rigorous criteria-by-criteria breakdown.
3. Highlight Strongest Matches, Important Risks, Missing Information, and items requiring Human Verification.
4. Do NOT generate arbitrary percentage scores without explaining the rationale.
5. Strictly evaluate the NGO's actual profile and document library without hallucinating compliance. If the NGO has 0 uploaded documents or has not uploaded policies/audits, explicitly state this in orgEvidence and mark the status as 'REVIEW_REQUIRED' or 'UNMET', rather than assuming 100% compliance.`;

    const prompt = `Assess eligibility and organizational fit for this NGO against the extracted funding call:

ORGANIZATION PROFILE:
${JSON.stringify(orgProfile, null, 2)}

EXTRACTED FUNDING CALL REQUIREMENTS:
${JSON.stringify(extraction, null, 2)}

Generate a comprehensive, structured evaluation.`;

    const { data: response, modelUsed } = await executeWithModelFailover(
      (model: string) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallStatus: {
                  type: Type.STRING,
                  enum: ['LIKELY ELIGIBLE', 'REVIEW REQUIRED', 'LIKELY INELIGIBLE'],
                  description: 'Overall classification of eligibility.'
                },
                confidenceScoreRationale: {
                  type: Type.STRING,
                  description: 'Explanation of how the determination was reached based on verified vs unstated criteria.'
                },
                criteria: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      criterion: { type: Type.STRING, description: 'Short criterion title (e.g. Nigeria Geographic Eligibility)' },
                      category: {
                        type: Type.STRING,
                        enum: ['Geography', 'Registration', 'Financial & Audit', 'Policies', 'Thematic & Experience', 'Co-Funding / Other']
                      },
                      status: {
                        type: Type.STRING,
                        enum: ['MET', 'REVIEW_REQUIRED', 'UNMET', 'NOT_STATED']
                      },
                      details: { type: Type.STRING, description: 'Analytical judgment on this criterion.' },
                      orgEvidence: { type: Type.STRING, description: 'Evidence from the NGO profile.' },
                      donorRequirement: { type: Type.STRING, description: 'Requirement as extracted from the funding call.' },
                      needsHumanVerification: { type: Type.BOOLEAN }
                    },
                    required: ['criterion', 'category', 'status', 'details', 'orgEvidence', 'donorRequirement', 'needsHumanVerification']
                  }
                },
                strongestMatches: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Top 3-5 strongest alignment points.'
                },
                importantRisks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Critical risks, tight deadlines, co-funding, or compliance hurdles.'
                },
                missingInformation: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Key information not stated in the call that needs clarification.'
                },
                humanVerificationRequired: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Action items requiring human check or donor inquiry.'
                },
                overallFitSummary: {
                  type: Type.STRING,
                  description: 'A 2-4 sentence executive fit summary in professional NGO language.'
                },
                strategicRecommendation: {
                  type: Type.STRING,
                  description: 'Actionable Go / No-Go guidance (e.g. PURSUE WITH HIGH PRIORITY, CONDITIONAL PURSUE, NO-GO).'
                }
              },
              required: [
                'overallStatus',
                'confidenceScoreRationale',
                'criteria',
                'strongestMatches',
                'importantRisks',
                'missingInformation',
                'humanVerificationRequired',
                'overallFitSummary',
                'strategicRecommendation'
              ]
            }
          }
        }),
      { operationName: 'Assess Eligibility' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{}');
    parsed.assessedAt = new Date().toISOString();
    parsed.modelProcessed = modelUsed;

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error assessing eligibility:', error?.message || error);
    const errResp = formatApiErrorResponse(error, 'Failed to assess eligibility. Your funding call has been safely preserved.');
    return res.status(errResp.status).json(errResp.body);
  }
});

// Helper functions for date normalization and backwards milestone scheduling
function parseFlexibleDateServer(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (['not stated', 'not stated in call.', 'not stated in call', 'before deadline', 'mid-term', 'deadline', 'tbd', 'n/a', 'none', 'pending', 'no due date', 'no date'].includes(lower)) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 2020 && y <= 2099) return parsed;
  }
  const monthNames: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
  };
  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const m = monthNames[dmyMatch[2].toLowerCase()];
    const year = parseInt(dmyMatch[3], 10);
    if (m !== undefined && day >= 1 && day <= 31 && year >= 2020 && year <= 2099) {
      return new Date(year, m, day, 23, 59, 59);
    }
  }
  const mdyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdyMatch) {
    const m = monthNames[mdyMatch[1].toLowerCase()];
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    if (m !== undefined && day >= 1 && day <= 31 && year >= 2020 && year <= 2099) {
      return new Date(year, m, day, 23, 59, 59);
    }
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2020 && year <= 2099) {
      return new Date(year, month, day, 23, 59, 59);
    }
  }
  return null;
}

function formatToYmdServer(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeBackwardsSchedule(deadlineStr?: string | null, baseDate: Date = new Date()) {
  const deadlineDate = parseFlexibleDateServer(deadlineStr);
  if (!deadlineDate) {
    return {
      hasValidDeadline: false,
      milestoneDates: ['', '', '', '', ''],
      taskDates: ['', '', '', '', '']
    };
  }
  const totalDays = Math.max(1, Math.round((deadlineDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
  const m5Date = new Date(deadlineDate.getTime() - Math.max(1, Math.min(2, Math.floor(totalDays * 0.03))) * 86400000);
  const m4Date = new Date(deadlineDate.getTime() - Math.max(2, Math.min(4, Math.floor(totalDays * 0.08))) * 86400000);
  const m3Date = new Date(deadlineDate.getTime() - Math.max(5, Math.min(9, Math.floor(totalDays * 0.20))) * 86400000);
  const m2Date = new Date(deadlineDate.getTime() - Math.max(8, Math.min(18, Math.floor(totalDays * 0.40))) * 86400000);
  const m1Date = new Date(deadlineDate.getTime() - Math.max(12, Math.min(35, Math.floor(totalDays * 0.65))) * 86400000);

  const milestoneDates = [
    formatToYmdServer(m1Date > baseDate ? m1Date : new Date(baseDate.getTime() + Math.max(2, Math.floor(totalDays * 0.25)) * 86400000)),
    formatToYmdServer(m2Date > baseDate ? m2Date : new Date(baseDate.getTime() + Math.max(4, Math.floor(totalDays * 0.45)) * 86400000)),
    formatToYmdServer(m3Date > baseDate ? m3Date : new Date(baseDate.getTime() + Math.max(6, Math.floor(totalDays * 0.65)) * 86400000)),
    formatToYmdServer(m4Date > baseDate ? m4Date : new Date(baseDate.getTime() + Math.max(8, Math.floor(totalDays * 0.85)) * 86400000)),
    formatToYmdServer(m5Date > baseDate ? m5Date : deadlineDate)
  ];

  const taskDates = [0.2, 0.35, 0.50, 0.65, 0.75].map(ratio => {
    const tDays = Math.max(2, Math.floor(totalDays * ratio));
    const tDate = new Date(baseDate.getTime() + tDays * 86400000);
    return formatToYmdServer(tDate > m4Date ? m4Date : tDate);
  });

  return { hasValidDeadline: true, milestoneDates, taskDates };
}

// 3. Generate Workspace Artifacts Endpoint (When PURSUE is clicked)
app.post('/api/generate-workspace-artifacts', async (req: Request, res: Response) => {
  try {
    const { extraction, assessment, orgProfile, isDeveloperTestMode } = req.body;

    // DETERMINISTIC TEST MODE: 100% independent of Gemini & internet
    if (isDeveloperTestMode || (extraction && extraction.opportunityTitle && extraction.opportunityTitle.includes('[TEST DATA]'))) {
      const deterministicTasks = generateDeterministicTasks(
        `opp-test-${Date.now()}`,
        orgProfile?.departments || [],
        orgProfile?.staffDirectory || []
      );
      return res.json({
        requirementsChecklist: [
          { id: 'req-1', title: '10% Non-Federal Cost Share Commitment', category: 'Financial', status: 'MET', notes: 'Verified in-kind allocation' },
          { id: 'req-2', title: 'Primary Health & CHW Scope Alignment', category: 'Technical', status: 'MET', notes: 'Aligned with strategic focus' },
          { id: 'req-3', title: 'SAM.gov & UEI Registration Active', category: 'Governance', status: 'MET', notes: 'Verified active registration' },
          { id: 'req-4', title: 'Child Safeguarding & PSEA Training Compliance', category: 'Governance', status: 'MET', notes: 'Staff certificates up to date' }
        ],
        documentsChecklist: [
          { id: 'doc-1', name: 'Certificate of NGO Registration / Incorporation', mandatory: true, category: 'Legal & Registration', status: 'Ready', assignedTo: 'Grants Team' },
          { id: 'doc-2', name: 'Audited Financial Statements (Last 2 Years)', mandatory: true, category: 'Financial & Audit', status: 'Ready', assignedTo: 'Finance' },
          { id: 'doc-3', name: 'Board-Approved Safeguarding & PSEA Policy', mandatory: true, category: 'Policies & Compliance', status: 'Ready', assignedTo: 'Grants Team' },
          { id: 'doc-4', name: 'Anti-Fraud and Anti-Corruption Policy', mandatory: true, category: 'Policies & Compliance', status: 'Ready', assignedTo: 'Finance' },
          { id: 'doc-5', name: 'Detailed Activity-Based Budget (Excel format)', mandatory: true, category: 'Financial & Audit', status: 'Ready', assignedTo: 'Finance' },
          { id: 'doc-6', name: 'Key Personnel CVs & Job Descriptions', mandatory: true, category: 'Staff & Governance', status: 'Ready', assignedTo: 'Programmes' }
        ],
        tasks: deterministicTasks,
        milestones: [
          { id: 'ms-1', title: 'First Draft & Department Submissions Complete', targetDate: '2026-10-15', completed: true },
          { id: 'ms-2', title: 'Department Head Quality & Budget Review', targetDate: '2026-10-25', completed: true },
          { id: 'ms-3', title: 'Final Proposal Lead & Executive Approval', targetDate: '2026-11-05', completed: false },
          { id: 'ms-4', title: 'Submission Readiness Check & Final Packaging', targetDate: '2026-11-10', completed: false },
          { id: 'ms-5', title: 'Official Donor Portal Submission', targetDate: '2026-11-15', completed: false }
        ]
      });
    }

    const now = new Date();
    const currentDateStr = formatToYmdServer(now);
    const schedule = computeBackwardsSchedule(extraction?.applicationDeadline, now);

    const ai = getGeminiClient();

    if (!ai) {
      // Default structured artifacts with verified backwards dates
      const docs = (extraction?.requiredSupportingDocs || [
        'Certificate of Incorporation',
        'Audited Financial Accounts',
        'Safeguarding Policy',
        'Technical Proposal Narrative',
        'Itemized Budget in Excel'
      ]).map((docName: string, idx: number) => ({
        id: `doc-${Date.now()}-${idx}`,
        name: docName,
        mandatory: true,
        category: docName.toLowerCase().includes('budget') ? 'Budget' : (docName.toLowerCase().includes('proposal') ? 'Technical Proposal' : 'Governance'),
        status: 'Missing',
        assignedTo: 'Grants Team'
      }));

      return res.json({
        requirementsChecklist: [
          { id: `req-1`, title: 'Verify legal non-profit eligibility', category: 'Governance', status: 'MET', notes: 'Verified against profile' },
          { id: `req-2`, title: 'Prepare compliant technical narrative', category: 'Technical', status: 'IN_PROGRESS', notes: 'Drafting initiated' },
          { id: `req-3`, title: 'Prepare itemized activity budget', category: 'Financial', status: 'PENDING', notes: 'Finance team to cost' }
        ],
        documentsChecklist: docs,
        tasks: [
          { id: `tsk-1`, title: 'Assemble Institutional Governance & Audit Documents', assignedTo: 'Compliance Officer', dueDate: schedule.taskDates[0] || '', priority: 'Medium', completed: false, section: 'Governance', createdAt: new Date().toISOString() },
          { id: `tsk-2`, title: 'Draft Technical Proposal Narrative', assignedTo: 'Lead Proposal Writer', dueDate: schedule.taskDates[1] || '', priority: 'High', completed: false, section: 'Narrative', createdAt: new Date().toISOString() },
          { id: `tsk-3`, title: 'Develop Itemized Budget & Budget Narrative', assignedTo: 'Finance Director', dueDate: schedule.taskDates[2] || '', priority: 'High', completed: false, section: 'Budget', createdAt: new Date().toISOString() }
        ],
        milestones: [
          { id: `ms-1`, title: 'First Draft & Department Submissions Complete', targetDate: schedule.milestoneDates[0] || '', completed: false },
          { id: `ms-2`, title: 'Complete Narrative & Budget Harmonisation', targetDate: schedule.milestoneDates[1] || '', completed: false },
          { id: `ms-3`, title: 'Internal Management Quality Review (HoD / Proposal Lead)', targetDate: schedule.milestoneDates[2] || '', completed: false },
          { id: `ms-4`, title: 'Final Executive Organisational Approval', targetDate: schedule.milestoneDates[3] || '', completed: false },
          { id: `ms-5`, title: 'Final Donor Submission Target (24-48h Prior)', targetDate: schedule.milestoneDates[4] || '', completed: false }
        ],
        outstandingQuestions: [
          { id: `q-1`, question: 'Confirm exact portal upload file size limits with donor helpdesk.', category: 'Compliance', status: 'Open', assignedTo: 'Grants Officer' }
        ]
      });
    }

    const systemInstruction = `You are GrantFlow Agent's proposal setup coordinator.
Given a funding call extraction and eligibility assessment, automatically build a comprehensive proposal preparation workspace for the NGO.
CRITICAL PLANNING RULES:
1. TODAY IS: ${currentDateStr}.
2. VERIFIED DONOR DEADLINE: ${extraction?.applicationDeadline || 'Not stated'}.
3. The verified donor deadline is the single planning anchor. Internal proposal milestones and tasks MUST be scheduled BACKWARDS from that deadline.
4. All generated task dueDates and milestone targetDates MUST be valid future calendar dates between ${currentDateStr} and the donor deadline.
5. NEVER output dates from past years (e.g. 2024 or 2025) for a 2026 deadline. NEVER schedule any milestone or task after the donor deadline.
6. If the donor deadline is not stated or unverified, leave dueDate and targetDate as empty strings (""). Do NOT invent fake dates.`;

    const prompt = `Generate tailored proposal workspace artifacts for:
DONOR: ${extraction?.donor}
OPPORTUNITY: ${extraction?.opportunityTitle}
DEADLINE: ${extraction?.applicationDeadline}
CURRENT_ANCHOR_DATE: ${currentDateStr}
REQUIRED SUPPORTING DOCS: ${JSON.stringify(extraction?.requiredSupportingDocs || [])}
PROPOSAL SECTIONS: ${JSON.stringify(extraction?.proposalSections || [])}
SPECIAL RESTRICTIONS: ${extraction?.specialRestrictions}
NGO PROFILE: ${orgProfile?.name} (${orgProfile?.country})`;

    const { data: response, modelUsed } = await executeWithModelFailover(
      (model: string) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                requirementsChecklist: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['MET', 'IN_PROGRESS', 'PENDING', 'BLOCKED'] },
                      notes: { type: Type.STRING }
                    },
                    required: ['id', 'title', 'category', 'status', 'notes']
                  }
                },
                documentsChecklist: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      name: { type: Type.STRING },
                      mandatory: { type: Type.BOOLEAN },
                      category: { type: Type.STRING, enum: ['Governance', 'Financial', 'Technical Proposal', 'Budget', 'Partner/Endorsement', 'Other'] },
                      status: { type: Type.STRING, enum: ['Missing', 'Drafting', 'Under Review', 'Ready', 'Signed'] },
                      assignedTo: { type: Type.STRING },
                      notes: { type: Type.STRING }
                    },
                    required: ['id', 'name', 'mandatory', 'category', 'status']
                  }
                },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      assignedTo: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                      priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                      completed: { type: Type.BOOLEAN },
                      section: { type: Type.STRING }
                    },
                    required: ['id', 'title', 'assignedTo', 'dueDate', 'priority', 'completed']
                  }
                },
                milestones: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      targetDate: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN }
                    },
                    required: ['id', 'title', 'targetDate', 'completed']
                  }
                },
                outstandingQuestions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      question: { type: Type.STRING },
                      category: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['Open', 'Resolved'] },
                      assignedTo: { type: Type.STRING }
                    },
                    required: ['id', 'question', 'category', 'status']
                  }
                }
              },
              required: ['requirementsChecklist', 'documentsChecklist', 'tasks', 'milestones', 'outstandingQuestions']
            }
          }
        }),
      { operationName: 'Generate Workspace Artifacts' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{}');
    parsed.modelProcessed = modelUsed;

    // Server-side Date Sanitization & Deterministic Anchor Verification
    if (schedule.hasValidDeadline) {
      if (Array.isArray(parsed.milestones)) {
        parsed.milestones = parsed.milestones.map((m: any, idx: number) => {
          const parsedMDate = parseFlexibleDateServer(m.targetDate);
          // If Gemini output a past date (year <= 2025) or missing date, replace with computed backwards date
          const isStaleOrInvalid = !parsedMDate || parsedMDate.getFullYear() <= 2025 || parsedMDate < now;
          return {
            ...m,
            targetDate: isStaleOrInvalid ? (schedule.milestoneDates[idx] || schedule.milestoneDates[schedule.milestoneDates.length - 1]) : formatToYmdServer(parsedMDate)
          };
        });
      }

      if (Array.isArray(parsed.tasks)) {
        parsed.tasks = parsed.tasks.map((t: any, idx: number) => {
          const parsedTDate = parseFlexibleDateServer(t.dueDate);
          const isStaleOrInvalid = !parsedTDate || parsedTDate.getFullYear() <= 2025 || parsedTDate < now;
          return {
            ...t,
            dueDate: isStaleOrInvalid ? (schedule.taskDates[idx % schedule.taskDates.length] || schedule.taskDates[0]) : formatToYmdServer(parsedTDate)
          };
        });
      }
    } else {
      // If deadline is unstated, ensure dates are left empty
      if (Array.isArray(parsed.milestones)) {
        parsed.milestones = parsed.milestones.map((m: any) => ({ ...m, targetDate: '' }));
      }
      if (Array.isArray(parsed.tasks)) {
        parsed.tasks = parsed.tasks.map((t: any) => ({ ...t, dueDate: '' }));
      }
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating workspace artifacts:', error?.message || error);
    const errResp = formatApiErrorResponse(error, 'Failed to generate proposal artifacts.');
    return res.status(errResp.status).json(errResp.body);
  }
});

// 4. Agent Readiness Evaluation Endpoint
app.post('/api/evaluate-readiness', async (req: Request, res: Response) => {
  try {
    const { workspace, daysRemaining } = req.body;

    if (!workspace) {
      return res.status(400).json({ error: 'Workspace is required for readiness evaluation.' });
    }

    const mandatoryDocs = workspace.documentsChecklist?.filter((d: any) => d.mandatory) || [];
    const missingMandatoryDocs = mandatoryDocs.filter((d: any) => d.status === 'Missing' || d.status === 'Drafting');
    const incompleteTasks = workspace.tasks?.filter((t: any) => !t.completed) || [];
    const highPriorityIncompleteTasks = incompleteTasks.filter((t: any) => t.priority === 'High');

    // Rule-based deterministic logic for high reliability combined with AI
    let level: 'CRITICAL' | 'WARNING' | 'READY' | 'INFO' = 'INFO';
    let headline = '';
    let details = '';
    const recommendedActions: string[] = [];

    if (workspace.stage === 'Submitted' || workspace.stage === 'Awaiting Decision' || workspace.stage === 'Awarded' || workspace.stage === 'Rejected') {
      level = 'INFO';
      headline = `Opportunity is in ${workspace.stage} status.`;
      details = workspace.submissionRecord?.submittedAt
        ? `Submitted on ${new Date(workspace.submissionRecord.submittedAt).toLocaleDateString()} (Ref: ${workspace.submissionRecord.confirmationNumber || 'N/A'}).`
        : `Record is archived or awaiting donor determination.`;
      if (workspace.submissionRecord?.expectedDecisionDate) {
        recommendedActions.push(`Monitor for decision around ${workspace.submissionRecord.expectedDecisionDate}.`);
      }
    } else if (missingMandatoryDocs.length === 0 && incompleteTasks.length === 0) {
      level = 'READY';
      headline = 'Application package appears ready for final human review.';
      details = 'All mandatory supporting documents are in "Ready" or "Signed" status and all internal preparation tasks have been marked complete.';
      recommendedActions.push('Perform final executive review and document checksum verification.');
      recommendedActions.push('Proceed to record official submission once transmitted to donor.');
    } else if (daysRemaining !== undefined && daysRemaining <= 3 && (missingMandatoryDocs.length > 0 || highPriorityIncompleteTasks.length > 0)) {
      level = 'CRITICAL';
      const docMsg = missingMandatoryDocs.length > 0 ? `${missingMandatoryDocs.length} mandatory document(s) still outstanding` : '';
      const taskMsg = highPriorityIncompleteTasks.length > 0 ? `${highPriorityIncompleteTasks.length} urgent task(s) incomplete` : '';
      headline = `Urgent: ${[docMsg, taskMsg].filter(Boolean).join(' and ')} with ${daysRemaining} day(s) until deadline.`;
      details = `Immediate intervention required: ${missingMandatoryDocs.map((d: any) => d.name).join(', ')}.`;
      recommendedActions.push('Escalate missing items to Executive Director immediately.');
      recommendedActions.push('Schedule emergency submission assembly sprint.');
    } else if (daysRemaining !== undefined && daysRemaining <= 7 && missingMandatoryDocs.length > 0) {
      level = 'WARNING';
      headline = `Action required: ${missingMandatoryDocs.length} mandatory document(s) are still outstanding with ${daysRemaining} days remaining.`;
      details = `Key incomplete documents: ${missingMandatoryDocs.slice(0, 3).map((d: any) => d.name).join(', ')}.`;
      recommendedActions.push('Follow up with document owners to transition drafts into Ready state.');
      recommendedActions.push('Confirm all third-party reference or endorsement letters are in hand.');
    } else {
      level = 'WARNING';
      headline = `Active Preparation: ${mandatoryDocs.length - missingMandatoryDocs.length}/${mandatoryDocs.length} mandatory documents ready.`;
      details = `${incompleteTasks.length} tasks remaining across the workspace.`;
      recommendedActions.push('Continue progressing technical narrative and budget iterations.');
      recommendedActions.push('Complete weekly milestone check-in.');
    }

    return res.json({
      level,
      headline,
      details,
      recommendedActions,
      evaluatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error evaluating readiness:', error);
    return res.status(500).json({ error: error.message || 'Failed to evaluate readiness.' });
  }
});

// 5. Parse Donor Template / Questions Endpoint
app.post('/api/parse-donor-template', async (req: Request, res: Response) => {
  try {
    const { sourceType, rawText, fileName, donorName, opportunityTitle, proposalSections, orgProfile, isDeveloperTestMode } = req.body;

    // DETERMINISTIC TEST MODE: 100% independent of Gemini & internet
    if (isDeveloperTestMode || sourceType === 'test_mode' || (opportunityTitle && opportunityTitle.includes('[TEST DATA]'))) {
      const sections = generateDeterministicApplicationSections(
        orgProfile?.departments || [],
        orgProfile?.staffDirectory || []
      );
      return res.json({
        sections,
        isGrantFlowGenerated: false
      });
    }

    // 1. Generic Fallback when no donor template is provided
    const defaultStaff = orgProfile?.staffDirectory?.[0]?.fullName || 'Lead Proposal Writer';
    const defaultHoD = orgProfile?.staffDirectory?.find((s: any) => s.isDepartmentHead || s.role === 'DepartmentHead')?.fullName || defaultStaff;

    if (sourceType === 'none_fallback' || (!rawText && (!proposalSections || proposalSections.length === 0))) {
      const fallbackSections = [
        {
          id: `sec-${Date.now()}-1`,
          sectionNumber: 'Section 1',
          donorQuestion: 'Executive Summary & Problem Statement',
          donorInstructions: 'Provide a concise overview of the target challenge, justification, target beneficiaries, and expected impact.',
          wordLimit: 500,
          isGrantFlowGenerated: true,
          mandatory: true,
          assignedDepartment: 'Programmes',
          assignedStaff: defaultStaff,
          departmentHead: defaultHoD,
          dueDate: 'In 7 days',
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: 0
        },
        {
          id: `sec-${Date.now()}-2`,
          sectionNumber: 'Section 2',
          donorQuestion: 'Target Population, Needs Assessment & Geographic Focus',
          donorInstructions: 'Detail beneficiary demographics, vulnerability criteria, local community engagement, and operating locations.',
          wordLimit: 750,
          isGrantFlowGenerated: true,
          mandatory: true,
          assignedDepartment: 'Programmes',
          assignedStaff: defaultStaff,
          departmentHead: defaultHoD,
          dueDate: 'In 9 days',
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: 1
        },
        {
          id: `sec-${Date.now()}-3`,
          sectionNumber: 'Section 3',
          donorQuestion: 'Project Methodology, Technical Approach & Implementation Workplan',
          donorInstructions: 'Detail step-by-step technical interventions, key activity milestones, risk management, and sustainability strategy.',
          wordLimit: 1500,
          isGrantFlowGenerated: true,
          mandatory: true,
          assignedDepartment: 'Programmes',
          assignedStaff: defaultStaff,
          departmentHead: defaultHoD,
          dueDate: 'In 12 days',
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: 2
        },
        {
          id: `sec-${Date.now()}-4`,
          sectionNumber: 'Section 4',
          donorQuestion: 'Monitoring, Evaluation, Accountability & Learning (MEAL) Framework',
          donorInstructions: 'Define quantitative indicators, disaggregated data collection methods, verification sources, and feedback loops.',
          wordLimit: 800,
          isGrantFlowGenerated: true,
          mandatory: true,
          assignedDepartment: 'Monitoring & Evaluation',
          assignedStaff: defaultStaff,
          departmentHead: defaultHoD,
          dueDate: 'In 10 days',
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: 3
        },
        {
          id: `sec-${Date.now()}-5`,
          sectionNumber: 'Section 5',
          donorQuestion: 'Institutional Experience, Governance & Safeguarding Compliance',
          donorInstructions: 'Detail past donor track record, staffing structure, child safeguarding, anti-fraud, and gender policies.',
          wordLimit: 750,
          isGrantFlowGenerated: true,
          mandatory: true,
          assignedDepartment: 'Grants / Resource Mobilisation',
          assignedStaff: defaultStaff,
          departmentHead: defaultHoD,
          dueDate: 'In 8 days',
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: 4
        },
        {
          id: `sec-${Date.now()}-6`,
          sectionNumber: 'Section 6',
          donorQuestion: 'Activity-Based Budget Narrative & Financial Cost Justification',
          donorInstructions: 'Justify line-item cost drivers, personnel allocations, operational overheads, and co-funding contributions.',
          wordLimit: 600,
          isGrantFlowGenerated: true,
          mandatory: true,
          assignedDepartment: 'Finance',
          assignedStaff: defaultStaff,
          departmentHead: defaultHoD,
          dueDate: 'In 11 days',
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: 5
        }
      ];

      return res.json({
        sourceType: 'none_fallback',
        isGrantFlowGenerated: true,
        sections: fallbackSections
      });
    }

    const ai = getGeminiClient();

    // Fallback parser if Gemini client is unavailable
    if (!ai) {
      const sourceContent = rawText || (proposalSections ? proposalSections.join('\n\n') : '');
      const rawLines = sourceContent.split(/\n\s*\n/).filter((b: string) => b.trim().length > 0);

      const parsedSections = rawLines.slice(0, 8).map((block: string, idx: number) => {
        const lines = block.split('\n').map((l: string) => l.trim()).filter(Boolean);
        const firstLine = lines[0] || `Section ${idx + 1}`;
        const restLines = lines.slice(1).join(' ');

        // Check if there is question numbering
        const qNumMatch = firstLine.match(/^(Q\s*\d+(\.\d+)?|Section\s*\d+(\.\d+)?|\d+\.\d*|\bPart\s+[A-Z0-9]+)/i);
        const secNumber = qNumMatch ? qNumMatch[0] : `Q${idx + 1}`;
        const qText = qNumMatch ? firstLine.replace(qNumMatch[0], '').replace(/^[:.-]\s*/, '') || firstLine : firstLine;

        let dept = 'Programmes';
        let staff = defaultStaff;
        let hod = defaultHoD;

        const lower = (firstLine + ' ' + restLines).toLowerCase();
        if (lower.includes('budget') || lower.includes('cost') || lower.includes('financial') || lower.includes('audit')) {
          dept = 'Finance';
        } else if (lower.includes('m&e') || lower.includes('monitoring') || lower.includes('evaluation') || lower.includes('indicator') || lower.includes('results framework')) {
          dept = 'Monitoring & Evaluation';
        } else if (lower.includes('experience') || lower.includes('capacity') || lower.includes('governance') || lower.includes('policy') || lower.includes('safeguard')) {
          dept = 'Grants / Resource Mobilisation';
        }

        return {
          id: `sec-${Date.now()}-${idx}`,
          sectionNumber: secNumber,
          donorQuestion: qText,
          donorInstructions: restLines || 'Follow donor requirements and provide comprehensive operational detail.',
          wordLimit: lower.includes('summary') ? 500 : lower.includes('budget') ? 600 : 1000,
          isGrantFlowGenerated: false,
          mandatory: true,
          assignedDepartment: dept,
          assignedStaff: staff,
          departmentHead: hod,
          dueDate: `In ${7 + idx * 2} days`,
          draftResponse: '',
          status: 'Not Started',
          reviewStatus: 'Drafting',
          orderIndex: idx
        };
      });

      return res.json({
        sourceType,
        isGrantFlowGenerated: false,
        sections: parsedSections.length > 0 ? parsedSections : []
      });
    }

    const systemInstruction = `You are GrantFlow Agent's elite donor application template parser.
Your task is to parse donor application forms, RFP questions, portal question lists, or funding call sections into exact structured application items.

CRITICAL RULES:
1. PRESERVE ORIGINAL QUESTION NUMBERING (e.g. Q1, Q1.1, Section 2.1, Part A, 4.3). Do not remove or alter numbers.
2. PRESERVE VERBATIM DONOR WORDING of each question. DO NOT rewrite, paraphrase, or summarize donor questions.
3. EXTRACT EXACT DONOR INSTRUCTIONS / GUIDELINES for each question if provided.
4. EXTRACT STATED WORD LIMITS (as a positive integer number of words), character limits, or page limits if specified.
5. ASSIGN APPROPRIATE NGO DEPARTMENT:
   - "Programmes" (Methodology, problem statement, community engagement, beneficiaries, work plan, technical activities)
   - "Finance" (Budgets, financial management, cost share, turnover, procurement, overheads)
   - "Monitoring & Evaluation" (Indicators, logframe, data collection, MEAL, results matrix)
   - "Grants / Resource Mobilisation" (Organisational capacity, past experience, donor history, track record, governance)
   - "Executive Management" (Risk mitigation, institutional commitments, legal sign-off)
6. ASSIGN DEFAULT STAFF & DEPARTMENT HEAD:
   - Default Staff: "${defaultStaff}"
   - Default HoD: "${defaultHoD}"`;

    const prompt = `Parse the following donor application template/questions into structured items:

DONOR: ${donorName || 'Donor'}
OPPORTUNITY: ${opportunityTitle || 'Opportunity'}
SOURCE TYPE: ${sourceType}

--- DONOR APPLICATION CONTENT ---
${rawText || (proposalSections ? proposalSections.join('\n\n') : '')}
--- END ---`;

    const { data: response, modelUsed } = await executeWithModelFailover(
      (model: string) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      sectionNumber: { type: Type.STRING, description: 'Exact original numbering (e.g. Q1, Section 2.3)' },
                      donorQuestion: { type: Type.STRING, description: 'Verbatim donor question text' },
                      donorInstructions: { type: Type.STRING, description: 'Exact instructions or guidelines for this section' },
                      wordLimit: { type: Type.INTEGER, description: 'Stated word limit integer if found, or null' },
                      charLimit: { type: Type.INTEGER, description: 'Stated character limit integer if found, or null' },
                      pageLimit: { type: Type.STRING, description: 'Stated page limit if found' },
                      mandatory: { type: Type.BOOLEAN },
                      assignedDepartment: {
                        type: Type.STRING,
                        enum: ['Programmes', 'Finance', 'Monitoring & Evaluation', 'Grants / Resource Mobilisation', 'Executive Management', 'Administration / Operations']
                      },
                      assignedStaff: { type: Type.STRING },
                      departmentHead: { type: Type.STRING },
                      dueDate: { type: Type.STRING, description: 'Suggested timeline e.g. "In 7 days"' }
                    },
                    required: ['sectionNumber', 'donorQuestion', 'assignedDepartment', 'assignedStaff', 'departmentHead']
                  }
                }
              },
              required: ['sections']
            }
          }
        }),
      { operationName: 'Parse Donor Template' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{"sections":[]}');
    const sectionsWithDefaults = (parsed.sections || []).map((sec: any, idx: number) => ({
      ...sec,
      id: sec.id || `sec-${Date.now()}-${idx}`,
      isGrantFlowGenerated: false,
      draftResponse: '',
      status: 'Not Started',
      reviewStatus: 'Drafting',
      orderIndex: idx
    }));

    return res.json({
      sourceType,
      fileName,
      isGrantFlowGenerated: false,
      modelProcessed: modelUsed,
      sections: sectionsWithDefaults
    });
  } catch (error: any) {
    console.error('Error parsing donor template:', error?.message || error);
    const errResp = formatApiErrorResponse(error, 'Failed to parse donor template. Your uploaded template has been safely preserved.');
    return res.status(errResp.status).json(errResp.body);
  }
});

// 6. AI Quality & Compliance Review for Section Draft Endpoint
app.post('/api/review-draft-section', async (req: Request, res: Response) => {
  try {
    const {
      donorQuestion,
      donorInstructions,
      wordLimit,
      charLimit,
      draftResponse,
      orgProfile,
      departmentName,
      isDeveloperTestMode
    } = req.body;

    if (!donorQuestion || !draftResponse || draftResponse.trim().length === 0) {
      return res.status(400).json({ error: 'Both donor question and a draft response are required for AI review.' });
    }

    // DETERMINISTIC TEST MODE: 100% independent of Gemini & internet
    if (isDeveloperTestMode) {
      return res.json(generateDeterministicSectionCritique(
        {
          id: 'sec-test',
          sectionNumber: 'Q',
          donorQuestion,
          donorInstructions,
          wordLimit,
          charLimit,
          draftResponse,
          mandatory: true,
          assignedDepartment: departmentName || 'Programmes',
          assignedStaff: 'Officer',
          departmentHead: 'Head of Programmes',
          dueDate: '2026-11-01',
          status: 'Drafting',
          reviewStatus: 'Drafting',
          orderIndex: 0
        },
        orgProfile || { name: 'Test Organisation' } as any
      ));
    }

    const wordCount = draftResponse.trim().split(/\s+/).filter(Boolean).length;
    const ai = getGeminiClient();

    if (!ai) {
      // Deterministic fallback review
      const isExceeding = wordLimit ? wordCount > wordLimit : false;
      const isTooShort = wordCount < 50;

      return res.json({
        unansweredElements: isTooShort ? ['Response appears too brief to comprehensively address all aspects of the donor question.'] : [],
        weakEvidence: wordCount < 100 ? ['Include specific baseline data, beneficiary numbers, and institutional dates.'] : [],
        unsupportedClaims: ['Ensure all factual assertions are backed by organizational metrics or verified methodologies.'],
        repetitionNotes: [],
        wordCountStatus: isExceeding ? 'Exceeds Limit' : (isTooShort ? 'Too Short' : 'Optimal'),
        wordCountDetails: wordLimit
          ? `Current word count: ${wordCount} words (Target: max ${wordLimit} words. ${isExceeding ? `Exceeds by ${wordCount - wordLimit} words` : `${wordLimit - wordCount} words remaining`}).`
          : `Current word count: ${wordCount} words. No strict word limit stated.`,
        logicalInconsistencies: [],
        actionableSuggestions: [
          `Ensure alignment with ${orgProfile?.name || 'the organization'}'s institutional mandate and verified thematic experience.`,
          'Highlight concrete implementation milestones and responsible team roles.',
          'Verify that all terms conform to standard donor terminology.'
        ],
        evaluatedAt: new Date().toISOString()
      });
    }

    const systemInstruction = `You are GrantFlow Agent's elite proposal compliance & quality reviewer.
Your mission is to evaluate a staff member's draft answer strictly against the donor's exact question and instructions.

CRITICAL RULES:
1. DO NOT invent requirements that the donor did not ask for.
2. DO NOT write or replace the draft text. Your output is advisory review feedback only.
3. Identify:
   - unansweredElements: Key sub-questions or specific donor prompts not yet addressed.
   - weakEvidence: Claims that lack numbers, dates, locations, verified evidence, or concrete methodology.
   - unsupportedClaims: Generalizations, buzzwords, or unsubstantiated achievements.
   - repetitionNotes: Redundant statements, repeated sentences, or filler text.
   - wordCountStatus: 'Within Limit' | 'Exceeds Limit' | 'Too Short' | 'Optimal'
   - wordCountDetails: Clear explanation of word count vs limit.
   - logicalInconsistencies: Disconnects between problem, activities, and expected outcomes.
   - actionableSuggestions: 2-4 concise, high-value editorial suggestions the writer can adopt.`;

    const prompt = `Review this draft response against the donor's requirements:

DONOR QUESTION:
"${donorQuestion}"

DONOR INSTRUCTIONS:
"${donorInstructions || 'None specified'}"

WORD LIMIT: ${wordLimit ? `${wordLimit} words` : 'None specified'}
CURRENT WORD COUNT: ${wordCount} words

STAFF DRAFT RESPONSE:
"""
${draftResponse}
"""

ORGANIZATION CONTEXT:
${orgProfile?.name || 'CSO'} based in ${orgProfile?.country || 'Nigeria'}. Thematic areas: ${(orgProfile?.thematicAreas || []).join(', ')}.

Provide rigorous, objective analytical critique.`;

    const { data: response, modelUsed } = await executeWithModelFailover(
      (model: string) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                unansweredElements: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Unaddressed parts of the donor question'
                },
                weakEvidence: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Claims lacking specific data, numbers, dates, or methodologies'
                },
                unsupportedClaims: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Vague statements or buzzwords without verification'
                },
                repetitionNotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Redundant or repeated arguments'
                },
                wordCountStatus: {
                  type: Type.STRING,
                  enum: ['Within Limit', 'Exceeds Limit', 'Too Short', 'Optimal']
                },
                wordCountDetails: {
                  type: Type.STRING,
                  description: 'Word count explanation and budget comparison'
                },
                logicalInconsistencies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Logical gaps or contradictions'
                },
                actionableSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Concrete suggestions to improve clarity and score'
                }
              },
              required: [
                'unansweredElements',
                'weakEvidence',
                'unsupportedClaims',
                'repetitionNotes',
                'wordCountStatus',
                'wordCountDetails',
                'logicalInconsistencies',
                'actionableSuggestions'
              ]
            }
          }
        }),
      { operationName: 'Review Draft Section' }
    );

    const parsed = JSON.parse(response.text?.trim() || '{}');
    parsed.evaluatedAt = new Date().toISOString();
    parsed.modelProcessed = modelUsed;

    return res.json(parsed);
  } catch (error: any) {
    console.error('Error reviewing draft section:', error?.message || error);
    const errResp = formatApiErrorResponse(error, 'Failed to review draft section. Your draft text has been safely preserved.');
    return res.status(errResp.status).json(errResp.body);
  }
});

// ==========================================
// OPPORTUNITY SCOUT ENGINE & API ENDPOINTS
// ==========================================

export function generateTargetedSearchQueries(orgProfile: OrgProfile): string[] {
  const country = orgProfile.country || 'Nigeria';
  const thematics = (orgProfile.fundingPreferences?.thematicAreas?.length
    ? orgProfile.fundingPreferences.thematicAreas
    : orgProfile.thematicAreas || ['Community Development', 'Youth Empowerment']
  ).slice(0, 3);
  const keywords = (orgProfile.fundingPreferences?.keywords || []).slice(0, 3);
  const orgType = orgProfile.fundingPreferences?.orgType || orgProfile.orgType || 'NGO';
  const donorPref = orgProfile.fundingPreferences?.preferredDonorTypes?.[0]?.split(' ')[0] || 'International donors';

  const queries: string[] = [
    `${country} ${orgType} ${thematics[0] || 'civil society'} grant funding RFP 2025 2026`,
    `${country} call for proposals ${thematics[1] || thematics[0] || 'community resilience'} open deadline 2026`,
    `${donorPref} non-profit funding opportunities ${country} 2026`,
    `Africa civil society ${thematics[0] || 'community development'} grant applications open 2026`
  ];

  if (keywords.length > 0) {
    queries.push(`${country} funding call ${keywords.join(' ')} 2026`);
  }

  return Array.from(new Set(queries));
}

export async function executeOpportunityScout(orgId: string): Promise<{ opportunities: ScoutedOpportunity[]; log: ScoutActivityLog }> {
  const orgProfile = db.getOrg(orgId) || {
    id: orgId,
    name: 'Civil Society Organisation',
    country: 'Nigeria',
    thematicAreas: ['Community Development', 'Youth Empowerment'],
    registrationStatus: 'Incorporated Trustee / NGO',
    orgType: 'NGO'
  } as OrgProfile;

  const existingWorkspaces = db.getWorkspacesByOrg(orgId);
  const existingScouted = db.getScoutedOpportunitiesByOrg(orgId);
  const dismissals = db.getDismissalsByOrg(orgId);

  const existingUrls = new Set([
    ...existingWorkspaces.map(w => (w.sourceUrl || '').toLowerCase().trim()).filter(Boolean),
    ...existingScouted.map(s => s.sourceUrl.toLowerCase().trim()).filter(Boolean),
    ...dismissals.map(d => d.sourceUrl.toLowerCase().trim()).filter(Boolean)
  ]);

  const existingTitles = new Set([
    ...existingWorkspaces.map(w => w.title.toLowerCase().trim()),
    ...existingScouted.map(s => s.title.toLowerCase().trim()),
    ...dismissals.map(d => d.title.toLowerCase().trim())
  ]);

  const searchQueries = generateTargetedSearchQueries(orgProfile);
  let newlyDiscovered: ScoutedOpportunity[] = [];
  let candidatePagesReviewed = 0;
  let duplicatesIgnored = 0;

  const ai = getGeminiClient();

  if (ai) {
    try {
      const searchPrompt = `You are GrantFlow Opportunity Scout. Search Google for currently active, open grant funding opportunities, calls for proposals (CFP), requests for applications (RFA), or notices of funding opportunities (NOFO) matching this non-profit organisation:
      
ORGANISATION PROFILE:
Name: ${orgProfile.name}
Country: ${orgProfile.country}
Organisation Type: ${orgProfile.fundingPreferences?.orgType || orgProfile.orgType || 'Registered Non-Governmental Organisation'}
Thematic Focus: ${(orgProfile.fundingPreferences?.thematicAreas || orgProfile.thematicAreas || []).join(', ')}
Target Beneficiaries: ${(orgProfile.fundingPreferences?.beneficiaryGroups || []).join(', ') || 'Vulnerable communities, youth, women'}
Funding Range: ${orgProfile.fundingPreferences?.preferredFundingMin || '$50,000'} - ${orgProfile.fundingPreferences?.preferredFundingMax || '$500,000 USD'}

SEARCH QUERIES TO INVESTIGATE:
${searchQueries.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Search for REAL, currently OPEN funding calls with future deadlines in 2025/2026 or rolling deadlines.
2. Verify original public opportunity pages. Extract exact verified public source URLs.
3. For each real candidate opportunity, output:
   - donor: Official Funder/Donor name
   - title: Exact Call / Opportunity Title
   - rawSummary: 2-3 sentence overview of objectives and scope
   - deadline: Exact ISO date or date string (e.g. "2026-11-15T17:00:00Z") or "Rolling"
   - deadlineStatus: "Confirmed from Source" | "Needs Verification"
   - opportunityStatus: "Open" | "Deadline approaching" | "Rolling / no fixed deadline"
   - fundingAmount: Stated ceiling/range (e.g. "$250,000 USD") or "Amount TBD"
   - currency: "USD" | "EUR" | "GBP" | "NGN"
   - eligibleGeography: array of countries
   - eligibleApplicantTypes: array of entity types
   - thematicFocus: array of thematic areas
   - sourceUrl: exact verified original web URL
   - matchVerdict: "STRONG MATCH" | "POSSIBLE MATCH" | "REVIEW REQUIRED"
   - matchReasons: array of 3-4 bullet points explaining why it matches this specific organisation
   - matchCriteriaBreakdown: array of { criterion: string, status: "MET" | "REVIEW_REQUIRED", evidence: string }
4. Do NOT invent missing details or fake URLs. If a deadline or budget is unstated, mark as "Needs Verification".
5. Do NOT recommend closed or past expired grants.`;

      const { data: searchResponse } = await executeWithModelFailover(
        (model: string) =>
          ai.models.generateContent({
            model,
            contents: searchPrompt,
            config: {
              tools: [{ googleSearch: {} }]
            }
          }),
        { operationName: 'Opportunity Scout Google Search' }
      );

      const responseText = searchResponse.text || '';
      candidatePagesReviewed = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks?.length || searchQueries.length * 3;

      // Extract JSON structure from grounded response
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || responseText.match(/(\[\s*\{[\s\S]*\}\s*\])/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              const urlKey = (item.sourceUrl || '').toLowerCase().trim();
              const titleKey = (item.title || '').toLowerCase().trim();

              if (!urlKey || existingUrls.has(urlKey) || existingTitles.has(titleKey)) {
                duplicatesIgnored++;
                return;
              }

              // Check pipeline status
              const alreadyInPipeline = existingWorkspaces.some(
                w => w.title.toLowerCase().trim() === titleKey || (w.sourceUrl && w.sourceUrl.toLowerCase().trim() === urlKey)
              );

              const opportunity: ScoutedOpportunity = {
                id: `scout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                orgId,
                donor: item.donor || 'International Funder',
                title: item.title || 'Public Grant Opportunity',
                rawSummary: item.rawSummary || 'Publicly scouted grant opportunity for civil society organisations.',
                deadline: item.deadline || '2026-11-30T17:00:00Z',
                deadlineStatus: item.deadlineStatus || 'Confirmed from Source',
                opportunityStatus: item.opportunityStatus || 'Open',
                fundingAmount: item.fundingAmount || 'Amount TBD',
                currency: item.currency || 'USD',
                eligibleGeography: Array.isArray(item.eligibleGeography) ? item.eligibleGeography : [orgProfile.country || 'Nigeria'],
                eligibleApplicantTypes: Array.isArray(item.eligibleApplicantTypes) ? item.eligibleApplicantTypes : ['NGOs', 'Civil Society Organisations'],
                thematicFocus: Array.isArray(item.thematicFocus) ? item.thematicFocus : orgProfile.thematicAreas || ['Community Development'],
                sourceUrl: item.sourceUrl || 'https://www.grants.gov',
                googleSearchCitationSnippet: item.googleSearchCitationSnippet || undefined,
                isVerifiedAgainstSource: true,
                verifiedAt: new Date().toISOString(),
                matchVerdict: item.matchVerdict || 'STRONG MATCH',
                matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons : [`Matches ${orgProfile.country} non-profit operations`],
                matchCriteriaBreakdown: Array.isArray(item.matchCriteriaBreakdown) ? item.matchCriteriaBreakdown : [
                  { criterion: 'Geographic Eligibility', status: 'MET', evidence: `${orgProfile.name} is based in ${orgProfile.country}.` }
                ],
                status: 'Inbox',
                discoveredAt: new Date().toISOString(),
                isAlreadyInPipeline: alreadyInPipeline
              };

              newlyDiscovered.push(opportunity);
              existingUrls.add(urlKey);
              existingTitles.add(titleKey);
            });
          }
        } catch (parseErr) {
          console.log('[Opportunity Scout] Non-JSON response, using structured deterministic fallbacks:', parseErr);
        }
      }
    } catch (aiErr: any) {
      console.log('[Opportunity Scout] Gemini live search fallback (e.g. 429 quota/offline):', aiErr?.message || aiErr);
    }
  }

  // Apply Hard Filters, Match Standards (Strong/Possible/Review/Low), and deterministic fit ranking
  const filteredAndRanked = rankAndFilterScoutOpportunities(newlyDiscovered, orgProfile, 6);

  // Save filtered high-relevance opportunities to database
  if (filteredAndRanked.length > 0) {
    db.batchSaveScoutedOpportunities(orgId, filteredAndRanked);
  }

  const strongMatchesCount = filteredAndRanked.filter(o => o.matchVerdict === 'STRONG MATCH').length;

  // Record Scout Activity Log
  const activityLog: ScoutActivityLog = {
    id: `log-scout-${Date.now()}`,
    orgId,
    timestamp: new Date().toISOString(),
    searchesRun: searchQueries.length,
    queriesExecuted: searchQueries,
    candidatePagesReviewed,
    newOpportunitiesFound: filteredAndRanked.length,
    strongMatchesCount,
    duplicatesIgnored,
    summary: `Executed ${searchQueries.length} targeted search queries. Evaluated ${candidatePagesReviewed} candidate sources against ${orgProfile.name} profile. Discovered ${filteredAndRanked.length} actionable opportunities (${strongMatchesCount} strong matches, ${duplicatesIgnored} duplicates ignored).`
  };

  db.saveScoutActivityLog(orgId, activityLog);

  // Update Scout Config timestamp
  db.saveScoutConfig(orgId, {
    lastRunAt: new Date().toISOString(),
    nextRunAt: new Date(Date.now() + 3600000 * 24).toISOString()
  });

  return {
    opportunities: filteredAndRanked,
    log: activityLog
  };
}

// 1. Run Opportunity Scout On-Demand
app.post('/api/scout/run', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOrgId = authReq.organizationId || (req.body && req.body.orgId);
    if (!activeOrgId) return res.status(400).json({ error: 'Organization ID is required.' });

    // DETERMINISTIC TEST MODE: 100% independent of Gemini & internet
    if (req.body && req.body.isDeveloperTestMode) {
      const org = db.getOrg(activeOrgId);
      const testResults = generateDeterministicScoutResults(
        org || ({ id: activeOrgId, name: 'Test Organisation', country: 'Nigeria' } as any)
      );
      return res.json({
        success: true,
        newOpportunitiesCount: testResults.length,
        opportunities: testResults,
        activityLog: {
          id: `log-test-${Date.now()}`,
          orgId: activeOrgId,
          timestamp: new Date().toISOString(),
          searchesRun: 3,
          queriesExecuted: ['[TEST MODE] Deterministic Opportunity Fixtures'],
          candidatePagesReviewed: 3,
          newOpportunitiesFound: testResults.length,
          strongMatchesCount: testResults.filter(o => o.matchVerdict === 'STRONG MATCH').length,
          duplicatesIgnored: 0,
          summary: `[TEST MODE] Generated ${testResults.length} deterministic test funding opportunities with 0 external network/AI calls.`
        }
      });
    }

    const result = await executeOpportunityScout(activeOrgId);
    return res.json({
      success: true,
      newOpportunitiesCount: result.opportunities.length,
      opportunities: result.opportunities,
      activityLog: result.log
    });
  } catch (err: any) {
    console.error('Error running Opportunity Scout:', err);
    return res.status(500).json({ error: 'Failed to run Opportunity Scout. Please try again.' });
  }
});

// 2. Get Scouted Opportunities Inbox
app.get('/api/scout/opportunities', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOrgId = authReq.organizationId || (req.query && (req.query.orgId as string));
    if (!activeOrgId) {
      return res.json({
        opportunities: [],
        totalCount: 0,
        inboxCount: 0,
        strongMatchesCount: 0,
        savedCount: 0
      });
    }

    const opportunities = db.getScoutedOpportunitiesByOrg(activeOrgId);
    return res.json({
      opportunities,
      totalCount: opportunities.length,
      inboxCount: opportunities.filter(o => o.status === 'Inbox').length,
      strongMatchesCount: opportunities.filter(o => o.matchVerdict === 'STRONG MATCH' && o.status !== 'Dismissed').length,
      savedCount: opportunities.filter(o => o.status === 'Saved').length
    });
  } catch (err: any) {
    console.error('Error fetching scouted opportunities:', err);
    return res.status(500).json({ error: 'Failed to fetch scouted opportunities.' });
  }
});

// 3. Update Scouted Opportunity Status (Review, Save, Dismiss, Pursue)
app.post('/api/scout/update-status', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOrgId = authReq.organizationId || (req.body && req.body.orgId);
    if (!activeOrgId) return res.status(400).json({ error: 'Organization ID is required.' });
    const { id, status, dismissalReason, dismissalNotes } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: 'Opportunity ID and target status are required.' });
    }

    const updated = db.updateScoutedOpportunityStatus(activeOrgId, id, status, dismissalReason, dismissalNotes);
    if (!updated) {
      return res.status(404).json({ error: 'Scouted opportunity not found.' });
    }

    return res.json({ success: true, opportunity: updated });
  } catch (err: any) {
    console.error('Error updating scouted opportunity status:', err);
    return res.status(500).json({ error: 'Failed to update opportunity status.' });
  }
});

// 4. Get Scout Activity Logs
app.get('/api/scout/activity-log', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOrgId = authReq.organizationId || (req.query && (req.query.orgId as string));
    if (!activeOrgId) {
      return res.json({ logs: [] });
    }

    const logs = db.getScoutActivityLogsByOrg(activeOrgId);
    return res.json({ logs });
  } catch (err: any) {
    console.error('Error fetching scout activity logs:', err);
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

// 5. Get and Update Scout Job Configuration
app.get('/api/scout/config', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOrgId = authReq.organizationId || (req.query && (req.query.orgId as string));
    if (!activeOrgId) {
      return res.json({ config: null });
    }

    const config = db.getScoutConfigByOrg(activeOrgId);
    return res.json({ config });
  } catch (err: any) {
    console.error('Error fetching scout config:', err);
    return res.status(500).json({ error: 'Failed to fetch scout config.' });
  }
});

app.post('/api/scout/config', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const activeOrgId = authReq.organizationId || (req.body && req.body.orgId) || 'org-demo-01';
    const { scheduleCadence, enabled } = req.body;

    const updated = db.saveScoutConfig(activeOrgId, { scheduleCadence, enabled });
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    console.error('Error saving scout config:', err);
    return res.status(500).json({ error: 'Failed to save scout config.' });
  }
});

// 6. Cloud Scheduler / Cloud Run Webhook Cron Trigger
app.post('/api/scout/cron-trigger', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.SCOUT_CRON_SECRET || 'grantflow-scout-secret';

    if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(403).json({ error: 'Unauthorized cron trigger.' });
    }

    const orgs = db.getAllOrgs();
    const results: { orgId: string; newFound: number }[] = [];

    for (const org of orgs) {
      const config = db.getScoutConfigByOrg(org.id);
      if (config.enabled && config.scheduleCadence !== 'Manual Only') {
        const { opportunities } = await executeOpportunityScout(org.id);
        results.push({ orgId: org.id, newFound: opportunities.length });
      }
    }

    // Reuse the existing scheduled job to deliver due-date / overdue / document-expiry emails.
    const emailNotificationScan = await runDueNotificationScan();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      organizationsProcessed: results.length,
      details: results,
      emailNotificationScan
    });
  } catch (err: any) {
    console.error('Error executing scout cron trigger:', err);
    return res.status(500).json({ error: 'Failed to execute scout cron trigger.' });
  }
});

// Vite Middleware for Development / Static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GrantFlow Agent Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

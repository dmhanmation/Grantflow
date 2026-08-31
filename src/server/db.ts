import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  OrgProfile,
  StaffMember,
  OrgDepartment,
  OrgDocument,
  OpportunityWorkspace,
  WorkspaceTask,
  InstitutionalMemoryRecord,
  OpportunityActivityEvent,
  AppUser,
  StaffInvitation,
  UserRole,
  ScoutedOpportunity,
  ScoutActivityLog,
  ScoutJobConfig,
  DismissalRecord,
  ScoutOpportunityLifecycleStatus,
  DismissalReason
} from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'grantflow_db.json');

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  organizationId: string;
  role: UserRole;
  roles?: UserRole[];
  departmentId?: string;
  departmentName?: string;
  staffId?: string;
  jobTitle?: string;
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
  isDemoUser?: boolean;
  isSuperAdmin?: boolean;
  hasMultiOrgAccess?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}


export interface EmailDispatchRecord {
  id: string;
  organizationId: string;
  dedupeKey: string;
  recipient: string;
  subject: string;
  providerId?: string;
  sentAt: string;
}

export interface DbSchema {
  organizations: Record<string, OrgProfile>;
  users: Record<string, StoredUser>;
  invitations: Record<string, StaffInvitation>;
  workspaces: Record<string, OpportunityWorkspace>;
  sessions: Record<string, { userId: string; organizationId: string; expiresAt: number }>;
  institutionalMemory: Record<string, InstitutionalMemoryRecord>;
  auditEvents: Record<string, OpportunityActivityEvent>;
  scoutedOpportunities: Record<string, ScoutedOpportunity>;
  scoutActivityLogs: Record<string, ScoutActivityLog>;
  scoutConfigs: Record<string, ScoutJobConfig>;
  dismissalHistory: Record<string, DismissalRecord>;
  emailDispatches: Record<string, EmailDispatchRecord>;
}

// Password hashing helper using standard crypto PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
}

// Database initial state generator — Clean Slate
function createInitialDb(): DbSchema {
  const defaultOrgId = 'org-main-01';
  const defaultPassword = 'grantflow2026!';
  const { hash, salt } = hashPassword(defaultPassword);

  const adminStaffId = 'staff-admin-01';
  const adminUserId = 'user-admin-01';
  const adminEmail = '';
  const adminFullName = 'Organisation Admin';

  const defaultOrg: OrgProfile = {
    id: defaultOrgId,
    organizationId: defaultOrgId,
    name: '',
    country: '',
    yearEstablished: 0,
    registrationStatus: '',
    orgType: '',
    thematicAreas: [],
    geographicAreas: [],
    yearsExperience: 0,
    annualBudgetRange: '',
    annualBudgetUsdEstimate: 0,
    staffCount: 0,
    adminEmail,
    contactEmail: adminEmail,
    description: '',
    meCapacity: '',
    onboardingComplete: false,
    isDemo: false,
    departments: [],
    staffDirectory: [],
    documentLibrary: [],
    previousDonors: [],
    auditedAccountsAvailable: false,
    auditedAccountsYears: 0,
    safeguardingPolicy: false,
    genderPolicy: false,
    antiFraudPolicy: false,
    updatedAt: new Date().toISOString(),
    fundingPreferences: {
      thematicAreas: [],
      geographicEligibility: [],
      beneficiaryGroups: [],
      orgType: '',
      preferredFundingMin: '',
      preferredFundingMax: '',
      minUsefulGrantSize: '',
      preferredProjectDuration: '',
      preferredDonorTypes: [],
      fundingTypes: [],
      keywords: [],
      excludedSectors: [],
      excludedCountries: [],
      acceptsConsortium: false
    }
  };

  const users: Record<string, StoredUser> = {
    [adminUserId]: {
      id: adminUserId,
      email: adminEmail.toLowerCase(),
      passwordHash: hash,
      salt,
      fullName: adminFullName,
      organizationId: defaultOrgId,
      role: 'Admin',
      roles: ['Admin'],
      departmentId: undefined,
      departmentName: '',
      staffId: adminStaffId,
      jobTitle: 'Organisation Admin',
      status: 'Active',
      isDemoUser: false,
      createdAt: new Date().toISOString()
    }
  };

  return {
    organizations: {
      [defaultOrgId]: defaultOrg
    },
    users,
    invitations: {},
    workspaces: {},
    institutionalMemory: {},
    auditEvents: {},
    scoutedOpportunities: {},
    scoutActivityLogs: {},
    scoutConfigs: {
      [defaultOrgId]: {
        orgId: defaultOrgId,
        scheduleCadence: 'Daily',
        enabled: true,
        lastRunAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        nextRunAt: new Date(Date.now() + 3600000 * 20).toISOString()
      }
    },
    dismissalHistory: {},
    emailDispatches: {},
    sessions: {}
  };
}

class Database {
  private db: DbSchema;

  constructor() {
    this.db = this.load();
  }

  private load(): DbSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Forward-compatible store migration: older local databases pre-date email dispatch dedupe tracking.
        if (!parsed.emailDispatches || typeof parsed.emailDispatches !== 'object') {
          parsed.emailDispatches = {};
        }
        if (!parsed.sessions || typeof parsed.sessions !== 'object') {
          parsed.sessions = {};
        }
        // Validate default clean org existence
        if (!parsed.organizations || !parsed.organizations['org-main-01']) {
          const fresh = createInitialDb();
          this.save(fresh);
          return fresh;
        }

        // Sanitize real organisations: purge any demo or test workspaces from non-demo organisations
        if (parsed.workspaces) {
          Object.keys(parsed.workspaces).forEach(wsId => {
            const ws = parsed.workspaces[wsId];
            if (ws && ws.organizationId && ws.organizationId !== 'org-demo-01') {
              if (ws.isDemo || ws.isTestOpportunity || ws.isDeveloperTestMode || ws.isEphemeralTest) {
                delete parsed.workspaces[wsId];
              }
            }
          });
        }

        // Sanitize real organisations: purge any demo institutional memory records from non-demo organisations
        if (parsed.institutionalMemory) {
          Object.keys(parsed.institutionalMemory).forEach(memId => {
            const mem = parsed.institutionalMemory[memId];
            if (mem && mem.organizationId && mem.organizationId !== 'org-demo-01' && mem.isDemo) {
              delete parsed.institutionalMemory[memId];
            }
          });
        }

        return parsed;
      }
    } catch (err) {
      console.error('Error loading DB, creating fresh store:', err);
    }
    const fresh = createInitialDb();
    this.save(fresh);
    return fresh;
  }

  private save(data?: DbSchema): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const toWrite = data || this.db;
      fs.writeFileSync(DB_FILE, JSON.stringify(toWrite, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // === User & Auth Methods ===
  public findUserByEmail(email: string): StoredUser | null {
    const clean = email.toLowerCase().trim();
    return Object.values(this.db.users).find(u => u.email.toLowerCase() === clean) || null;
  }

  public findUserById(id: string): StoredUser | null {
    return this.db.users[id] || null;
  }

  public createUser(user: StoredUser): StoredUser {
    this.db.users[user.id] = user;
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const user = this.db.users[id];
    if (!user) return null;
    this.db.users[id] = { ...user, ...updates };
    this.save();
    return this.db.users[id];
  }

  public getUsersByOrg(orgId: string): StoredUser[] {
    return Object.values(this.db.users).filter(u => u.organizationId === orgId);
  }

  // === Email Notification Dispatch Ledger ===
  public saveSession(token: string, data: { userId: string; organizationId: string; expiresAt: number }): void {
    if (!this.db.sessions) this.db.sessions = {};
    this.db.sessions[token] = data;
    this.save(this.db);
  }

  public getSession(token: string): { userId: string; organizationId: string; expiresAt: number } | null {
    return (this.db.sessions || {})[token] || null;
  }

  public deleteSession(token: string): void {
    if (this.db.sessions) {
      delete this.db.sessions[token];
      this.save(this.db);
    }
  }

  public hasEmailDispatch(dedupeKey: string): boolean {
    return Object.values(this.db.emailDispatches || {}).some(record => record.dedupeKey === dedupeKey);
  }

  public recordEmailDispatch(record: EmailDispatchRecord): EmailDispatchRecord {
    if (!this.db.emailDispatches) this.db.emailDispatches = {};
    this.db.emailDispatches[record.id] = record;
    this.save();
    return record;
  }

  public getEmailDispatchesByOrg(orgId: string): EmailDispatchRecord[] {
    return Object.values(this.db.emailDispatches || {}).filter(record => record.organizationId === orgId);
  }

  // === Organization Methods ===
  public getOrg(id: string): OrgProfile | null {
    return this.db.organizations[id] || null;
  }

  public saveOrg(org: OrgProfile): OrgProfile {
    this.db.organizations[org.id] = org;
    this.save();
    return org;
  }

  public getAllOrgs(): OrgProfile[] {
    return Object.values(this.db.organizations);
  }

  // === Workspace Methods (Strict Tenant & Test Isolation) ===
  public getWorkspacesByOrg(orgId: string): OpportunityWorkspace[] {
    if (orgId === 'org-demo-01') {
      return Object.values(this.db.workspaces).filter(w => (w.organizationId || 'org-demo-01') === 'org-demo-01');
    }
    // For real organisations: strictly return non-demo, non-test real workspaces
    return Object.values(this.db.workspaces).filter(
      w => w.organizationId === orgId && !w.isDemo && !w.isTestOpportunity && !w.isDeveloperTestMode && !w.isEphemeralTest
    );
  }

  public getWorkspaceById(orgId: string, workspaceId: string): OpportunityWorkspace | null {
    const ws = this.db.workspaces[workspaceId];
    if (!ws) return null;
    if ((ws.organizationId || 'org-demo-01') !== orgId) {
      return null; // Tenant boundary isolation
    }
    return ws;
  }

  public saveWorkspace(orgId: string, ws: OpportunityWorkspace): OpportunityWorkspace {
    // Ephemeral / Deterministic Test Call: NEVER write test data to the live database
    if (ws.isTestOpportunity || ws.isDeveloperTestMode || (ws as any).isEphemeralTest) {
      return {
        ...ws,
        organizationId: orgId,
        isTestOpportunity: true,
        isDeveloperTestMode: true
      };
    }

    const enriched: OpportunityWorkspace = {
      ...ws,
      organizationId: orgId,
      isDemo: orgId === 'org-demo-01'
    };
    this.db.workspaces[ws.id] = enriched;
    this.save();
    return enriched;
  }

  public deleteWorkspace(orgId: string, workspaceId: string): boolean {
    const ws = this.db.workspaces[workspaceId];
    if (!ws || (ws.organizationId || 'org-demo-01') !== orgId) {
      return false;
    }
    delete this.db.workspaces[workspaceId];
    this.save();
    return true;
  }

  // === Staff Invitation Methods ===
  public createInvitation(invitation: StaffInvitation): StaffInvitation {
    this.db.invitations[invitation.id] = invitation;
    this.save();
    return invitation;
  }

  public getInvitationByToken(token: string): StaffInvitation | null {
    return Object.values(this.db.invitations).find(i => i.token === token && i.status === 'Pending') || null;
  }

  public getInvitationsByOrg(orgId: string): StaffInvitation[] {
    return Object.values(this.db.invitations).filter(i => i.organizationId === orgId);
  }

  public updateInvitation(id: string, updates: Partial<StaffInvitation>): StaffInvitation | null {
    const inv = this.db.invitations[id];
    if (!inv) return null;
    this.db.invitations[id] = { ...inv, ...updates };
    this.save();
    return this.db.invitations[id];
  }

  // === Institutional Memory Methods ===
  public getMemoryByOrg(orgId: string): InstitutionalMemoryRecord[] {
    if (orgId === 'org-demo-01') {
      return Object.values(this.db.institutionalMemory).filter(m => (m.organizationId || 'org-demo-01') === 'org-demo-01');
    }
    return Object.values(this.db.institutionalMemory).filter(m => m.organizationId === orgId && !m.isDemo);
  }

  public saveMemoryRecord(orgId: string, record: InstitutionalMemoryRecord): InstitutionalMemoryRecord {
    const enriched: InstitutionalMemoryRecord = {
      ...record,
      organizationId: orgId,
      isDemo: orgId === 'org-demo-01'
    };
    this.db.institutionalMemory[record.id] = enriched;
    this.save();
    return enriched;
  }

  // === Staff Deactivation & Reassignment ===
  public deactivateStaffMember(orgId: string, staffId: string): { staff: StaffMember; openTasksCount: number; openTasks: WorkspaceTask[] } | null {
    const org = this.getOrg(orgId);
    if (!org) return null;

    let targetStaff: StaffMember | undefined;
    const updatedStaffDir = (org.staffDirectory || []).map(s => {
      if (s.id === staffId) {
        targetStaff = { ...s, status: 'Inactive' as const };
        return targetStaff;
      }
      return s;
    });

    if (!targetStaff) return null;

    // Update org profile
    org.staffDirectory = updatedStaffDir;
    this.saveOrg(org);

    // Update linked user account if exists
    const user = Object.values(this.db.users).find(u => u.organizationId === orgId && (u.staffId === staffId || u.email.toLowerCase() === targetStaff?.email.toLowerCase()));
    if (user) {
      user.status = 'Inactive';
      this.updateUser(user.id, { status: 'Inactive' });
    }

    // Find open tasks assigned to this staff member across all org workspaces
    const orgWorkspaces = this.getWorkspacesByOrg(orgId);
    const openTasks: WorkspaceTask[] = [];

    orgWorkspaces.forEach(ws => {
      (ws.tasks || []).forEach(t => {
        if (!t.completed && (t.assignedStaffId === staffId || t.assignedTo === targetStaff?.fullName)) {
          openTasks.push(t);
        }
      });
    });

    return {
      staff: targetStaff,
      openTasksCount: openTasks.length,
      openTasks
    };
  }

  // === Opportunity Scout Methods ===
  public getScoutedOpportunitiesByOrg(orgId: string): ScoutedOpportunity[] {
    if (!this.db.scoutedOpportunities) {
      this.db.scoutedOpportunities = {};
    }
    return Object.values(this.db.scoutedOpportunities).filter(
      o => (o.orgId || 'org-demo-01') === orgId
    );
  }

  public getScoutedOpportunityById(orgId: string, id: string): ScoutedOpportunity | null {
    if (!this.db.scoutedOpportunities) this.db.scoutedOpportunities = {};
    const opp = this.db.scoutedOpportunities[id];
    if (!opp || (opp.orgId || 'org-demo-01') !== orgId) return null;
    return opp;
  }

  public saveScoutedOpportunity(orgId: string, opp: ScoutedOpportunity): ScoutedOpportunity {
    if (!this.db.scoutedOpportunities) this.db.scoutedOpportunities = {};
    const enriched: ScoutedOpportunity = {
      ...opp,
      orgId
    };
    this.db.scoutedOpportunities[opp.id] = enriched;
    this.save();
    return enriched;
  }

  public batchSaveScoutedOpportunities(orgId: string, opps: ScoutedOpportunity[]): ScoutedOpportunity[] {
    if (!this.db.scoutedOpportunities) this.db.scoutedOpportunities = {};
    const saved: ScoutedOpportunity[] = [];
    opps.forEach(opp => {
      const enriched: ScoutedOpportunity = {
        ...opp,
        orgId
      };
      this.db.scoutedOpportunities[opp.id] = enriched;
      saved.push(enriched);
    });
    this.save();
    return saved;
  }

  public updateScoutedOpportunityStatus(
    orgId: string,
    id: string,
    status: ScoutOpportunityLifecycleStatus,
    dismissalReason?: DismissalReason,
    dismissalNotes?: string
  ): ScoutedOpportunity | null {
    if (!this.db.scoutedOpportunities) this.db.scoutedOpportunities = {};
    const opp = this.db.scoutedOpportunities[id];
    if (!opp || (opp.orgId || 'org-demo-01') !== orgId) return null;

    opp.status = status;
    if (dismissalReason) opp.dismissalReason = dismissalReason;
    if (dismissalNotes) opp.dismissalNotes = dismissalNotes;

    // If dismissed, also record to dismissal history for intelligence retention
    if (status === 'Dismissed' && dismissalReason) {
      this.recordDismissal(orgId, {
        id: `dsm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        orgId,
        sourceUrl: opp.sourceUrl,
        donor: opp.donor,
        title: opp.title,
        reason: dismissalReason,
        notes: dismissalNotes,
        timestamp: new Date().toISOString()
      });
    }

    this.save();
    return opp;
  }

  // === Scout Activity Logs ===
  public getScoutActivityLogsByOrg(orgId: string): ScoutActivityLog[] {
    if (!this.db.scoutActivityLogs) this.db.scoutActivityLogs = {};
    return Object.values(this.db.scoutActivityLogs)
      .filter(l => (l.orgId || 'org-demo-01') === orgId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public saveScoutActivityLog(orgId: string, log: ScoutActivityLog): ScoutActivityLog {
    if (!this.db.scoutActivityLogs) this.db.scoutActivityLogs = {};
    const enriched: ScoutActivityLog = {
      ...log,
      orgId
    };
    this.db.scoutActivityLogs[log.id] = enriched;
    this.save();
    return enriched;
  }

  // === Scout Job Configuration ===
  public getScoutConfigByOrg(orgId: string): ScoutJobConfig {
    if (!this.db.scoutConfigs) this.db.scoutConfigs = {};
    const existing = this.db.scoutConfigs[orgId];
    if (existing) return existing;

    const defaultConfig: ScoutJobConfig = {
      orgId,
      scheduleCadence: 'Daily',
      enabled: true,
      lastRunAt: undefined,
      nextRunAt: new Date(Date.now() + 3600000 * 24).toISOString()
    };
    this.db.scoutConfigs[orgId] = defaultConfig;
    this.save();
    return defaultConfig;
  }

  public saveScoutConfig(orgId: string, config: Partial<ScoutJobConfig>): ScoutJobConfig {
    if (!this.db.scoutConfigs) this.db.scoutConfigs = {};
    const current = this.getScoutConfigByOrg(orgId);
    const updated: ScoutJobConfig = {
      ...current,
      ...config,
      orgId
    };
    this.db.scoutConfigs[orgId] = updated;
    this.save();
    return updated;
  }

  // === Dismissal History ===
  public recordDismissal(orgId: string, record: DismissalRecord): DismissalRecord {
    if (!this.db.dismissalHistory) this.db.dismissalHistory = {};
    this.db.dismissalHistory[record.id] = {
      ...record,
      orgId
    };
    this.save();
    return record;
  }

  public getDismissalsByOrg(orgId: string): DismissalRecord[] {
    if (!this.db.dismissalHistory) this.db.dismissalHistory = {};
    return Object.values(this.db.dismissalHistory).filter(d => (d.orgId || 'org-demo-01') === orgId);
  }

  // === Data Management & Admin Deletion Controls ===
  public clearOrgData(orgId: string, preserveAdminUserId?: string): OrgProfile | null {
    const org = this.db.organizations[orgId];
    if (!org) return null;

    // 1. Delete all workspaces for this org
    if (this.db.workspaces) {
      for (const [id, ws] of Object.entries(this.db.workspaces)) {
        if ((ws as any).organizationId === orgId) {
          delete this.db.workspaces[id];
        }
      }
    }

    // 2. Delete all institutional memory records for this org
    if (this.db.institutionalMemory) {
      for (const [id, rec] of Object.entries(this.db.institutionalMemory)) {
        if ((rec as any).organizationId === orgId) {
          delete this.db.institutionalMemory[id];
        }
      }
    }

    // 3. Delete all scouted opportunities for this org
    if (this.db.scoutedOpportunities) {
      for (const [id, opp] of Object.entries(this.db.scoutedOpportunities)) {
        if (opp.orgId === orgId) {
          delete this.db.scoutedOpportunities[id];
        }
      }
    }

    // 4. Delete all scout activity logs for this org
    if (this.db.scoutActivityLogs) {
      for (const [id, log] of Object.entries(this.db.scoutActivityLogs)) {
        if (log.orgId === orgId) {
          delete this.db.scoutActivityLogs[id];
        }
      }
    }

    // 5. Delete all dismissal records for this org
    if (this.db.dismissalHistory) {
      for (const [id, dis] of Object.entries(this.db.dismissalHistory)) {
        if (dis.orgId === orgId) {
          delete this.db.dismissalHistory[id];
        }
      }
    }

    // 6. Delete all staff invitations for this org
    if (this.db.invitations) {
      for (const [id, inv] of Object.entries(this.db.invitations)) {
        if (inv.organizationId === orgId) {
          delete this.db.invitations[id];
        }
      }
    }

    // 7. Delete non-admin users for this org (preserve admin user if specified)
    if (this.db.users) {
      for (const [id, user] of Object.entries(this.db.users)) {
        if (user.organizationId === orgId) {
          if (preserveAdminUserId && user.id === preserveAdminUserId) {
            continue;
          }
          if (user.role !== 'Admin' && (!user.roles || !user.roles.includes('Admin'))) {
            delete this.db.users[id];
          }
        }
      }
    }

    // 8. Clean organisation profile operational and metadata fields
    const cleanedOrg: OrgProfile = {
      ...org,
      thematicAreas: [],
      departments: [],
      staffDirectory: [],
      staffCount: 0,
      documentLibrary: [],
      previousDonors: [],
      description: '',
      yearEstablished: 0,
      registrationStatus: '',
      orgType: '',
      annualBudgetRange: '',
      annualBudgetUsdEstimate: 0,
      meCapacity: '',
      onboardingComplete: false,
      fundingPreferences: {
        thematicAreas: [],
        geographicEligibility: [],
        beneficiaryGroups: [],
        orgType: '',
        preferredFundingMin: '',
        preferredFundingMax: '',
        minUsefulGrantSize: '',
        preferredProjectDuration: '',
        preferredDonorTypes: [],
        fundingTypes: [],
        keywords: [],
        excludedSectors: [],
        excludedCountries: [],
        acceptsConsortium: false
      },
      updatedAt: new Date().toISOString()
    };

    this.db.organizations[orgId] = cleanedOrg;
    this.save();
    return cleanedOrg;
  }

  public deleteOrg(orgId: string): boolean {
    const org = this.db.organizations[orgId];
    if (!org) return false;

    // 1. Delete all operational data for this org
    if (this.db.workspaces) {
      for (const [id, ws] of Object.entries(this.db.workspaces)) {
        if ((ws as any).organizationId === orgId) {
          delete this.db.workspaces[id];
        }
      }
    }

    if (this.db.institutionalMemory) {
      for (const [id, rec] of Object.entries(this.db.institutionalMemory)) {
        if ((rec as any).organizationId === orgId) {
          delete this.db.institutionalMemory[id];
        }
      }
    }

    if (this.db.scoutedOpportunities) {
      for (const [id, opp] of Object.entries(this.db.scoutedOpportunities)) {
        if (opp.orgId === orgId) {
          delete this.db.scoutedOpportunities[id];
        }
      }
    }

    if (this.db.scoutActivityLogs) {
      for (const [id, log] of Object.entries(this.db.scoutActivityLogs)) {
        if (log.orgId === orgId) {
          delete this.db.scoutActivityLogs[id];
        }
      }
    }

    if (this.db.scoutConfigs) {
      delete this.db.scoutConfigs[orgId];
    }

    if (this.db.dismissalHistory) {
      for (const [id, dis] of Object.entries(this.db.dismissalHistory)) {
        if (dis.orgId === orgId) {
          delete this.db.dismissalHistory[id];
        }
      }
    }

    if (this.db.invitations) {
      for (const [id, inv] of Object.entries(this.db.invitations)) {
        if (inv.organizationId === orgId) {
          delete this.db.invitations[id];
        }
      }
    }

    if (this.db.emailDispatches) {
      for (const [id, record] of Object.entries(this.db.emailDispatches)) {
        if (record.organizationId === orgId) {
          delete this.db.emailDispatches[id];
        }
      }
    }

    // 2. Delete all users belonging to this org
    if (this.db.users) {
      for (const [id, user] of Object.entries(this.db.users)) {
        if (user.organizationId === orgId) {
          delete this.db.users[id];
        }
      }
    }

    // 3. Delete organisation entry
    delete this.db.organizations[orgId];

    this.save();
    return true;
  }
}

export const db = new Database();

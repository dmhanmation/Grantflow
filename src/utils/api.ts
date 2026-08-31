import {
  OrgProfile,
  OpportunityWorkspace,
  InstitutionalMemoryRecord,
  AppUser,
  StaffInvitation,
  AuthSessionResponse
} from '../types';

const TOKEN_STORAGE_KEY = 'grantflow_auth_token';
const ORG_STORAGE_KEY = 'grantflow_active_org_id';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (err) {
    console.error(err);
  }
}

export function getStoredOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredOrgId(orgId: string | null): void {
  try {
    if (orgId) {
      localStorage.setItem(ORG_STORAGE_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_STORAGE_KEY);
    }
  } catch (err) {
    console.error(err);
  }
}

function getHeaders(): HeadersInit {
  const token = getStoredToken();
  const orgId = getStoredOrgId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }
  return headers;
}

export const api = {
  // === Auth Endpoints ===
  async registerOrg(payload: {
    orgName: string;
    country: string;
    registrationStatus?: string;
    orgType?: string;
    thematicAreas?: string[];
    contactEmail?: string;
    adminFullName: string;
    adminEmail: string;
    adminPassword: string;
  }): Promise<AuthSessionResponse> {
    const res = await fetch('/api/auth/register-org', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed.');
    }
    const data: AuthSessionResponse = await res.json();
    setStoredToken(data.token);
    setStoredOrgId(data.organization.id);
    return data;
  },

  async login(email: string, password: string): Promise<AuthSessionResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed.');
    }
    const data: AuthSessionResponse = await res.json();
    setStoredToken(data.token);
    setStoredOrgId(data.organization.id);
    return data;
  },

  async demoLogin(options?: { email?: string; staffId?: string; role?: string }): Promise<AuthSessionResponse> {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(options || {})
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Demo login failed.');
    }
    const data: AuthSessionResponse = await res.json();
    setStoredToken(data.token);
    setStoredOrgId(data.organization.id);
    return data;
  },

  async getMe(): Promise<{ user: AppUser | null; organization: OrgProfile | null }> {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders()
    });
    if (!res.ok) return { user: null, organization: null };
    return res.json();
  },

  logout(): void {
    setStoredToken(null);
    setStoredOrgId(null);
  },

  // === Org & Onboarding ===
  async saveOnboarding(payload: Partial<OrgProfile>): Promise<{ organization: OrgProfile }> {
    const res = await fetch('/api/org/onboarding', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save onboarding configuration.');
    }
    return res.json();
  },

  async getOrgProfile(): Promise<OrgProfile> {
    const res = await fetch('/api/org/profile', {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch organization profile.');
    return res.json();
  },

  async listOrgs(): Promise<OrgProfile[]> {
    try {
      const res = await fetch('/api/orgs', {
        headers: getHeaders()
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async updateOrgProfile(profile: Partial<OrgProfile>): Promise<OrgProfile> {
    const res = await fetch('/api/org/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to update organization profile.');
    return res.json();
  },

  async extractOrgProfile(payload: { documentName?: string; mimeType?: string; base64Data?: string; text?: string }): Promise<{
    organisationName?: string;
    country?: string;
    yearOfRegistration?: string;
    registrationNumberOrStatus?: string;
    organisationType?: string;
    thematicAreas?: string[];
  }> {
    const res = await fetch('/api/extract-org-profile', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to read the document.');
    }
    const json = await res.json();
    return json.data || {};
  },

  async clearOrgData(confirmationText: string): Promise<{ success: boolean; message: string; organization: OrgProfile }> {
    const res = await fetch('/api/org/clear-data', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ confirmationText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to clear organization data.');
    }
    return res.json();
  },

  async deleteOrg(confirmationText: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/org/delete-org', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ confirmationText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete organization.');
    }
    return res.json();
  },

  // === Staff Invitations ===
  async createInvitation(payload: {
    email: string;
    fullName: string;
    jobTitle?: string;
    departmentId?: string;
    role?: string;
    roles?: string[];
  }): Promise<{ invitation: StaffInvitation; inviteLink: string; emailDelivery?: { sent: boolean; skipped?: boolean; error?: string } }> {
    const res = await fetch('/api/invitations/create', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create staff invitation.');
    }
    return res.json();
  },

  async getInvitation(token: string): Promise<StaffInvitation> {
    const res = await fetch(`/api/invitations/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid or expired invitation.');
    }
    return res.json();
  },

  async acceptInvitation(payload: {
    token: string;
    password: string;
    fullName?: string;
  }): Promise<AuthSessionResponse> {
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to accept invitation.');
    }
    const data: AuthSessionResponse = await res.json();
    setStoredToken(data.token);
    setStoredOrgId(data.organization.id);
    return data;
  },

  async deactivateStaff(staffId: string): Promise<{ success: boolean; notice: string; openTasksCount: number }> {
    const res = await fetch('/api/org/staff/deactivate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ staffId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to deactivate staff member.');
    }
    return res.json();
  },

  // === Workspaces ===
  async getWorkspaces(): Promise<OpportunityWorkspace[]> {
    const res = await fetch('/api/workspaces', {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch workspaces.');
    return res.json();
  },

  async saveWorkspace(workspace: OpportunityWorkspace): Promise<OpportunityWorkspace> {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(workspace)
    });
    if (!res.ok) throw new Error('Failed to save workspace.');
    return res.json();
  },

  async updateWorkspace(workspace: OpportunityWorkspace): Promise<OpportunityWorkspace> {
    const res = await fetch(`/api/workspaces/${workspace.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(workspace)
    });
    if (!res.ok) throw new Error('Failed to update workspace.');
    return res.json();
  },

  async deleteWorkspace(id: string): Promise<boolean> {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.ok;
  },

  // === Institutional Memory ===
  async getInstitutionalMemory(): Promise<InstitutionalMemoryRecord[]> {
    const res = await fetch('/api/institutional-memory', {
      headers: getHeaders()
    });
    if (!res.ok) return [];
    return res.json();
  },

  async saveInstitutionalMemory(record: InstitutionalMemoryRecord): Promise<InstitutionalMemoryRecord> {
    const res = await fetch('/api/institutional-memory', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('Failed to save memory record.');
    return res.json();
  }
};

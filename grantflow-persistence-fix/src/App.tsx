import React, { useState, useEffect, useRef } from 'react';
import { OrgProfile, OpportunityWorkspace, InstitutionalMemoryRecord, AppUser, UserRole, ScoutedOpportunity } from './types';
import { sanitizeOpportunityWorkspace } from './utils/dateUtils';
import { api, getStoredToken, getStoredOrgId, setStoredOrgId } from './utils/api';
import { sortStaffByHierarchy } from './utils/staffHierarchy';
import { DashboardView } from './components/DashboardView';
import { AnalyseFundingCallView } from './components/AnalyseFundingCallView';
import { OpportunityScoutView } from './components/OpportunityScoutView';
import { WorkspaceView } from './components/WorkspaceView';
import { OrgProfileView } from './components/OrgProfileView';
import { InstitutionalMemoryView } from './components/InstitutionalMemoryView';
import { NotificationCenter } from './components/NotificationCenter';
import { WorkspacesListView } from './components/WorkspacesListView';
import { AuthModal } from './components/AuthModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import {
  Sparkles,
  LayoutDashboard,
  FileSearch,
  FolderGit2,
  BookOpen,
  Building2,
  Plus,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  User,
  Users,
  LogOut,
  LogIn,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  Compass,
  Settings,
  Check
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scout' | 'analyze' | 'workspaces' | 'memory' | 'profile'>('dashboard');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [targetWorkspaceTab, setTargetWorkspaceTab] = useState<string | undefined>(undefined);
  const [targetTaskId, setTargetTaskId] = useState<string | undefined>(undefined);
  const [targetProfileTab, setTargetProfileTab] = useState<string | undefined>(undefined);
  const [scoutOpportunityToPursue, setScoutOpportunityToPursue] = useState<ScoutedOpportunity | null>(null);

  // Authentication & Tenant State
  // Default Clean Slate User & Profile
  const defaultAdminUser: AppUser = {
    id: 'user-admin-01',
    email: '',
    fullName: 'Organisation Admin',
    organizationId: 'org-main-01',
    organizationName: '',
    role: 'Admin',
    roles: ['Admin'],
    departmentId: undefined,
    departmentName: '',
    staffId: 'staff-admin-01',
    jobTitle: 'Organisation Admin',
    status: 'Active',
    isDemoUser: false,
    createdAt: new Date().toISOString()
  };

  const cleanSlateOrgProfile: OrgProfile = {
    id: 'org-main-01',
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
    adminEmail: '',
    contactEmail: '',
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

  // Cache-buster: only clear non-auth localStorage keys on version change.
  // Auth token and org ID must never be wiped here or the server cannot
  // recognise the session and all saved workspaces appear lost.
  const CLEAN_SLATE_VERSION = 'grantflow_clean_slate_2026_v10';
  try {
    const activeVersion = localStorage.getItem('grantflow_clean_slate_version');
    if (activeVersion !== CLEAN_SLATE_VERSION) {
      const PRESERVE = new Set([
        'grantflow_auth_token',
        'grantflow_active_org_id',
        'grantflow_current_user',
        'grantflow_org_profile',
        'grantflow_clean_slate_version'
      ]);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('grantflow_') && !PRESERVE.has(k)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.setItem('grantflow_clean_slate_version', CLEAN_SLATE_VERSION);
    }
  } catch (e) {
    console.error('Error during clean slate localStorage purge:', e);
  }

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    try {
      const saved = localStorage.getItem('grantflow_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          return parsed;
        }
      }
      return defaultAdminUser;
    } catch {
      return defaultAdminUser;
    }
  });

  const [orgProfile, setOrgProfile] = useState<OrgProfile>(() => {
    try {
      const saved = localStorage.getItem('grantflow_org_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          // Always keep the org ID in sync so API calls carry the right header
          setStoredOrgId(parsed.id);
          return {
            ...cleanSlateOrgProfile,
            ...parsed,
            thematicAreas: Array.isArray(parsed.thematicAreas) ? parsed.thematicAreas : [],
            geographicAreas: Array.isArray(parsed.geographicAreas) ? parsed.geographicAreas : [],
            staffDirectory: Array.isArray(parsed.staffDirectory) && parsed.staffDirectory.length > 0 ? parsed.staffDirectory : cleanSlateOrgProfile.staffDirectory,
            documentLibrary: Array.isArray(parsed.documentLibrary) ? parsed.documentLibrary : [],
            departments: Array.isArray(parsed.departments) ? parsed.departments : [],
            fundingPreferences: parsed.fundingPreferences || cleanSlateOrgProfile.fundingPreferences
          };
        }
      }
      return cleanSlateOrgProfile;
    } catch {
      return cleanSlateOrgProfile;
    }
  });

  const [opportunities, setOpportunities] = useState<OpportunityWorkspace[]>(() => {
    try {
      const orgSaved = localStorage.getItem('grantflow_org_profile');
      const org = orgSaved ? JSON.parse(orgSaved) : null;
      if (org && org.id) {
        const saved = localStorage.getItem(`grantflow_opportunities_${org.id}`);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  const [institutionalMemory, setInstitutionalMemory] = useState<InstitutionalMemoryRecord[]>(() => {
    try {
      const orgSaved = localStorage.getItem('grantflow_org_profile');
      const org = orgSaved ? JSON.parse(orgSaved) : null;
      if (org && org.id) {
        const saved = localStorage.getItem(`grantflow_memory_${org.id}`);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // UI Modals & Developer State
  const [isDeveloperModeEnabled, setIsDeveloperModeEnabled] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('dev') === 'true' || localStorage.getItem('grantflow_dev_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [availableOrgs, setAvailableOrgs] = useState<OrgProfile[]>([]);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch available orgs on startup and when active org changes
  useEffect(() => {
    api.listOrgs().then(orgs => {
      if (Array.isArray(orgs) && orgs.length > 0) {
        setAvailableOrgs(orgs);
      }
    }).catch(err => {
      console.error('Failed to load org list:', err);
    });
  }, [orgProfile.id, showUserDropdown]);

  // Click outside listener to close user dropdown
  useEffect(() => {
    if (!showUserDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('grantflow_current_user', JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('grantflow_org_profile', JSON.stringify(orgProfile));
      // Keep org ID in sync so API auth never breaks after a profile update
      if (orgProfile.id) setStoredOrgId(orgProfile.id);
    } catch (e) {
      console.error(e);
    }
  }, [orgProfile]);

  useEffect(() => {
    try {
      if (orgProfile && orgProfile.id) {
        localStorage.setItem(`grantflow_opportunities_${orgProfile.id}`, JSON.stringify(opportunities));
      }
    } catch (e) {
      console.error(e);
    }
  }, [opportunities, orgProfile.id]);

  useEffect(() => {
    try {
      if (orgProfile && orgProfile.id) {
        localStorage.setItem(`grantflow_memory_${orgProfile.id}`, JSON.stringify(institutionalMemory));
      }
    } catch (e) {
      console.error(e);
    }
  }, [institutionalMemory, orgProfile.id]);

  // Load tenant workspaces & memory when active organisation changes
  useEffect(() => {
    if (orgProfile && orgProfile.id) {
      api.getWorkspaces().then(wsList => {
        setOpportunities(Array.isArray(wsList) ? wsList : []);
      }).catch(() => {
        const saved = localStorage.getItem(`grantflow_opportunities_${orgProfile.id}`);
        setOpportunities(saved ? JSON.parse(saved) : []);
      });

      api.getInstitutionalMemory().then(memList => {
        setInstitutionalMemory(Array.isArray(memList) ? memList : []);
      }).catch(() => {
        const saved = localStorage.getItem(`grantflow_memory_${orgProfile.id}`);
        setInstitutionalMemory(saved ? JSON.parse(saved) : []);
      });
    } else {
      setOpportunities([]);
      setInstitutionalMemory([]);
    }
  }, [orgProfile.id]);

  const isDemo = false;

  // Handlers
  const handleAuthSuccess = (user: AppUser, org: OrgProfile, token: string) => {
    setCurrentUser(user);
    setOrgProfile(org);
    setShowAuthModal(false);
    setOpportunities([]);
    setInstitutionalMemory([]);
    setShowOnboarding(!org.onboardingComplete);
    setActiveTab('dashboard');
    setSelectedWorkspaceId(null);
  };

  const handleOnboardingComplete = async (completedProfile: OrgProfile) => {
    try {
      const res = await api.saveOnboarding(completedProfile);
      setOrgProfile(res.organization);
      setShowOnboarding(false);
      setOpportunities([]); // Clean start for real NGO
      setInstitutionalMemory([]);
      setActiveTab('dashboard');
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setOrgProfile(completedProfile);
      setShowOnboarding(false);
      setOpportunities([]);
      setInstitutionalMemory([]);
      setActiveTab('dashboard');
    }
  };

  const handleSaveProfile = (updated: OrgProfile) => {
    setOrgProfile(updated);
    api.updateOrgProfile(updated).catch(console.error);
  };

  const handleSelectWorkspace = (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => {
    setSelectedWorkspaceId(workspace.id);
    setTargetWorkspaceTab(targetTab || 'overview');
    setTargetTaskId(taskId);
    setActiveTab('workspaces');
  };

  const handleUpdateWorkspace = (updated: OpportunityWorkspace) => {
    setOpportunities(prev =>
      prev.map(opp => (opp.id === updated.id ? updated : opp))
    );
    api.updateWorkspace(updated).catch(console.error);

    // If an outcome was recorded, sync to institutional memory
    if (updated.outcomeRecord && (updated.stage === 'Awarded' || updated.stage === 'Rejected')) {
      const alreadyExists = institutionalMemory.some(
        m => m.opportunityTitle === updated.title && m.donor === updated.donor
      );
      if (!alreadyExists) {
        const newMemory: InstitutionalMemoryRecord = {
          id: `mem-${Date.now()}`,
          donor: updated.donor,
          opportunityTitle: updated.title,
          year: new Date().getFullYear(),
          amountRequested: updated.fundingAmount,
          outcome: updated.stage,
          amountAwarded: updated.outcomeRecord.grantAmountAwarded,
          leadPerson: updated.leadStaff || 'Grants Officer',
          feedbackNotes: updated.outcomeRecord.feedbackNotes || 'No notes recorded',
          keyLearnings: `Logged upon completing proposal cycle for ${updated.title}.`,
          attachments: []
        };
        setInstitutionalMemory(prev => [newMemory, ...prev]);
        api.saveInstitutionalMemory(newMemory).catch(console.error);
      }
    }
  };

  const handlePursueOpportunity = (newWorkspace: OpportunityWorkspace) => {
    const isTest = Boolean(newWorkspace.isTestOpportunity || newWorkspace.isDeveloperTestMode || (newWorkspace as any).isEphemeralTest);
    const enriched: OpportunityWorkspace = {
      ...newWorkspace,
      organizationId: orgProfile.id,
      isDemo: isDemo,
      isTestOpportunity: isTest,
      isDeveloperTestMode: isTest
    };
    if (isTest) {
      // In-memory test mode: do NOT write test data into the live database
      setOpportunities([enriched]);
    } else {
      setOpportunities(prev => [enriched, ...prev.filter(o => !o.isTestOpportunity)]);
      api.saveWorkspace(enriched).catch(console.error);
    }
    setSelectedWorkspaceId(enriched.id);
    setActiveTab('workspaces');
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    setOpportunities(prev => prev.filter(opp => opp.id !== workspaceId));
    if (selectedWorkspaceId === workspaceId) {
      setSelectedWorkspaceId(null);
      setTargetWorkspaceTab(undefined);
      setTargetTaskId(undefined);
    }
    api.deleteWorkspace(workspaceId).catch(console.error);
  };

  const handlePursueScoutedCandidate = (candidate: ScoutedOpportunity) => {
    setScoutOpportunityToPursue(candidate);
    setActiveTab('analyze');
    setSelectedWorkspaceId(null);
  };

  const handleAddMemoryRecord = (newRecord: InstitutionalMemoryRecord) => {
    setInstitutionalMemory(prev => [newRecord, ...prev]);
    api.saveInstitutionalMemory(newRecord).catch(console.error);
  };

  const handleClearOrgData = async (confirmationText: string) => {
    const res = await api.clearOrgData(confirmationText);
    if (res && res.success) {
      // 1. Reset operational state
      setOpportunities([]);
      setInstitutionalMemory([]);
      setSelectedWorkspaceId(null);
      setTargetWorkspaceTab(undefined);
      setTargetTaskId(undefined);
      setScoutOpportunityToPursue(null);
      setOrgProfile(res.organization);

      // 2. Clear local storage caches for this organisation
      try {
        localStorage.removeItem(`grantflow_opportunities_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_memory_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_scout_activity_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_dismissals_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_scout_config_${orgProfile.id}`);
      } catch (err) {
        console.error('Failed to clean local storage keys:', err);
      }

      // 3. Redirect to genuinely empty Dashboard
      setActiveTab('dashboard');
    }
  };

  const handleDeleteOrg = async (confirmationText: string) => {
    const res = await api.deleteOrg(confirmationText);
    if (res && res.success) {
      // 1. Clear local storage and tokens
      try {
        localStorage.removeItem(`grantflow_opportunities_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_memory_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_scout_activity_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_dismissals_${orgProfile.id}`);
        localStorage.removeItem(`grantflow_scout_config_${orgProfile.id}`);
      } catch (err) {
        console.error('Failed to clean local storage keys:', err);
      }

      api.logout();

      // 2. Reset full app state
      setOpportunities([]);
      setInstitutionalMemory([]);
      setSelectedWorkspaceId(null);
      setTargetWorkspaceTab(undefined);
      setTargetTaskId(undefined);
      setScoutOpportunityToPursue(null);
      setCurrentUser(defaultAdminUser);
      setOrgProfile(cleanSlateOrgProfile);

      // 3. Sign out and return to account creation / sign-in screen
      setAuthModalTab('login');
      setShowAuthModal(true);
      setActiveTab('dashboard');
    }
  };

  const currentWorkspace = opportunities.find(o => o.id === selectedWorkspaceId) || opportunities[0];

  const isTestModeActive = Boolean(
    opportunities.some(o => o.isTestOpportunity || o.isDeveloperTestMode) ||
    currentWorkspace?.isTestOpportunity ||
    currentWorkspace?.isDeveloperTestMode
  );

  // If onboarding is active for a newly registered real organization
  if (showOnboarding) {
    return (
      <OnboardingWizard
        initialProfile={orgProfile}
        adminUser={{ fullName: currentUser.fullName, email: currentUser.email }}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col overflow-x-hidden w-full max-w-full">
      {/* Top Persistent TEST MODE Banner (Only visible when explicit developer test flag is enabled) */}
      {isDeveloperModeEnabled && isTestModeActive && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black shadow-xs flex items-center justify-between gap-2 border-b border-amber-500">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-950 text-amber-400 rounded text-[10px] uppercase tracking-wider font-black">
              TEST MODE
            </span>
            <span>TEST MODE — AI and live web services disabled</span>
          </div>
          <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 border border-amber-400 rounded text-[10px] font-black uppercase tracking-wider">
            TEST DATA
          </span>
        </div>
      )}

      {/* Top DEMO DATA Banner */}
      {isDemo && !isTestModeActive && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-amber-600">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-950 text-white rounded text-[10px] uppercase tracking-wider font-black">
              DEMO DATA
            </span>
            <span>
              Viewing <strong>{orgProfile.name}</strong> sample workspace.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setAuthModalTab('register');
                setShowAuthModal(true);
              }}
              className="px-3 py-1 bg-amber-950 hover:bg-black text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              Create Organisation Account
            </button>
            <button
              onClick={() => {
                setAuthModalTab('login');
                setShowAuthModal(true);
              }}
              className="text-amber-950 hover:underline text-xs font-semibold"
            >
              Sign In
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & Product Brand */}
            <div
              className="flex items-center gap-3 cursor-pointer shrink-0"
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedWorkspaceId(null);
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 whitespace-nowrap">
                    GrantFlow Agent
                  </span>
                  {isDemo && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                      Demo Org
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block whitespace-nowrap">
                  Automating grant analysis, eligibility & proposal readiness
                </p>
              </div>
            </div>

            {/* Middle Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                id="nav-dashboard-btn"
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedWorkspaceId(null);
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                id="nav-scout-btn"
                onClick={() => {
                  setActiveTab('scout');
                  setSelectedWorkspaceId(null);
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'scout'
                    ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Opportunity Scout</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'scout' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  AI
                </span>
              </button>

              <button
                id="nav-workspaces-btn"
                onClick={() => {
                  setActiveTab('workspaces');
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'workspaces'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                Workspaces ({opportunities.length})
              </button>

              <button
                id="nav-memory-btn"
                onClick={() => {
                  setActiveTab('memory');
                  setSelectedWorkspaceId(null);
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'memory'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Institutional Memory
              </button>

              {(orgProfile.departments?.length || 0) === 0 && activeTab !== 'profile' && (
                <div className="hidden sm:flex items-center gap-1 pl-1 pr-0.5 text-amber-600 animate-pulse select-none" aria-hidden="true">
                  <span className="text-[11px] font-bold whitespace-nowrap">Start here</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}

              <button
                id="nav-profile-btn"
                onClick={() => {
                  setActiveTab('profile');
                  setSelectedWorkspaceId(null);
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : (orgProfile.departments?.length || 0) === 0
                    ? 'text-amber-700 bg-amber-50 ring-2 ring-amber-400 ring-offset-1 hover:bg-amber-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Org Profile
              </button>
            </nav>

            {/* Right Side: Notification Bell + Active User & Switcher + CTA */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <NotificationCenter
                opportunities={opportunities}
                onSelectWorkspace={handleSelectWorkspace}
              />

              {/* User Account / Role Switcher Pill */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  id="user-account-menu-button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer"
                  aria-expanded={showUserDropdown}
                  aria-haspopup="true"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="hidden lg:block">
                    <span className="text-xs font-bold text-slate-800 block truncate max-w-[130px] leading-tight">
                      {currentUser.fullName}
                    </span>
                    <span className="text-[10px] text-indigo-700 font-semibold block leading-tight">
                      {currentUser.jobTitle || currentUser.role || 'Admin'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in duration-100 space-y-3">
                    {/* Header with real user account info */}
                    <div className="px-2 py-2 border-b border-slate-100">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-slate-900 block font-bold truncate max-w-[170px]">{currentUser.fullName}</strong>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {currentUser.role || 'Admin'}
                        </span>
                      </div>
                      {currentUser.email ? (
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">{currentUser.email}</span>
                      ) : null}
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">{orgProfile.name}</span>
                        {orgProfile.country && <span className="text-slate-400 shrink-0">({orgProfile.country})</span>}
                      </div>
                    </div>

                    {/* Navigation Menu Options */}
                    <div className="space-y-0.5">
                      {/* Profile */}
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setActiveTab('profile');
                          setTargetProfileTab('staff');
                          setSelectedWorkspaceId(null);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <User className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">Profile</div>
                          <div className="text-[10px] text-slate-400 font-normal leading-tight">View personal profile & assignments</div>
                        </div>
                      </button>

                      {/* Organisation Settings */}
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setActiveTab('profile');
                          setTargetProfileTab('details');
                          setSelectedWorkspaceId(null);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <Settings className="w-4 h-4 text-slate-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">Organisation Settings</div>
                          <div className="text-[10px] text-slate-400 font-normal leading-tight">Profile, departments & governance</div>
                        </div>
                      </button>

                      {/* Account / Security */}
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          setActiveTab('profile');
                          setTargetProfileTab('policies');
                          setSelectedWorkspaceId(null);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 leading-tight">Account / Security</div>
                          <div className="text-[10px] text-slate-400 font-normal leading-tight">Credentials, policies & compliance</div>
                        </div>
                      </button>
                    </div>

                    {/* Switch Organisation (ONLY shown if multi-organisation access is explicitly enabled and > 1 organisation exists) */}
                    {(currentUser.isSuperAdmin || currentUser.hasMultiOrgAccess) && availableOrgs.length > 1 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
                          Switch Organisation
                        </span>
                        {availableOrgs.map(org => {
                          const isActive = org.id === orgProfile.id;
                          return (
                            <button
                              key={org.id}
                              onClick={() => {
                                setOrgProfile(org);
                                setStoredOrgId(org.id);
                                const firstStaff = org.staffDirectory?.[0];
                                const switchedUser: AppUser = {
                                  id: firstStaff?.userId || `user-${org.id}`,
                                  staffId: firstStaff?.id || `staff-${org.id}`,
                                  fullName: firstStaff?.fullName || 'Organisation Admin',
                                  email: firstStaff?.email || '',
                                  role: firstStaff?.role || 'Admin',
                                  roles: firstStaff?.roles || ['Admin'],
                                  organizationId: org.id,
                                  organizationName: org.name,
                                  jobTitle: firstStaff?.jobTitle || 'Executive Director / Admin',
                                  status: 'Active',
                                  isDemoUser: false,
                                  isSuperAdmin: currentUser.isSuperAdmin,
                                  hasMultiOrgAccess: currentUser.hasMultiOrgAccess,
                                  createdAt: new Date().toISOString()
                                };
                                setCurrentUser(switchedUser);
                                setShowUserDropdown(false);
                                setActiveTab('dashboard');
                                setSelectedWorkspaceId(null);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs flex items-center justify-between transition cursor-pointer ${
                                isActive ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{org.name}</span>
                              </div>
                              {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Switch View — lets Admin preview the app as any staff role */}
                    {(currentUser.role === 'Admin' || currentUser.roles?.includes('Admin')) && orgProfile.staffDirectory && orgProfile.staffDirectory.length > 1 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="px-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Switch View
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">See the app as another role</span>
                        </div>
                        {sortStaffByHierarchy(orgProfile.staffDirectory).map(staff => (
                          <button
                            key={staff.id}
                            onClick={() => {
                              setCurrentUser({
                                id: staff.userId || `user-${staff.id}`,
                                staffId: staff.id,
                                fullName: staff.fullName,
                                email: staff.email,
                                role: staff.role || staff.functionalRole || 'Officer',
                                roles: staff.roles || [staff.role || 'Officer'],
                                organizationId: orgProfile.id,
                                departmentName: staff.department,
                                isDemoUser: false,
                                isSuperAdmin: currentUser.isSuperAdmin,
                                hasMultiOrgAccess: currentUser.hasMultiOrgAccess
                              });
                              setShowUserDropdown(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs flex items-center justify-between cursor-pointer ${
                              currentUser.id === staff.userId || currentUser.staffId === staff.id ? 'bg-indigo-50/80 font-bold' : ''
                            }`}
                          >
                            <span className="font-semibold text-slate-800 truncate">{staff.fullName}</span>
                            <span className="text-[10px] text-indigo-700 font-bold ml-1">{staff.role || staff.functionalRole || 'Officer'}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer Actions: Register New Organisation (Platform Super Admins / Multi-Org Only) & Sign Out */}
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {(currentUser.isSuperAdmin || currentUser.hasMultiOrgAccess) && (
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            setAuthModalTab('register');
                            setShowAuthModal(true);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Register New Organisation</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          api.logout();
                          setShowUserDropdown(false);
                          setAuthModalTab('login');
                          setShowAuthModal(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                id="header-analyze-cta-btn"
                onClick={() => {
                  setActiveTab('analyze');
                  setSelectedWorkspaceId(null);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Analyse Call</span>
              </button>
            </div>
          </div>

          {/* Mobile Sub-Navigation Bar */}
          <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 gap-1 text-xs">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setSelectedWorkspaceId(null);
              }}
              className={`px-3 py-1 rounded font-medium shrink-0 ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab('scout');
                setSelectedWorkspaceId(null);
              }}
              className={`px-3 py-1 rounded font-medium shrink-0 ${activeTab === 'scout' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
            >
              Opportunity Scout
            </button>
            <button
              onClick={() => {
                setActiveTab('analyze');
                setSelectedWorkspaceId(null);
              }}
              className={`px-3 py-1 rounded font-medium shrink-0 ${activeTab === 'analyze' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
            >
              Analyse Call
            </button>
            <button
              onClick={() => {
                setActiveTab('workspaces');
              }}
              className={`px-3 py-1 rounded font-medium shrink-0 ${activeTab === 'workspaces' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              Workspaces ({opportunities.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('memory');
                setSelectedWorkspaceId(null);
              }}
              className={`px-3 py-1 rounded font-medium shrink-0 ${activeTab === 'memory' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              Memory
            </button>
            <button
              onClick={() => {
                setActiveTab('profile');
                setSelectedWorkspaceId(null);
              }}
              className={`px-3 py-1 rounded font-medium shrink-0 ${activeTab === 'profile' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      {/* Switch View return banner — shown when Admin has switched to an operational role view.
          Prevents getting stuck; always offers a way back to the Admin Setup Hub. */}
      {!(currentUser.role === 'Admin' || currentUser.roles?.includes('Admin')) && (
        <div className="bg-amber-500 text-white">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
            <span className="text-xs font-bold truncate">
              Switch View: Previewing as {currentUser.fullName} ({currentUser.role}). Operational dashboard only — Admin functions are in your own view.
            </span>
            <button
              type="button"
              onClick={() => {
                const adminStaff = orgProfile.staffDirectory?.find(
                  s => s.role === 'Admin' || s.roles?.includes('Admin')
                );
                if (adminStaff) {
                  setCurrentUser({
                    id: adminStaff.userId || `user-${adminStaff.id}`,
                    staffId: adminStaff.id,
                    fullName: adminStaff.fullName,
                    email: adminStaff.email,
                    role: 'Admin',
                    roles: ['Admin'],
                    organizationId: orgProfile.id,
                    departmentName: adminStaff.department,
                    isDemoUser: false,
                    isSuperAdmin: currentUser.isSuperAdmin,
                    hasMultiOrgAccess: currentUser.hasMultiOrgAccess
                  });
                } else {
                  setCurrentUser(defaultAdminUser);
                }
                setShowUserDropdown(false);
              }}
              className="px-3 py-1 text-xs font-bold bg-white text-amber-700 rounded-lg hover:bg-amber-50 shrink-0"
            >
              Return to Admin Hub
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            opportunities={opportunities}
            staffDirectory={orgProfile.staffDirectory || []}
            orgProfile={orgProfile}
            currentUser={currentUser}
            onSelectWorkspace={handleSelectWorkspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onNavigateToAnalyze={() => setActiveTab('analyze')}
            onNavigateToAccountability={() => {
              setActiveTab('workspaces');
              setSelectedWorkspaceId(null);
            }}
            onNavigateToProfile={tab => {
              setTargetProfileTab(tab);
              setActiveTab('profile');
              setSelectedWorkspaceId(null);
            }}
            onInviteStaff={() => {
              setTargetProfileTab('staff');
              setActiveTab('profile');
            }}
          />
        )}

        {activeTab === 'scout' && (
          <OpportunityScoutView
            orgProfile={orgProfile}
            onPursueOpportunity={handlePursueScoutedCandidate}
            onNavigateToOrgPreferences={() => {
              setTargetProfileTab('preferences');
              setActiveTab('profile');
            }}
            onOpenWorkspace={(wsId) => {
              setSelectedWorkspaceId(wsId);
              setActiveTab('workspaces');
            }}
          />
        )}

        {activeTab === 'analyze' && (
          <AnalyseFundingCallView
            orgProfile={orgProfile}
            onPursueOpportunity={handlePursueOpportunity}
            initialCandidate={scoutOpportunityToPursue}
            onClearInitialCandidate={() => setScoutOpportunityToPursue(null)}
            isDeveloperModeEnabled={isDeveloperModeEnabled}
          />
        )}

        {activeTab === 'workspaces' && (
          <>
            {selectedWorkspaceId && currentWorkspace ? (
              <WorkspaceView
                workspace={currentWorkspace}
                staffDirectory={orgProfile.staffDirectory || []}
                orgProfile={orgProfile}
                onUpdateWorkspace={handleUpdateWorkspace}
                onDeleteWorkspace={handleDeleteWorkspace}
                onBackToList={() => {
                  setSelectedWorkspaceId(null);
                  setTargetWorkspaceTab(undefined);
                  setTargetTaskId(undefined);
                }}
                initialTab={targetWorkspaceTab}
                highlightedTaskId={targetTaskId}
              />
            ) : (
              <WorkspacesListView
                opportunities={opportunities}
                onSelectWorkspace={handleSelectWorkspace}
                onNavigateToAnalyze={() => setActiveTab('analyze')}
                onDeleteWorkspace={handleDeleteWorkspace}
              />
            )}
          </>
        )}

        {activeTab === 'memory' && (
          <InstitutionalMemoryView
            records={institutionalMemory}
            onAddRecord={handleAddMemoryRecord}
          />
        )}

        {activeTab === 'profile' && (
          <OrgProfileView
            profile={orgProfile}
            currentUser={currentUser}
            onSaveProfile={handleSaveProfile}
            onClearOrgData={handleClearOrgData}
            onDeleteOrg={handleDeleteOrg}
            initialSubTab={targetProfileTab as any}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        defaultTab={authModalTab}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-800">GrantFlow Agent</span> — AI Grant Opportunity Management for Nonprofits & NGOs.
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Google Gemini</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

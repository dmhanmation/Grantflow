import React, { useState } from 'react';
import { OrgProfile, StaffMember, OpportunityWorkspace, OrgDocument, OrgDepartment, FundingPreferences, UserRole, AppUser } from '../types';
import { OrgDocumentLibrary } from './OrgDocumentLibrary';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import { api } from '../utils/api';
import { DepartmentManagement } from './DepartmentManagement';
import { StaffInvitationManager } from './StaffInvitationManager';
import { StructuredMultiSelect } from './StructuredMultiSelect';
import { StructuredSingleSelect } from './StructuredSingleSelect';
import { GeographicFootprintSelect } from './GeographicFootprintSelect';
import {
  STANDARD_THEMATIC_SECTORS,
  STANDARD_COUNTRIES,
  STANDARD_BENEFICIARY_GROUPS,
  STANDARD_ORG_CLASSIFICATIONS,
  STANDARD_DONOR_TYPES,
  STANDARD_FUNDING_INSTRUMENTS
} from '../data/taxonomyOptions';
import {
  Building2,
  Save,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Calendar,
  Award,
  ShieldCheck,
  FileCheck,
  Users,
  DollarSign,
  Plus,
  Edit2,
  UserCheck,
  ArrowRight,
  UserX,
  Mail,
  Briefcase,
  Layers,
  RefreshCw,
  X,
  Check,
  FolderLock,
  FileText,
  Upload,
  Sparkles,
  Clock,
  Download,
  ExternalLink,
  Shield,
  BadgeAlert,
  Landmark,
  FileSpreadsheet,
  Target,
  Compass,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert
} from 'lucide-react';

export type OrgProfileSubTab =
  | 'details'
  | 'preferences'
  | 'departments'
  | 'staff'
  | 'policies'
  | 'documents'
  | 'donors'
  | 'finance';

interface OrgProfileViewProps {
  profile: OrgProfile;
  opportunities?: OpportunityWorkspace[];
  currentUser?: AppUser;
  onSaveProfile: (profile: OrgProfile) => void;
  onUpdateOpportunities?: (opportunities: OpportunityWorkspace[]) => void;
  onClearOrgData?: (confirmationText: string) => Promise<void>;
  onDeleteOrg?: (confirmationText: string) => Promise<void>;
  initialSubTab?: OrgProfileSubTab;
}

export const OrgProfileView: React.FC<OrgProfileViewProps> = ({
  profile,
  opportunities = [],
  currentUser,
  onSaveProfile,
  onUpdateOpportunities,
  onClearOrgData,
  onDeleteOrg,
  initialSubTab = 'details'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<OrgProfileSubTab>(initialSubTab);
  const [formData, setFormData] = useState<OrgProfile>(profile);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  React.useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const isAdmin = Boolean(currentUser?.role === 'Admin' || currentUser?.roles?.includes('Admin'));

  // Clear Org Data Modal state
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataStep, setClearDataStep] = useState<1 | 2>(1);
  const [clearDataInput, setClearDataInput] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearDataError, setClearDataError] = useState<string | null>(null);

  // Delete Org Modal state
  const [showDeleteOrgModal, setShowDeleteOrgModal] = useState(false);
  const [deleteOrgStep, setDeleteOrgStep] = useState<1 | 2>(1);
  const [deleteOrgInput, setDeleteOrgInput] = useState('');
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [deleteOrgError, setDeleteOrgError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [thematicInput, setThematicInput] = useState('');
  const [geoInput, setGeoInput] = useState('');
  const [donorInput, setDonorInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isDemo = Boolean(profile.isDemo || profile.id === 'org-demo-01');

  // Dynamic Experience calculation from Founding Year
  const currentYear = new Date().getFullYear();
  const dynamicYearsExperience = profile.yearEstablished
    ? Math.max(0, currentYear - profile.yearEstablished)
    : (profile.yearsExperience || 0);

  // Profile completeness check
  const isProfileComplete = Boolean(
    profile.name &&
    profile.registrationStatus &&
    profile.orgType &&
    (profile.yearEstablished || profile.yearsExperience) &&
    profile.thematicAreas && profile.thematicAreas.length > 0 &&
    profile.geographicAreas && profile.geographicAreas.length > 0
  );

  // Document Library state
  const currentDocs = profile.documentLibrary || [];

  // Department Management state
  const departmentList: OrgDepartment[] = (profile.departments && profile.departments.length > 0)
    ? profile.departments
    : (formData.departments && formData.departments.length > 0 ? formData.departments : []);

  // Staff management state
  const staffList = profile.staffDirectory || [];

  // ---- Guided setup progress + auto-advance ----
  const getSetupStages = (p: OrgProfile): { key: OrgProfileSubTab; label: string; done: boolean }[] => ([
    { key: 'details', label: 'Organisation', done: Boolean(p.name && p.country && p.orgType) },
    { key: 'departments', label: 'Departments', done: (p.departments?.length || 0) > 0 },
    { key: 'staff', label: 'Staff', done: (p.staffDirectory || []).some(s => Boolean(s.departmentId)) },
    { key: 'staff', label: 'Governance', done: Boolean(p.defaultFinalApproverId) },
    { key: 'preferences', label: 'Funding Preferences', done: Boolean(p.fundingPreferences && (((p.fundingPreferences.thematicAreas?.length || 0) > 0) || ((p.fundingPreferences.geographicEligibility?.length || 0) > 0))) },
    { key: 'documents', label: 'Documents', done: (p.documentLibrary?.length || 0) > 0 }
  ]);
  const STAGE_ORDER: OrgProfileSubTab[] = ['details', 'departments', 'staff', 'preferences', 'documents'];
  const advanceToNextStage = (from: OrgProfileSubTab, savedProfile: OrgProfile) => {
    // Only pull the user forward while setup is still in progress.
    if (!getSetupStages(savedProfile).some(s => !s.done)) return;
    const i = STAGE_ORDER.indexOf(from);
    if (i >= 0 && i < STAGE_ORDER.length - 1) {
      setActiveSubTab(STAGE_ORDER[i + 1]);
    }
  };
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDeptFilter, setStaffDeptFilter] = useState('ALL');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Staff Modal Form fields
  const [staffFullName, setStaffFullName] = useState('');
  const [staffJobTitle, setStaffJobTitle] = useState('');
  const [staffDepartment, setStaffDepartment] = useState('');
  const [staffRole, setStaffRole] = useState<UserRole>('Officer');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffLineManager, setStaffLineManager] = useState('');
  const [staffStatus, setStaffStatus] = useState<'Active' | 'Inactive'>('Active');

  // Departure Reassignment Banner State
  const [departureNotice, setDepartureNotice] = useState<string | null>(null);

  // Funding Preferences State (auto-populated from Profile where available)
  const [prefThematics, setPrefThematics] = useState<string[]>(
    profile.fundingPreferences?.thematicAreas?.length
      ? profile.fundingPreferences.thematicAreas
      : profile.thematicAreas || []
  );
  const [prefGeos, setPrefGeos] = useState<string[]>(
    profile.fundingPreferences?.geographicEligibility?.length
      ? profile.fundingPreferences.geographicEligibility
      : profile.geographicAreas?.length
      ? profile.geographicAreas
      : profile.country
      ? [profile.country]
      : []
  );
  const [prefBeneficiaries, setPrefBeneficiaries] = useState<string[]>(
    profile.fundingPreferences?.beneficiaryGroups?.length
      ? profile.fundingPreferences.beneficiaryGroups
      : []
  );
  const [prefOrgType, setPrefOrgType] = useState<string>(
    profile.fundingPreferences?.orgType || profile.orgType || ''
  );
  const [prefMinFunding, setPrefMinFunding] = useState<string>(
    profile.fundingPreferences?.preferredFundingMin || ''
  );
  const [prefMaxFunding, setPrefMaxFunding] = useState<string>(
    profile.fundingPreferences?.preferredFundingMax || ''
  );
  const [prefMinUseful, setPrefMinUseful] = useState<string>(
    profile.fundingPreferences?.minUsefulGrantSize || ''
  );
  const [prefDuration, setPrefDuration] = useState<string>(
    profile.fundingPreferences?.preferredProjectDuration || ''
  );
  const [prefDonorTypes, setPrefDonorTypes] = useState<string[]>(
    profile.fundingPreferences?.preferredDonorTypes?.length
      ? profile.fundingPreferences.preferredDonorTypes
      : []
  );
  const [prefFundingTypes, setPrefFundingTypes] = useState<('grant' | 'challenge' | 'accelerator' | 'prize' | 'fellowship' | 'other')[]>(
    profile.fundingPreferences?.fundingTypes?.length
      ? profile.fundingPreferences.fundingTypes
      : []
  );
  const [prefKeywords, setPrefKeywords] = useState<string[]>(
    profile.fundingPreferences?.keywords || []
  );
  const [prefExcludedSectors, setPrefExcludedSectors] = useState<string[]>(
    profile.fundingPreferences?.excludedSectors || []
  );
  const [prefExcludedCountries, setPrefExcludedCountries] = useState<string[]>(
    profile.fundingPreferences?.excludedCountries || []
  );
  const [prefAcceptsConsortium, setPrefAcceptsConsortium] = useState<boolean>(
    profile.fundingPreferences?.acceptsConsortium ?? true
  );

  // Input states for preference tag additions
  const [newPrefThematic, setNewPrefThematic] = useState('');
  const [newPrefGeo, setNewPrefGeo] = useState('');
  const [newPrefBeneficiary, setNewPrefBeneficiary] = useState('');
  const [newPrefKeyword, setNewPrefKeyword] = useState('');
  const [newPrefExcludedSector, setNewPrefExcludedSector] = useState('');
  const [newPrefExcludedCountry, setNewPrefExcludedCountry] = useState('');

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPreferences: FundingPreferences = {
      thematicAreas: prefThematics,
      geographicEligibility: prefGeos,
      beneficiaryGroups: prefBeneficiaries,
      orgType: prefOrgType,
      preferredFundingMin: prefMinFunding,
      preferredFundingMax: prefMaxFunding,
      minUsefulGrantSize: prefMinUseful,
      preferredProjectDuration: prefDuration,
      preferredDonorTypes: prefDonorTypes,
      fundingTypes: prefFundingTypes,
      keywords: prefKeywords,
      excludedSectors: prefExcludedSectors,
      excludedCountries: prefExcludedCountries,
      acceptsConsortium: prefAcceptsConsortium
    };

    const updatedProfile: OrgProfile = {
      ...formData,
      fundingPreferences: updatedPreferences,
      updatedAt: new Date().toISOString()
    };

    setFormData(updatedProfile);
    onSaveProfile(updatedProfile);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    advanceToNextStage('preferences', updatedProfile);
  };

  const expectedOrgConfirm = profile.name && profile.name.trim().length > 0 ? profile.name.trim() : 'DELETE ORGANISATION';

  const handleOpenClearData = () => {
    setClearDataStep(1);
    setClearDataInput('');
    setClearDataError(null);
    setShowClearDataModal(true);
  };

  const handleExecuteClearData = async () => {
    if (!onClearOrgData) return;
    try {
      setIsClearingData(true);
      setClearDataError(null);
      await onClearOrgData('DELETE ALL DATA');
      setShowClearDataModal(false);
    } catch (err: any) {
      setClearDataError(err.message || 'Failed to clear organisation data.');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleOpenDeleteOrg = () => {
    setDeleteOrgStep(1);
    setDeleteOrgInput('');
    setDeleteOrgError(null);
    setShowDeleteOrgModal(true);
  };

  const handleExecuteDeleteOrg = async () => {
    if (!onDeleteOrg) return;
    try {
      setIsDeletingOrg(true);
      setDeleteOrgError(null);
      await onDeleteOrg(expectedOrgConfirm);
      setShowDeleteOrgModal(false);
    } catch (err: any) {
      setDeleteOrgError(err.message || 'Failed to delete organisation.');
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleChange = (field: keyof OrgProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddThematic = () => {
    if (thematicInput.trim()) {
      setFormData(prev => ({
        ...prev,
        thematicAreas: [...prev.thematicAreas, thematicInput.trim()]
      }));
      setThematicInput('');
    }
  };

  const handleRemoveThematic = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      thematicAreas: prev.thematicAreas.filter((_, i) => i !== idx)
    }));
  };

  const handleAddGeo = () => {
    if (geoInput.trim()) {
      setFormData(prev => ({
        ...prev,
        geographicAreas: [...prev.geographicAreas, geoInput.trim()]
      }));
      setGeoInput('');
    }
  };

  const handleRemoveGeo = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      geographicAreas: prev.geographicAreas.filter((_, i) => i !== idx)
    }));
  };

  const handleAddDonor = () => {
    if (donorInput.trim()) {
      setFormData(prev => ({
        ...prev,
        previousDonors: [...prev.previousDonors, donorInput.trim()]
      }));
      setDonorInput('');
    }
  };

  const handleRemoveDonor = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      previousDonors: prev.previousDonors.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = { ...formData, updatedAt: new Date().toISOString() };
    onSaveProfile(saved);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    advanceToNextStage('details', saved);
  };

  // Handler for updating documents in Document Library
  const handleUpdateDocuments = (updatedDocs: OrgDocument[]) => {
    const updatedProfile: OrgProfile = {
      ...profile,
      documentLibrary: updatedDocs,
      updatedAt: new Date().toISOString()
    };
    onSaveProfile(updatedProfile);
    setFormData(updatedProfile);
  };

  // Handler for updating departments and linked staff
  const handleUpdateDepartments = (updatedDepts: OrgDepartment[], updatedStaff?: StaffMember[]) => {
    const newStaffDirectory = updatedStaff || staffList;
    const updatedProfile: OrgProfile = {
      ...profile,
      departments: updatedDepts,
      staffDirectory: newStaffDirectory,
      staffCount: newStaffDirectory.filter(s => s.status === 'Active').length,
      updatedAt: new Date().toISOString()
    };
    onSaveProfile(updatedProfile);
    setFormData(updatedProfile);
  };

  // Staff Directory handlers
  const handleOpenAddStaff = () => {
    // Staff depend on departments. Do not allow staff creation before at least one exists.
    if (departmentList.length === 0) {
      setDepartureNotice('Create at least one department before adding staff. Redirecting you to Department Management.');
      setActiveSubTab('departments');
      return;
    }
    const defaultDept = departmentList[0].name;
    const defaultHoD = departmentList.find(d => d.name === defaultDept)?.headStaffName;
    setEditingStaffId(null);
    setStaffFullName('');
    setStaffJobTitle('');
    setStaffDepartment(defaultDept);
    setStaffRole('Officer');
    setStaffEmail('');
    setStaffLineManager(defaultHoD ? `${defaultHoD} (Head of ${defaultDept})` : '');
    setStaffStatus('Active');
    setShowStaffModal(true);
  };

  const handleOpenEditStaff = (staff: StaffMember) => {
    setEditingStaffId(staff.id);
    setStaffFullName(staff.fullName);
    setStaffJobTitle(staff.jobTitle);
    setStaffDepartment(staff.department);
    setStaffRole((staff.role || staff.functionalRole || 'Officer') as UserRole);
    setStaffEmail(staff.email);
    setStaffLineManager(staff.lineManagerName || '');
    setStaffStatus(staff.status);
    setShowStaffModal(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffEmail.trim()) return;

    const matchedDept = departmentList.find(d => d.name.toLowerCase() === staffDepartment.toLowerCase());
    const deptId = matchedDept?.id;
    const finalLineManager = staffLineManager.trim() || (matchedDept?.headStaffName && matchedDept.headStaffName !== 'Unassigned' ? `${matchedDept.headStaffName} (Head of ${matchedDept.name})` : undefined);
    const resolvedRole: UserRole = staffRole || 'Officer';
    const functionalRole = resolvedRole === 'Admin' ? 'Admin' : resolvedRole === 'DepartmentHead' ? 'DepartmentHead' : resolvedRole === 'ProposalLead' ? 'ProposalLead' : resolvedRole === 'FinalApprover' ? 'FinalApprover' : 'Contributor';

    let updatedDirectory: StaffMember[];

    if (editingStaffId) {
      updatedDirectory = staffList.map(s => {
        if (s.id === editingStaffId) {
          return {
            ...s,
            fullName: staffFullName.trim(),
            jobTitle: staffJobTitle.trim() || `${staffDepartment} ${resolvedRole}`,
            department: staffDepartment,
            departmentId: deptId || s.departmentId,
            email: staffEmail.trim(),
            role: resolvedRole,
            roles: [resolvedRole],
            functionalRole,
            isDepartmentHead: resolvedRole === 'DepartmentHead',
            lineManagerName: finalLineManager,
            status: staffStatus
          };
        }
        return s;
      });
    } else {
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        fullName: staffFullName.trim(),
        jobTitle: staffJobTitle.trim() || `${staffDepartment} ${resolvedRole}`,
        department: staffDepartment,
        departmentId: deptId,
        email: staffEmail.trim(),
        role: resolvedRole,
        roles: [resolvedRole],
        functionalRole,
        isDepartmentHead: resolvedRole === 'DepartmentHead',
        lineManagerName: finalLineManager,
        status: staffStatus,
        joinedDate: new Date().toISOString().split('T')[0]
      };
      updatedDirectory = [...staffList, newStaff];
    }

    const updatedProfile: OrgProfile = {
      ...profile,
      staffDirectory: updatedDirectory,
      staffCount: updatedDirectory.filter(s => s.status === 'Active').length,
      updatedAt: new Date().toISOString()
    };

    onSaveProfile(updatedProfile);
    setFormData(updatedProfile);
    setShowStaffModal(false);

    if (editingStaffId && staffStatus === 'Inactive') {
      setDepartureNotice(
        `${staffFullName} has been marked Inactive. Any active tasks or lead responsibilities should be reviewed in the Team Accountability matrix.`
      );
    }
  };

  const handleToggleStaffStatus = (staff: StaffMember) => {
    const newStatus: 'Active' | 'Inactive' = staff.status === 'Active' ? 'Inactive' : 'Active';
    const updatedDirectory = staffList.map(s => {
      if (s.id === staff.id) {
        return { ...s, status: newStatus };
      }
      return s;
    });

    const updatedProfile: OrgProfile = {
      ...profile,
      staffDirectory: updatedDirectory,
      staffCount: updatedDirectory.filter(s => s.status === 'Active').length,
      updatedAt: new Date().toISOString()
    };

    onSaveProfile(updatedProfile);
    setFormData(updatedProfile);

    if (newStatus === 'Inactive') {
      setDepartureNotice(
        `${staff.fullName} marked Inactive. Review active proposals and tasks in Team Accountability.`
      );
    }
  };

  // Department dropdowns must reflect ONLY departments the org actually configured.
  // No preloaded or fabricated departments.
  const dynamicDepartmentNames = Array.from(new Set(departmentList.map(d => d.name)));

  const filteredStaff = sortStaffByHierarchy(
    staffList.filter(s => {
      const matchSearch =
        s.fullName.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.jobTitle.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(staffSearch.toLowerCase());
      const matchDept = staffDeptFilter === 'ALL' || s.department === staffDeptFilter;
      return matchSearch && matchDept;
    })
  );

  // Provenance wiring for multi-value fields. Reads/writes the per-field provenance map
  // on formData so it saves with the profile. Removing one value never affects another's source.
  const provenanceFor = (fieldKey: string) => ({
    provenance: formData.fieldProvenance?.[fieldKey],
    showProvenance: true as const,
    onProvenanceChange: (next: Record<string, 'derived' | 'added' | 'verified'>) =>
      setFormData(prev => ({
        ...prev,
        fieldProvenance: { ...(prev.fieldProvenance || {}), [fieldKey]: next }
      }))
  });

  // ---- Auto-fill profile from an uploaded institutional document ----
  const [extracting, setExtracting] = useState(false);
  const [extractFileName, setExtractFileName] = useState('');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSummary, setExtractSummary] = useState<string | null>(null);
  const NOT_FOUND = 'Not found in document';

  const applyExtraction = (data: any) => {
    const filled: string[] = [];
    const skipped: string[] = [];
    setFormData(prev => {
      const next: any = { ...prev };
      const nextProv: Record<string, Record<string, 'derived' | 'added' | 'verified'>> = { ...(prev.fieldProvenance || {}) };

      const setScalar = (key: string, val: any, label: string) => {
        const v = val == null ? '' : String(val).trim();
        if (v && v !== NOT_FOUND) {
          if (key === 'yearEstablished') {
            const year = parseInt(v.replace(/[^0-9]/g, '').slice(0, 4), 10);
            next[key] = Number.isFinite(year) && year > 0 ? year : prev.yearEstablished;
          } else {
            next[key] = v;
          }
          filled.push(label);
        } else {
          skipped.push(label);
        }
      };

      setScalar('name', data.organisationName, 'legal name');
      setScalar('country', data.country, 'country');
      setScalar('yearEstablished', data.yearOfRegistration, 'year of registration');
      setScalar('registrationStatus', data.registrationNumberOrStatus, 'registration number');
      setScalar('orgType', data.organisationType, 'classification');

      const themes: string[] = Array.isArray(data.thematicAreas)
        ? data.thematicAreas.map((t: any) => String(t).trim()).filter((t: string) => t && t !== NOT_FOUND)
        : [];
      if (themes.length > 0) {
        next.thematicAreas = Array.from(new Set([...(prev.thematicAreas || []), ...themes]));
        const tprov: Record<string, 'derived' | 'added' | 'verified'> = { ...(nextProv.thematicAreas || {}) };
        themes.forEach(t => { if (!tprov[t]) tprov[t] = 'derived'; });
        nextProv.thematicAreas = tprov;
        filled.push('thematic sectors');
      } else {
        skipped.push('thematic sectors');
      }

      next.fieldProvenance = nextProv;
      return next;
    });

    setExtractSummary(
      `Filled from the document: ${filled.join(', ') || 'nothing'}. ` +
      `Not found in the document, please complete by hand: ${skipped.join(', ') || 'none'}. ` +
      `Review the highlighted values, then Save.`
    );
  };

  const handleExtractFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtractFileName(file.name);
    setExtractError(null);
    setExtractSummary(null);
    setExtracting(true);
    try {
      const payload: { documentName: string; mimeType: string; base64Data?: string; text?: string } = {
        documentName: file.name,
        mimeType: file.type || 'application/pdf'
      };
      if ((file.type || '').startsWith('text')) {
        payload.text = await file.text();
      } else {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = () => reject(new Error('Could not read the file.'));
          r.readAsDataURL(file);
        });
        payload.base64Data = dataUrl.split(',')[1] || '';
      }
      const data = await api.extractOrgProfile(payload);
      applyExtraction(data);
    } catch (err: any) {
      setExtractError(err?.message || 'Could not read the document. Please enter the details manually.');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const setupStages = getSetupStages(profile);
  const nextIncompleteStage = setupStages.find(s => !s.done);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {nextIncompleteStage && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Finish setting up {profile.name || 'your organisation'}</h3>
              <p className="text-[11px] text-slate-500">Complete each stage in order. You can return and edit any stage later.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab(nextIncompleteStage.key)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center gap-1.5 shrink-0"
            >
              Continue Setup: {nextIncompleteStage.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {setupStages.map((s, idx) => (
              <React.Fragment key={s.label}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab(s.key)}
                  className={`flex items-center gap-1.5 text-[11px] font-bold transition ${s.done ? 'text-emerald-600 hover:text-emerald-700' : nextIncompleteStage.label === s.label ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${s.done ? 'bg-emerald-500 text-white' : nextIncompleteStage.label === s.label ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {s.done ? <Check className="w-3 h-3" /> : idx + 1}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < setupStages.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isProfileComplete && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Institutional Profile
              </span>
            )}
            <span className="text-xs text-slate-500">
              Institutional workspace for donor compliance, proposal reviews & funding workflows
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            {profile.name || 'Organisation Profile'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {[
              profile.registrationStatus || null,
              profile.yearEstablished ? `Founded in ${profile.yearEstablished} (${dynamicYearsExperience} yrs experience)` : null,
              departmentList.length > 0 ? `${departmentList.length} ${departmentList.length === 1 ? 'Department' : 'Departments'}` : null,
              staffList.filter(s => s.status === 'Active' && s.fullName && s.fullName !== 'Organisation Admin').length > 0
                ? `${staffList.filter(s => s.status === 'Active' && s.fullName && s.fullName !== 'Organisation Admin').length} Active Staff`
                : null,
              currentDocs.length > 0 ? `${currentDocs.length} Approved Documents` : null
            ].filter(Boolean).join(' • ')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeSubTab === 'details' && !isEditing && (
            <button
              id="edit-profile-btn"
              onClick={() => {
                setFormData(profile);
                setIsEditing(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs"
            >
              Edit Details
            </button>
          )}

          {activeSubTab === 'staff' && (
            <button
              onClick={handleOpenAddStaff}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Structured Section Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 overflow-x-auto gap-1">
        <button
          id="tab-org-details"
          onClick={() => setActiveSubTab('details')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'details'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Organisation Details
        </button>

        <button
          id="tab-org-preferences"
          onClick={() => setActiveSubTab('preferences')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'preferences'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Funding Preferences</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
            Scout
          </span>
        </button>

        <button
          id="tab-org-departments"
          onClick={() => setActiveSubTab('departments')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'departments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Department Management</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeSubTab === 'departments' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
            {departmentList.length}
          </span>
        </button>

        <button
          id="tab-org-staff"
          onClick={() => setActiveSubTab('staff')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'staff'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeSubTab === 'staff' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
            {staffList.length}
          </span>
        </button>

        <button
          id="tab-org-documents"
          onClick={() => setActiveSubTab('documents')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>Document Library</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeSubTab === 'documents' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'}`}>
            {currentDocs.length}
          </span>
        </button>

        <button
          id="tab-org-policies"
          onClick={() => setActiveSubTab('policies')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'policies'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Policies & Compliance
        </button>

        <button
          id="tab-org-donors"
          onClick={() => setActiveSubTab('donors')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'donors'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Donor Experience
        </button>

        <button
          id="tab-org-finance"
          onClick={() => setActiveSubTab('finance')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'finance'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Financial / Audit Information
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Profile changes successfully saved to institutional database!
        </div>
      )}

      {departureNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{departureNotice}</span>
          </div>
          <button
            onClick={() => setDepartureNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: DEPARTMENT MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'departments' && (
        <div className="space-y-4">
          <DepartmentManagement
            departments={departmentList}
            staffDirectory={staffList}
            onUpdateDepartments={handleUpdateDepartments}
            onNavigateToStaff={(dept) => {
              if (dept) setStaffDeptFilter(dept);
              setActiveSubTab('staff');
            }}
          />
          {departmentList.length > 0 && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubTab('staff')}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                Continue to Staff
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION: FUNDING PREFERENCES (OPPORTUNITY SCOUT CONFIGURATION) */}
      {/* ========================================================================= */}
      {activeSubTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="space-y-6">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent p-5 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 font-mono">
                  OPPORTUNITY SCOUT TARGETING
                </span>
                <span className="text-xs text-amber-800 font-semibold">Autonomous Discovery Parameters</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600" />
                Institutional Funding & Grant Preferences
              </h2>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                Configure your target sectors, geographic eligibility, grant sizes, and donor instruments.
                Opportunity Scout dynamically generates targeted Google Search queries and scores incoming public calls against these rules.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm shrink-0"
            >
              <Save className="w-4 h-4" />
              Save Funding Preferences
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Thematic Focus & Keywords */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                1. Thematic Areas & Keywords
              </h3>

              <div>
                <StructuredMultiSelect
                  label="Primary Thematic Priorities"
                  options={STANDARD_THEMATIC_SECTORS}
                  selected={prefThematics}
                  onChange={setPrefThematics}
                  badgeColor="indigo"
                  placeholder="Select priority thematic sectors for scout..."
                  allowCustom={true}
                  customPlaceholder="Add custom sector priority..."
                  helperText="Primary intervention sectors used for Opportunity Scout matching."
                  provenance={formData.fieldProvenance?.['pref.thematicAreas']}
                  showProvenance
                  onProvenanceChange={provenanceFor('pref.thematicAreas').onProvenanceChange}
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Search Keywords & Tags
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Specific terminology included in Opportunity Scout web queries.</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {prefKeywords.map((k, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                      #{k}
                      <button
                        type="button"
                        onClick={() => setPrefKeywords(prev => prev.filter((_, i) => i !== idx))}
                        className="text-amber-700 hover:text-amber-950"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {prefKeywords.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No specific keywords configured yet.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add search tag (e.g. vocational training, GBV response)..."
                    value={newPrefKeyword}
                    onChange={e => setNewPrefKeyword(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPrefKeyword.trim()) {
                          setPrefKeywords(prev => [...prev, newPrefKeyword.trim()]);
                          setNewPrefKeyword('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPrefKeyword.trim()) {
                        setPrefKeywords(prev => [...prev, newPrefKeyword.trim()]);
                        setNewPrefKeyword('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Geographic Eligibility & Beneficiaries */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                2. Geographic Eligibility & Target Groups
              </h3>

              <div>
                <GeographicFootprintSelect
                  label="Target Countries & Regions"
                  selectedGeos={prefGeos}
                  onChange={setPrefGeos}
                  helperText="Primary countries and sub-national field locations targeted for donor funding."
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <StructuredMultiSelect
                  label="Target Beneficiary Groups"
                  options={STANDARD_BENEFICIARY_GROUPS}
                  selected={prefBeneficiaries}
                  onChange={setPrefBeneficiaries}
                  badgeColor="purple"
                  placeholder="Select target beneficiary groups..."
                  allowCustom={true}
                  customPlaceholder="Add custom beneficiary group..."
                  helperText="Priority populations and community demographics."
                  provenance={formData.fieldProvenance?.['pref.beneficiaryGroups']}
                  showProvenance
                  onProvenanceChange={provenanceFor('pref.beneficiaryGroups').onProvenanceChange}
                />
              </div>
            </div>

            {/* 3. Funding Sizes & Duration */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                3. Target Grant Sizes & Duration
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Min Funding
                  </label>
                  <input
                    type="text"
                    value={prefMinFunding}
                    onChange={e => setPrefMinFunding(e.target.value)}
                    placeholder="e.g. $50,000 USD"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Max Funding
                  </label>
                  <input
                    type="text"
                    value={prefMaxFunding}
                    onChange={e => setPrefMaxFunding(e.target.value)}
                    placeholder="e.g. $500,000 USD"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min Useful Grant Size
                  </label>
                  <input
                    type="text"
                    value={prefMinUseful}
                    onChange={e => setPrefMinUseful(e.target.value)}
                    placeholder="e.g. $25,000 USD"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Filter out micro-grants too small for institutional overhead.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Duration
                  </label>
                  <input
                    type="text"
                    value={prefDuration}
                    onChange={e => setPrefDuration(e.target.value)}
                    placeholder="e.g. 12 - 24 months"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Entity Type & Consortium Strategy */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                4. Organisation Type & Strategy
              </h3>

              <div>
                <StructuredSingleSelect
                  label="Applicant Entity Classification"
                  options={STANDARD_ORG_CLASSIFICATIONS}
                  selected={prefOrgType}
                  onChange={setPrefOrgType}
                  placeholder="Select applicant entity classification..."
                  allowCustom={true}
                  helperText="Classification used for eligibility matching against donor criteria."
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Accept Consortium Calls</span>
                    <p className="text-[11px] text-slate-500">Include multi-partner consortia and sub-grantee opportunities.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrefAcceptsConsortium(!prefAcceptsConsortium)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      prefAcceptsConsortium ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        prefAcceptsConsortium ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Preferred Donor Types & Instruments */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                5. Preferred Donor Types & Instruments
              </h3>

              <div>
                <StructuredMultiSelect
                  label="Target Donor Categories"
                  options={STANDARD_DONOR_TYPES}
                  selected={prefDonorTypes}
                  onChange={setPrefDonorTypes}
                  badgeColor="amber"
                  placeholder="Select target donor categories..."
                  allowCustom={true}
                  customPlaceholder="Add custom donor category..."
                  helperText="Categories of grantmakers and funding bodies to prioritize."
                  provenance={formData.fieldProvenance?.['pref.donorTypes']}
                  showProvenance
                  onProvenanceChange={provenanceFor('pref.donorTypes').onProvenanceChange}
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <StructuredMultiSelect
                  label="Preferred Funding Instruments"
                  options={STANDARD_FUNDING_INSTRUMENTS}
                  selected={prefFundingTypes}
                  onChange={setPrefFundingTypes}
                  badgeColor="emerald"
                  placeholder="Select funding instruments..."
                  allowCustom={true}
                  customPlaceholder="Add custom instrument..."
                  helperText="Grant award types and funding mechanisms."
                  provenance={formData.fieldProvenance?.['pref.fundingTypes']}
                  showProvenance
                  onProvenanceChange={provenanceFor('pref.fundingTypes').onProvenanceChange}
                />
              </div>
            </div>

            {/* 6. Negative Exclusions */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <BadgeAlert className="w-4 h-4 text-red-600" />
                6. Negative Exclusion Filters
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Excluded Sectors / Topics
                </label>
                <p className="text-[11px] text-slate-500 mb-2">Automatically discard funding calls centered on these topics.</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {prefExcludedSectors.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                      {s}
                      <button
                        type="button"
                        onClick={() => setPrefExcludedSectors(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {prefExcludedSectors.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No sector exclusions.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add excluded sector (e.g. Fossil Fuels, Military)..."
                    value={newPrefExcludedSector}
                    onChange={e => setNewPrefExcludedSector(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPrefExcludedSector.trim()) {
                          setPrefExcludedSectors(prev => [...prev, newPrefExcludedSector.trim()]);
                          setNewPrefExcludedSector('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPrefExcludedSector.trim()) {
                        setPrefExcludedSectors(prev => [...prev, newPrefExcludedSector.trim()]);
                        setNewPrefExcludedSector('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Excluded Countries / Regions
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {prefExcludedCountries.map((c, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                      {c}
                      <button
                        type="button"
                        onClick={() => setPrefExcludedCountries(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {prefExcludedCountries.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No geographic exclusions.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add excluded region..."
                    value={newPrefExcludedCountry}
                    onChange={e => setNewPrefExcludedCountry(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPrefExcludedCountry.trim()) {
                          setPrefExcludedCountries(prev => [...prev, newPrefExcludedCountry.trim()]);
                          setNewPrefExcludedCountry('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPrefExcludedCountry.trim()) {
                        setPrefExcludedCountries(prev => [...prev, newPrefExcludedCountry.trim()]);
                        setNewPrefExcludedCountry('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Funding Preferences
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: ORGANISATION DETAILS */}
      {/* ========================================================================= */}
      {activeSubTab === 'details' && (
        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          {isEditing && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-indigo-900">Auto-fill from a registration document</h3>
                  <p className="text-[11px] text-indigo-800/80 mt-0.5">
                    Upload your CAC certificate, constitution, or organisational profile. GrantFlow reads it and drafts the identity fields below, tagging anything it finds as From document. It fills only what the document proves and leaves the rest for you.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className={`px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-50 cursor-pointer flex items-center gap-1.5 ${extracting ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-3.5 h-3.5" />
                  {extractFileName || 'Choose document'}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    className="hidden"
                    onChange={handleExtractFile}
                    disabled={extracting}
                  />
                </label>
                {extracting && <span className="text-[11px] text-indigo-700 font-semibold animate-pulse">Reading document...</span>}
              </div>
              {extractError && <p className="text-[11px] text-rose-600 font-semibold">{extractError}</p>}
              {extractSummary && <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">{extractSummary}</p>}
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Institutional Legal Identity & Registration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Organisation Legal Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="e.g. Hope Action Initiative"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                ) : (
                  profile.name ? (
                    <p className="text-sm text-slate-900 font-bold">{profile.name}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not configured</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Country of Headquarters
                </label>
                {isEditing ? (
                  <StructuredSingleSelect
                    options={STANDARD_COUNTRIES}
                    selected={formData.country}
                    onChange={val => handleChange('country', val)}
                    placeholder="Select primary country..."
                    allowCustom={true}
                  />
                ) : (
                  profile.country ? (
                    <p className="text-sm text-slate-800 font-medium">{profile.country}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not configured</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Registration Status & Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.registrationStatus}
                    onChange={e => handleChange('registrationStatus', e.target.value)}
                    placeholder="e.g. CAC/IT/NO: 12345 or Registered NGO"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  profile.registrationStatus ? (
                    <p className="text-sm text-slate-800 font-medium">{profile.registrationStatus}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not configured</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Organisation Classification
                </label>
                {isEditing ? (
                  <StructuredSingleSelect
                    options={STANDARD_ORG_CLASSIFICATIONS}
                    selected={formData.orgType}
                    onChange={val => handleChange('orgType', val)}
                    placeholder="Select classification..."
                    allowCustom={true}
                  />
                ) : (
                  profile.orgType ? (
                    <p className="text-sm text-slate-800 font-medium">{profile.orgType}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not configured</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Year Established & Experience
                </label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Year Founded (e.g. 2019)"
                      value={formData.yearEstablished || ''}
                      onChange={e => {
                        const yr = parseInt(e.target.value) || 0;
                        const exp = yr > 0 ? Math.max(0, currentYear - yr) : 0;
                        setFormData(prev => ({ ...prev, yearEstablished: yr, yearsExperience: exp }));
                      }}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Years Experience"
                      value={formData.yearsExperience ?? ''}
                      onChange={e => handleChange('yearsExperience', parseInt(e.target.value) || 0)}
                      className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                ) : (
                  profile.yearEstablished ? (
                    <p className="text-sm text-slate-800">
                      Est. {profile.yearEstablished} ({dynamicYearsExperience} Years Operating Experience)
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not configured</p>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Official Grants & Partnerships Contact Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => handleChange('contactEmail', e.target.value)}
                    placeholder="grants@organisation.org"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  profile.contactEmail ? (
                    <p className="text-sm text-slate-800 font-mono">{profile.contactEmail}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not configured</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Mission & Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Institutional Narrative & Mandate Summary
            </label>
            {isEditing ? (
              <textarea
                rows={4}
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Enter institutional mission, narrative, and operational mandate summary..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              profile.description ? (
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {profile.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-lg border border-slate-200">
                  Not provided
                </p>
              )
            )}
          </div>

          {/* Thematic & Geographic Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
            <div>
              <StructuredMultiSelect
                label="Core Thematic Sectors"
                options={STANDARD_THEMATIC_SECTORS}
                selected={isEditing ? formData.thematicAreas : profile.thematicAreas}
                onChange={val => handleChange('thematicAreas', val)}
                disabled={!isEditing}
                badgeColor="indigo"
                placeholder="Select core thematic sectors..."
                allowCustom={true}
                customPlaceholder="Add custom sector..."
                helperText="Primary intervention sectors used for institutional profile matching."
                provenance={(isEditing ? formData : profile).fieldProvenance?.thematicAreas}
                showProvenance
                onProvenanceChange={provenanceFor('thematicAreas').onProvenanceChange}
              />
            </div>

            <div>
              <GeographicFootprintSelect
                label="Geographic Footprint & Field Locations"
                selectedGeos={isEditing ? formData.geographicAreas : profile.geographicAreas}
                onChange={val => handleChange('geographicAreas', val)}
                disabled={!isEditing}
                helperText="Operational countries and specific sub-national field locations."
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setFormData(profile);
                  setIsEditing(false);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Organisation Details
              </button>
            </div>
          )}

          {/* Admin-Only Administrative Deletion Controls */}
          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <div className="bg-rose-50/40 border border-rose-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">
                      Administrative Data & Account Management (Admin Only)
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Sensitive administrative operations to permanently erase operational data or completely remove this organisation account. Both actions require strict two-step confirmation.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Action 1: Clear Organisation Data */}
                  <div className="bg-white border border-rose-200/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        Clear Organisation Data
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Permanently erases all opportunities, workspaces, tasks, assignments, document files, grant history, institutional memory, notifications, and scout activity logs. Preserves your organisation account shell and administrator login credentials.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        id="clear-org-data-btn"
                        onClick={handleOpenClearData}
                        className="w-full px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Organisation Data...
                      </button>
                    </div>
                  </div>

                  {/* Action 2: Delete Organisation */}
                  <div className="bg-white border border-rose-300 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-950">
                        <AlertOctagon className="w-4 h-4 text-rose-700" />
                        Delete Entire Organisation
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Permanently and irreversibly destroys this organisation, all associated workspaces, documents, memory records, and all user accounts (including the administrator). You will be immediately signed out.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        id="delete-org-btn"
                        onClick={handleOpenDeleteOrg}
                        className="w-full px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Delete Entire Organisation...
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: STAFF DIRECTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          {/* Staff Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search staff by name, title, or email..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Department:</span>
                <select
                  value={staffDeptFilter}
                  onChange={(e) => setStaffDeptFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Departments</option>
                  {dynamicDepartmentNames.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setActiveSubTab('departments')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition border border-slate-200 flex items-center gap-1.5"
                title="Configure departments and reporting hierarchy"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Manage Units ({departmentList.length})</span>
              </button>

              <button
                onClick={handleOpenAddStaff}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Staff Member
              </button>
            </div>
          </div>

          {/* Direct Staff Email Invitation & Join Token Generator */}
          <StaffInvitationManager
            departments={departmentList}
            organizationName={profile.name}
            onStaffInvited={(inv) => {
              // Refresh or sync to staff directory
              const newStaff: StaffMember = {
                id: `staff-${Date.now()}`,
                fullName: inv.fullName,
                jobTitle: inv.jobTitle,
                department: inv.departmentName,
                departmentId: inv.departmentId,
                email: inv.email,
                isDepartmentHead: inv.role === 'DepartmentHead',
                functionalRole: inv.role === 'Admin' ? 'Admin' : inv.role === 'DepartmentHead' ? 'DepartmentHead' : inv.role === 'ProposalLead' ? 'ProposalLead' : inv.role === 'FinalApprover' ? 'FinalApprover' : 'Contributor',
                role: inv.role,
                roles: inv.roles || [inv.role],
                status: 'Active',
                joinedDate: new Date().toISOString().split('T')[0]
              };
              const updatedStaffList = [...staffList, newStaff];
              setFormData(prev => ({ ...prev, staffDirectory: updatedStaffList }));
              onSaveProfile({ ...profile, staffDirectory: updatedStaffList });
            }}
          />

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => (
              <div
                key={staff.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition flex flex-col justify-between ${
                  staff.status === 'Inactive' ? 'border-slate-200 opacity-75 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          staff.status === 'Inactive'
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {staff.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{staff.fullName}</h3>
                        <p className="text-xs font-medium text-slate-600">{staff.jobTitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {staff.role || staff.functionalRole || 'Officer'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          staff.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {staff.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{staff.department}</span>
                    </div>
                    {staff.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500">{staff.email}</span>
                      </div>
                    ) : null}
                    {staff.lineManagerName && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="text-slate-400">Line Manager:</span>
                        <span className="font-medium text-slate-700">{staff.lineManagerName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleToggleStaffStatus(staff)}
                    className={`font-semibold transition text-[11px] flex items-center gap-1 ${
                      staff.status === 'Active'
                        ? 'text-rose-600 hover:text-rose-800'
                        : 'text-emerald-600 hover:text-emerald-800'
                    }`}
                  >
                    {staff.status === 'Active' ? (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        Mark Inactive
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Mark Active
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEditStaff(staff)}
                    className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {staffList.some(s => Boolean(s.departmentId)) && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubTab('preferences')}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                Continue to Funding Preferences
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DOCUMENT LIBRARY (Embedded dedicated component) */}
      {/* ========================================================================= */}
      {activeSubTab === 'documents' && (
        <OrgDocumentLibrary
          documents={currentDocs}
          staffDirectory={staffList}
          onUpdateDocuments={handleUpdateDocuments}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: POLICIES & COMPLIANCE */}
      {/* ========================================================================= */}
      {activeSubTab === 'policies' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Institutional Policies & Safeguarding Framework
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified board-approved policies governing human rights, safeguarding, financial integrity, and program delivery
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('documents')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <FolderLock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Manage in Document Library</span>
              </button>
            </div>

            {/* Policy Cards Grid */}
            {currentDocs.filter(d => d.category === 'Policies & Compliance').length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-6">
                <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Institutional Policies Uploaded Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Upload your board-approved policies (Child Safeguarding, Anti-Fraud, GESI, Procurement) in the Document Library to verify compliance.
                </p>
                <button
                  onClick={() => setActiveSubTab('documents')}
                  className="mt-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <FolderLock className="w-3.5 h-3.5" />
                  Go to Document Library
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {currentDocs.filter(d => d.category === 'Policies & Compliance').map(doc => (
                  <div key={doc.id} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {doc.status || 'Active Approved'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {doc.description || 'Verified board-approved policy uploaded to institutional repository.'}
                    </p>
                    <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Version: {doc.version} {doc.year ? `(${doc.year})` : ''} • Custodian: {doc.maintainedBy}</span>
                      <button
                        onClick={() => setActiveSubTab('documents')}
                        className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        View in Document Library
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* M&E Capacity Block */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Monitoring, Evaluation & Learning (MEL) Institutional Capacity
              </h4>
              <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200 leading-relaxed">
                {profile.meCapacity}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: DONOR EXPERIENCE */}
      {/* ========================================================================= */}
      {activeSubTab === 'donors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Past Institutional Donor Track Record & Performance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified grant execution history, bilateral partners, and institutional performance references
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('documents')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <FolderLock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Reference Letters in Library</span>
              </button>
            </div>

            {/* Donor Grants List */}
            {profile.previousDonors.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2 mt-6">
                <Award className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Past Donor Records Logged</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Add past funding partners (e.g. USAID, EU, Ford Foundation) in the Organisation Details tab to highlight institutional credibility.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-6">
                {profile.previousDonors.map((donor, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{donor}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Financial audit, milestone verification, and formal grant liquidation completed.
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 self-start sm:self-center">
                      Satisfactory Performance
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Reference Letters Highlights from Document Library */}
            {isDemo && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                  Verified Past Performance Documents Available in Library
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">MacArthur Foundation Reference Letter</div>
                        <div className="text-[10px] text-slate-400">Signed Original • 2024</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSubTab('documents')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      View Document
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="font-bold text-slate-800 text-xs">EU-ACT British Council Completion Report</div>
                        <div className="text-[10px] text-slate-400">Certified Evaluation • 2022</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSubTab('documents')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      View Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: FINANCIAL / AUDIT INFORMATION */}
      {/* ========================================================================= */}
      {activeSubTab === 'finance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Financial Standing, External Audits & Banking Controls
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified financial turnover metrics, external audit opinions, and institutional banking controls
                </p>
              </div>

              <button
                onClick={() => setActiveSubTab('documents')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <FolderLock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Audit Reports in Library</span>
              </button>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Annual Budget Turnover</span>
                <div className="text-xl font-extrabold text-slate-900 mt-1">{profile.annualBudgetRange || 'Not specified'}</div>
                <div className="text-xs text-slate-500 mt-0.5">Estimated organizational turnover</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  External Audit History
                </span>
                <div className="text-xl font-extrabold text-emerald-900 mt-1">
                  {isDemo ? '4 Consecutive Years' : `${currentDocs.filter(d => d.category === 'Financial & Audit' || d.category === 'Financial / Audit').length} Audit Reports`}
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  {isDemo ? 'Unqualified clean opinions (2021–2024)' : currentDocs.filter(d => d.category === 'Financial & Audit' || d.category === 'Financial / Audit').length > 0 ? 'Statements filed in Document Library' : 'No audit reports on file'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                <span className="text-[11px] font-bold text-indigo-700 uppercase flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5" />
                  Independent Auditors
                </span>
                <div className="text-base font-bold text-indigo-900 mt-1">
                  {isDemo ? 'Parker & Cole Chartered Accountants' : (profile.auditHistory || 'Not configured')}
                </div>
                <div className="text-xs text-indigo-700 mt-0.5">External audit firm</div>
              </div>
            </div>

            {/* Audit Reports Available in Document Library */}
            <div className="mt-8 space-y-3">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Audited Statements & Financial Documents in Repository
              </h4>

              {currentDocs.filter(d => d.category === 'Financial & Audit' || d.category === 'Financial / Audit').length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Landmark className="w-7 h-7 text-slate-400 mx-auto" />
                  <div className="text-xs font-bold text-slate-800">No Audited Financial Statements Uploaded Yet</div>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Upload your external audit reports, management letters, and bank certificates in the Document Library.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('documents')}
                    className="mt-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                  >
                    <FolderLock className="w-3.5 h-3.5" />
                    Upload Financial Docs
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {currentDocs.filter(d => d.category === 'Financial & Audit' || d.category === 'Financial / Audit').map(doc => (
                    <div key={doc.id} className="p-3.5 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{doc.title}</div>
                          <div className="text-slate-500 text-[11px]">{doc.year || 'Current'} • Maintained by {doc.maintainedBy || 'Finance'}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {doc.status || 'Current'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal (Add / Edit) */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {editingStaffId ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter staff full name"
                  value={staffFullName}
                  onChange={(e) => setStaffFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter job title"
                  value={staffJobTitle}
                  onChange={(e) => setStaffJobTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Unit *</label>
                  <select
                    value={staffDepartment}
                    onChange={(e) => {
                      const nextDept = e.target.value;
                      setStaffDepartment(nextDept);
                      const matched = departmentList.find(d => d.name.toLowerCase() === nextDept.toLowerCase());
                      if (matched?.headStaffName && matched.headStaffName !== 'Unassigned' && !staffLineManager) {
                        setStaffLineManager(`${matched.headStaffName} (Head of ${matched.name})`);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {dynamicDepartmentNames.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Active Status</label>
                  <select
                    value={staffStatus}
                    onChange={(e) => setStaffStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive (Departed/On Leave)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter staff email address"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role / Authority *</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    <option value="Officer">Officer / Contributor</option>
                    <option value="ProposalLead">Proposal Lead</option>
                    <option value="DepartmentHead">Department Head (HoD)</option>
                    <option value="Reviewer">Internal Reviewer</option>
                    <option value="FinalApprover">Final Approver / Executive</option>
                    <option value="Admin">Admin</option>
                    <option value="Viewer">Viewer (Read Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Line Manager</label>
                <input
                  type="text"
                  placeholder="Enter line manager name"
                  value={staffLineManager}
                  onChange={(e) => setStaffLineManager(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editingStaffId ? 'Update Staff Member' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CLEAR ORGANISATION DATA */}
      {/* ========================================================================= */}
      {showClearDataModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-900 font-bold text-base">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                Clear Organisation Data
              </div>
              <button
                type="button"
                onClick={() => setShowClearDataModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {clearDataError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {clearDataError}
              </div>
            )}

            {clearDataStep === 1 ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <strong className="block font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Warning: Irreversible Data Deletion
                  </strong>
                  <p className="text-amber-800 leading-relaxed">
                    This action will permanently delete all operational records for <strong>{profile.name || 'this organisation'}</strong>, including:
                  </p>
                  <ul className="list-disc list-inside text-amber-800 space-y-0.5 pl-1">
                    <li>All Opportunity Workspaces and proposal drafts</li>
                    <li>All tasks, assignments, and blocker records</li>
                    <li>All uploaded supporting documents and library files</li>
                    <li>All institutional memory and past grant history</li>
                    <li>All notifications, scout candidates, and activity logs</li>
                  </ul>
                  <p className="text-amber-900 font-semibold pt-1">
                    Your organisation account shell and administrator login credentials will be preserved. A clean, empty Dashboard will be restored.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Type <span className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">DELETE ALL DATA</span> to confirm:
                  </label>
                  <input
                    type="text"
                    id="clear-data-confirmation-input"
                    value={clearDataInput}
                    onChange={e => setClearDataInput(e.target.value)}
                    placeholder="DELETE ALL DATA"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-rose-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowClearDataModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="clear-data-next-btn"
                    disabled={clearDataInput.trim() !== 'DELETE ALL DATA'}
                    onClick={() => setClearDataStep(2)}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
                  >
                    Continue to Confirmation
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-2 text-center">
                  <AlertOctagon className="w-8 h-8 text-rose-600 mx-auto" />
                  <h4 className="text-sm font-extrabold text-rose-900">Final Confirmation Required</h4>
                  <p className="text-rose-800 leading-relaxed max-w-sm mx-auto">
                    Are you absolutely sure you want to permanently erase all operational data? This operation cannot be cancelled or reversed once started.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isClearingData}
                    onClick={() => setClearDataStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    id="clear-data-execute-btn"
                    disabled={isClearingData}
                    onClick={handleExecuteClearData}
                    className="px-5 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    {isClearingData ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Erasing Data...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Yes, Permanently Clear All Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DELETE ENTIRE ORGANISATION */}
      {/* ========================================================================= */}
      {showDeleteOrgModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-300 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-900 font-bold text-base">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                Delete Entire Organisation
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteOrgModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteOrgError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {deleteOrgError}
              </div>
            )}

            {deleteOrgStep === 1 ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-1.5">
                  <strong className="block font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0" />
                    Danger: Complete Organisation Deletion
                  </strong>
                  <p className="text-rose-900 leading-relaxed">
                    This will permanently destroy <strong>{profile.name || 'this organisation'}</strong> and all associated assets:
                  </p>
                  <ul className="list-disc list-inside text-rose-800 space-y-0.5 pl-1">
                    <li>The organisation entity and master settings</li>
                    <li>All user accounts and administrator login access</li>
                    <li>All proposal workspaces, documents, tasks, and memory</li>
                  </ul>
                  <p className="text-rose-900 font-bold pt-1">
                    You will be immediately logged out and returned to the account sign-in screen.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Type <span className="font-mono text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{expectedOrgConfirm}</span> to confirm:
                  </label>
                  <input
                    type="text"
                    id="delete-org-confirmation-input"
                    value={deleteOrgInput}
                    onChange={e => setDeleteOrgInput(e.target.value)}
                    placeholder={expectedOrgConfirm}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-rose-500"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeleteOrgModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="delete-org-next-btn"
                    disabled={deleteOrgInput.trim() !== expectedOrgConfirm}
                    onClick={() => setDeleteOrgStep(2)}
                    className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
                  >
                    Continue to Final Confirmation
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-rose-100 border border-rose-400 rounded-xl text-xs text-rose-950 space-y-2 text-center">
                  <AlertOctagon className="w-10 h-10 text-rose-700 mx-auto animate-bounce" />
                  <h4 className="text-sm font-black text-rose-950">PERMANENT ACCOUNT DESTRUCTION</h4>
                  <p className="text-rose-900 leading-relaxed max-w-sm mx-auto font-medium">
                    This is your final confirmation. This organisation and all administrator credentials will be permanently erased.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isDeletingOrg}
                    onClick={() => setDeleteOrgStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    id="delete-org-execute-btn"
                    disabled={isDeletingOrg}
                    onClick={handleExecuteDeleteOrg}
                    className="px-5 py-2.5 text-xs font-black text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-xl shadow-lg transition flex items-center gap-2"
                  >
                    {isDeletingOrg ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Deleting Organisation...
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="w-4 h-4" />
                        Yes, Delete Entire Organisation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

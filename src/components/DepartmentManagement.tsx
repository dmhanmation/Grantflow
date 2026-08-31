import React, { useState } from 'react';
import { OrgDepartment, StaffMember } from '../types';
import { STANDARD_DEPARTMENT_OPTIONS } from '../data/taxonomyOptions';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import {
  Building2,
  Users,
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Briefcase,
  Mail,
  Check,
  X,
  Search,
  UserPlus,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface DepartmentManagementProps {
  departments: OrgDepartment[];
  staffDirectory: StaffMember[];
  onUpdateDepartments: (departments: OrgDepartment[], updatedStaff?: StaffMember[]) => void;
  onNavigateToStaff?: (deptName?: string) => void;
}

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'blue', label: 'Classic Blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  { id: 'purple', label: 'Purple / Violet', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  { id: 'amber', label: 'Amber / Gold', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  { id: 'cyan', label: 'Cyan / Teal', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  { id: 'rose', label: 'Rose / Crimson', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' },
  { id: 'indigo', label: 'Indigo / Navy', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  { id: 'slate', label: 'Slate Gray', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' }
];

export const DepartmentManagement: React.FC<DepartmentManagementProps> = ({
  departments,
  staffDirectory,
  onUpdateDepartments,
  onNavigateToStaff
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Modal Form State
  const [selectedStandardDept, setSelectedStandardDept] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalCode, setModalCode] = useState('');
  const [modalHeadStaffId, setModalHeadStaffId] = useState('');
  const [modalDeputyStaffId, setModalDeputyStaffId] = useState('');
  const [modalMandate, setModalMandate] = useState('');
  const [modalColor, setModalColor] = useState('indigo');
  const [modalSelectedStaffIds, setModalSelectedStaffIds] = useState<string[]>([]);

  // Link Staff Quick Modal State
  const [showLinkStaffModal, setShowLinkStaffModal] = useState(false);
  const [targetDeptForStaff, setTargetDeptForStaff] = useState<OrgDepartment | null>(null);
  const [linkStaffSelection, setLinkStaffSelection] = useState<string[]>([]);
  const [staffModalSearch, setStaffModalSearch] = useState('');

  // Notification / Feedback State
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Filtered departments
  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.headStaffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.mandate && d.mandate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Helper to get staff linked to a department
  const getStaffForDepartment = (dept: OrgDepartment) => {
    return staffDirectory.filter(s =>
      s.departmentId === dept.id || s.department.toLowerCase() === dept.name.toLowerCase()
    );
  };

  // Helper to get department styling
  const getColorStyle = (colorId?: string) => {
    const found = COLOR_OPTIONS.find(c => c.id === colorId);
    return found || COLOR_OPTIONS[6]; // Default indigo
  };

  // Open Create Department Modal
  const handleOpenCreateModal = () => {
    setEditingDeptId(null);
    setSelectedStandardDept('');
    setModalName('');
    setModalCode('');
    setModalHeadStaffId('');
    setModalDeputyStaffId('');
    setModalMandate('');
    setModalColor('indigo');
    setModalSelectedStaffIds([]);
    setShowDeptModal(true);
  };

  // Open Edit Department Modal
  const handleOpenEditModal = (dept: OrgDepartment) => {
    setEditingDeptId(dept.id);
    const standardMatch = STANDARD_DEPARTMENT_OPTIONS.find(d => d.name.toLowerCase() === dept.name.toLowerCase());
    if (standardMatch) {
      setSelectedStandardDept(standardMatch.name);
    } else {
      setSelectedStandardDept('OTHER');
    }
    setModalName(dept.name);
    setModalCode(dept.code);
    setModalHeadStaffId(dept.headStaffId || '');
    setModalDeputyStaffId(dept.deputyStaffId || '');
    setModalMandate(dept.mandate || '');
    setModalColor(dept.color || 'indigo');

    const linkedStaffIds = getStaffForDepartment(dept).map(s => s.id);
    setModalSelectedStaffIds(linkedStaffIds);
    setShowDeptModal(true);
  };

  const handleStandardDeptChange = (val: string) => {
    setSelectedStandardDept(val);
    if (!val) {
      setModalName('');
      setModalCode('');
      setModalMandate('');
      return;
    }
    if (val === 'OTHER') {
      setModalName('');
      setModalCode('');
      return;
    }
    const found = STANDARD_DEPARTMENT_OPTIONS.find(d => d.name === val);
    if (found) {
      setModalName(found.name);
      setModalCode(found.code);
      if (!modalMandate || STANDARD_DEPARTMENT_OPTIONS.some(d => d.mandate === modalMandate)) {
        setModalMandate(found.mandate);
      }
      setModalColor(found.color);
    }
  };

  // Open Quick Link Staff Modal
  const handleOpenLinkStaffModal = (dept: OrgDepartment) => {
    setTargetDeptForStaff(dept);
    const linkedIds = getStaffForDepartment(dept).map(s => s.id);
    setLinkStaffSelection(linkedIds);
    setStaffModalSearch('');
    setShowLinkStaffModal(true);
  };

  // Save Department (Add or Edit)
  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim() || !modalCode.trim()) return;

    const headStaff = staffDirectory.find(s => s.id === modalHeadStaffId);
    const deputyStaff = staffDirectory.find(s => s.id === modalDeputyStaffId);

    const headName = headStaff ? headStaff.fullName : 'Unassigned';
    const deputyName = deputyStaff ? deputyStaff.fullName : undefined;

    let updatedDepts: OrgDepartment[];
    let deptId = editingDeptId;

    if (editingDeptId) {
      updatedDepts = departments.map(d => {
        if (d.id === editingDeptId) {
          return {
            ...d,
            name: modalName.trim(),
            code: modalCode.trim().toUpperCase(),
            headStaffId: modalHeadStaffId,
            headStaffName: headName,
            deputyStaffId: modalDeputyStaffId || undefined,
            deputyStaffName: deputyName,
            mandate: modalMandate.trim(),
            color: modalColor
          };
        }
        return d;
      });
    } else {
      deptId = `dept-${modalCode.trim().toLowerCase()}-${Date.now()}`;
      const newDept: OrgDepartment = {
        id: deptId,
        name: modalName.trim(),
        code: modalCode.trim().toUpperCase(),
        headStaffId: modalHeadStaffId,
        headStaffName: headName,
        deputyStaffId: modalDeputyStaffId || undefined,
        deputyStaffName: deputyName,
        mandate: modalMandate.trim(),
        color: modalColor
      };
      updatedDepts = [...departments, newDept];
    }

    // Synchronize staff directory: update department, departmentId, lineManagerName, and roles
    const updatedStaffDirectory = staffDirectory.map(staff => {
      // If this staff was selected as head
      if (staff.id === modalHeadStaffId) {
        return {
          ...staff,
          department: modalName.trim(),
          departmentId: deptId!,
          isDepartmentHead: true,
          functionalRole: (staff.functionalRole === 'FinalApprover' ? 'FinalApprover' : 'DepartmentHead') as StaffMember['functionalRole']
        };
      }

      // If this staff was selected as deputy
      if (staff.id === modalDeputyStaffId) {
        return {
          ...staff,
          department: modalName.trim(),
          departmentId: deptId!,
          isDeputyHead: true,
          lineManagerId: modalHeadStaffId || staff.lineManagerId,
          lineManagerName: headName !== 'Unassigned' ? `${headName} (Head of ${modalName.trim()})` : staff.lineManagerName
        };
      }

      // If staff is in selected members list
      if (modalSelectedStaffIds.includes(staff.id)) {
        return {
          ...staff,
          department: modalName.trim(),
          departmentId: deptId!,
          lineManagerId: modalHeadStaffId || staff.lineManagerId,
          lineManagerName: headName !== 'Unassigned' ? `${headName} (Head of ${modalName.trim()})` : staff.lineManagerName
        };
      }

      // If this staff was previously in this department but removed from modalSelectedStaffIds (and isn't head/deputy)
      if (editingDeptId && (staff.departmentId === editingDeptId || staff.department === modalName)) {
        if (!modalSelectedStaffIds.includes(staff.id) && staff.id !== modalHeadStaffId && staff.id !== modalDeputyStaffId) {
          return {
            ...staff,
            department: 'General Staff',
            departmentId: undefined,
            lineManagerName: undefined,
            lineManagerId: undefined
          };
        }
      }

      return staff;
    });

    onUpdateDepartments(updatedDepts, updatedStaffDirectory);
    setShowDeptModal(false);
    showFeedback(`Department "${modalName.trim()}" successfully ${editingDeptId ? 'updated' : 'created'} with staff linkages.`);
  };

  // Save Quick Link Staff
  const handleSaveQuickLinkStaff = () => {
    if (!targetDeptForStaff) return;

    const deptId = targetDeptForStaff.id;
    const deptName = targetDeptForStaff.name;
    const headName = targetDeptForStaff.headStaffName;
    const headId = targetDeptForStaff.headStaffId;

    const updatedStaffDirectory = staffDirectory.map(staff => {
      // If staff is selected to be linked to this department
      if (linkStaffSelection.includes(staff.id)) {
        return {
          ...staff,
          department: deptName,
          departmentId: deptId,
          lineManagerId: staff.id === headId ? staff.lineManagerId : (headId || staff.lineManagerId),
          lineManagerName: staff.id === headId ? staff.lineManagerName : (headName ? `${headName} (Head of ${deptName})` : staff.lineManagerName)
        };
      }

      // If staff was in this department but unselected (and not the HoD)
      if (staff.departmentId === deptId || staff.department.toLowerCase() === deptName.toLowerCase()) {
        if (staff.id !== headId && staff.id !== targetDeptForStaff.deputyStaffId) {
          return {
            ...staff,
            department: 'General Staff',
            departmentId: undefined,
            lineManagerName: undefined,
            lineManagerId: undefined
          };
        }
      }

      return staff;
    });

    onUpdateDepartments(departments, updatedStaffDirectory);
    setShowLinkStaffModal(false);
    showFeedback(`Staff membership for "${deptName}" updated (${linkStaffSelection.length} assigned).`);
  };

  // Delete Department
  const handleDeleteDepartment = (dept: OrgDepartment) => {
    const linkedStaff = getStaffForDepartment(dept);
    const confirmMsg = linkedStaff.length > 0
      ? `Are you sure you want to delete the "${dept.name}" department? ${linkedStaff.length} staff member(s) will be unlinked and set to General Staff.`
      : `Are you sure you want to delete the "${dept.name}" department?`;

    if (!window.confirm(confirmMsg)) return;

    const updatedDepts = departments.filter(d => d.id !== dept.id);
    const updatedStaffDirectory = staffDirectory.map(s => {
      if (s.departmentId === dept.id || s.department.toLowerCase() === dept.name.toLowerCase()) {
        return {
          ...s,
          department: 'General Staff',
          departmentId: undefined,
          isDepartmentHead: false,
          isDeputyHead: false,
          lineManagerName: undefined,
          lineManagerId: undefined
        };
      }
      return s;
    });

    onUpdateDepartments(updatedDepts, updatedStaffDirectory);
    showFeedback(`Department "${dept.name}" deleted.`);
  };

  // Quick Change Head
  const handleQuickAssignHead = (dept: OrgDepartment, newHeadId: string) => {
    const newHead = staffDirectory.find(s => s.id === newHeadId);
    if (!newHead) return;

    const updatedDepts = departments.map(d => {
      if (d.id === dept.id) {
        return {
          ...d,
          headStaffId: newHead.id,
          headStaffName: newHead.fullName
        };
      }
      return d;
    });

    const updatedStaff = staffDirectory.map(s => {
      if (s.id === newHeadId) {
        return {
          ...s,
          department: dept.name,
          departmentId: dept.id,
          isDepartmentHead: true,
          functionalRole: (s.functionalRole === 'FinalApprover' ? 'FinalApprover' : 'DepartmentHead') as StaffMember['functionalRole']
        };
      }
      // If s was previous head of this dept
      if (s.id === dept.headStaffId && s.id !== newHeadId) {
        return {
          ...s,
          isDepartmentHead: false
        };
      }
      // If staff belongs to this dept, update line manager
      if (s.departmentId === dept.id || s.department.toLowerCase() === dept.name.toLowerCase()) {
        if (s.id !== newHeadId) {
          return {
            ...s,
            lineManagerId: newHead.id,
            lineManagerName: `${newHead.fullName} (Head of ${dept.name})`
          };
        }
      }
      return s;
    });

    onUpdateDepartments(updatedDepts, updatedStaff);
    showFeedback(`${newHead.fullName} assigned as Head of ${dept.name}.`);
  };

  // Quick Remove Staff from Unit
  const handleRemoveStaffFromUnit = (staffId: string, dept: OrgDepartment) => {
    const staff = staffDirectory.find(s => s.id === staffId);
    if (!staff) return;

    if (staff.id === dept.headStaffId) {
      if (!window.confirm(`${staff.fullName} is the designated Department Head. Removing them will leave this department without a Line Manager. Proceed?`)) {
        return;
      }
    }

    const updatedStaff = staffDirectory.map(s => {
      if (s.id === staffId) {
        return {
          ...s,
          department: 'General Staff',
          departmentId: undefined,
          isDepartmentHead: false,
          isDeputyHead: false,
          lineManagerName: undefined,
          lineManagerId: undefined
        };
      }
      return s;
    });

    let updatedDepts = departments;
    if (staff.id === dept.headStaffId) {
      updatedDepts = departments.map(d => {
        if (d.id === dept.id) {
          return { ...d, headStaffId: '', headStaffName: 'Unassigned' };
        }
        return d;
      });
    }

    onUpdateDepartments(updatedDepts, updatedStaff);
    showFeedback(`${staff.fullName} removed from ${dept.name}.`);
  };

  // Calculate statistics
  const totalStaffCount = staffDirectory.filter(s => s.status === 'Active').length;
  const assignedHeadsCount = departments.filter(d => d.headStaffId && d.headStaffName !== 'Unassigned').length;
  const linkedStaffCount = staffDirectory.filter(s => s.departmentId || departments.some(d => d.name === s.department)).length;
  const unassignedStaffCount = staffDirectory.filter(s => !s.departmentId && !departments.some(d => d.name === s.department)).length;

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Multi-Department Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Institutional Hierarchy & Governance
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Supervisory review chains & proposal quality sign-offs
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Department Management & Reporting Units
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Define operational departments, assign designated <strong>Department Heads (Line Managers)</strong> with supervisory sign-off authority, and link officers to units to enforce cross-departmental accountability during proposal preparation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              id="add-department-btn"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Department
            </button>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[11px] font-bold uppercase text-slate-500">Total Departments</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              {departments.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Configured organizational units</div>
          </div>

          <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl">
            <div className="text-[11px] font-bold uppercase text-indigo-700">Assigned Dept Heads</div>
            <div className="text-xl font-extrabold text-indigo-900 mt-0.5 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              {assignedHeadsCount} / {departments.length}
            </div>
            <div className="text-[10px] text-indigo-700 mt-0.5">Line managers with sign-off rights</div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
            <div className="text-[11px] font-bold uppercase text-emerald-700">Linked Staff Members</div>
            <div className="text-xl font-extrabold text-emerald-900 mt-0.5 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              {linkedStaffCount}
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Active team members in units</div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-[11px] font-bold uppercase text-slate-500">Unlinked Staff</div>
            <div className={`text-xl font-extrabold mt-0.5 flex items-center gap-1.5 ${unassignedStaffCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              <Users className="w-4 h-4 text-slate-400" />
              {unassignedStaffCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {unassignedStaffCount > 0 ? 'Staff needing unit assignment' : 'All staff mapped to departments'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search departments by name, code, head, or mandate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredDepartments.length} of {departments.length} units
          </span>
          {onNavigateToStaff && (
            <button
              onClick={() => onNavigateToStaff()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              View Full Staff Directory
            </button>
          )}
        </div>
      </div>

      {/* Empty State when 0 departments configured */}
      {departments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Departments Configured</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Your organisation currently has 0 departments. Create operational units (such as Programmes, Finance, M&E, or Executive) to establish supervisory review chains and proposal sign-off workflows.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create First Department
          </button>
        </div>
      ) : (
        /* Departments Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDepartments.map((dept) => {
          const colorStyle = getColorStyle(dept.color);
          const deptStaff = getStaffForDepartment(dept);
          const headMember = staffDirectory.find(s => s.id === dept.headStaffId);
          const deputyMember = staffDirectory.find(s => s.id === dept.deputyStaffId);
          const nonHeadStaff = deptStaff.filter(s => s.id !== dept.headStaffId && s.id !== dept.deputyStaffId);

          return (
            <div
              key={dept.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between overflow-hidden"
            >
              <div>
                {/* Department Header Banner */}
                <div className={`p-4 border-b ${colorStyle.bg} ${colorStyle.border} flex items-start justify-between gap-3`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-white border ${colorStyle.border} flex items-center justify-center font-extrabold text-sm ${colorStyle.text} shadow-xs`}>
                      {dept.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colorStyle.badge}`}>
                          {deptStaff.length} {deptStaff.length === 1 ? 'Member' : 'Members'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Unit Code: <strong className="font-mono text-slate-700">[{dept.code}]</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(dept)}
                      title="Edit Department"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDepartment(dept)}
                      title="Delete Department"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Department Mandate */}
                  {dept.mandate && (
                    <div className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      <span className="font-bold text-slate-700 block mb-0.5 text-[11px] uppercase tracking-wider">Mandate & Responsibilities:</span>
                      {dept.mandate}
                    </div>
                  )}

                  {/* Department Head (Line Manager) Box */}
                  <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Department Head (Line Manager)
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        Sign-Off Authority
                      </span>
                    </div>

                    {headMember ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {headMember.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{headMember.fullName}</div>
                            <div className="text-[11px] text-slate-500">{headMember.jobTitle}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {headMember.email ? (
                            <span className="text-[10px] text-slate-400 font-mono block">{headMember.email}</span>
                          ) : null}
                          <span className="text-[10px] font-semibold text-indigo-600">Reviews & Approves Sections</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>No Department Head assigned</span>
                        </div>
                        <select
                          onChange={(e) => handleQuickAssignHead(dept, e.target.value)}
                          defaultValue=""
                          className="px-2 py-1 text-xs rounded border border-amber-300 bg-white font-medium text-slate-700"
                        >
                          <option value="" disabled>Assign HoD...</option>
                          {staffDirectory.filter(s => s.status === 'Active').map(s => (
                            <option key={s.id} value={s.id}>{s.fullName} ({s.jobTitle})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Deputy Head (if assigned) */}
                  {deputyMember && (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="text-slate-500 text-[11px]">Deputy Head: </span>
                          <strong className="text-slate-800 font-semibold">{deputyMember.fullName}</strong>
                          <span className="text-slate-500 text-[11px]"> ({deputyMember.jobTitle})</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        Alternate Reviewer
                      </span>
                    </div>
                  )}

                  {/* Linked Staff Members Roster */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        Assigned Unit Staff ({deptStaff.length})
                      </h4>
                      <button
                        onClick={() => handleOpenLinkStaffModal(dept)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Manage Roster
                      </button>
                    </div>

                    {deptStaff.length === 0 ? (
                      <div className="text-center py-4 px-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                        No staff officers linked to this department yet.
                        <button
                          onClick={() => handleOpenLinkStaffModal(dept)}
                          className="block mx-auto mt-1 font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          + Link staff members now
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {deptStaff.map(staff => (
                          <div
                            key={staff.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50/60 border border-slate-200/80 text-xs hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {staff.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-slate-900 truncate block">{staff.fullName}</span>
                                <span className="text-[10px] text-slate-500 truncate block">{staff.jobTitle}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {staff.id === dept.headStaffId ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                  HoD
                                </span>
                              ) : staff.id === dept.deputyStaffId ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Deputy
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">
                                  Officer
                                </span>
                              )}

                              <button
                                onClick={() => handleRemoveStaffFromUnit(staff.id, dept)}
                                title="Remove from department"
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Department Card Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenLinkStaffModal(dept)}
                  className="font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Link Staff ({deptStaff.length})
                </button>

                <button
                  onClick={() => handleOpenEditModal(dept)}
                  className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Unit
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT DEPARTMENT MODAL */}
      {/* ========================================================================= */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingDeptId ? 'Edit Department Unit' : 'Create New Department Unit'}
              </h3>
              <button
                onClick={() => setShowDeptModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="py-4 space-y-4 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department / Unit *</label>
                  <select
                    value={selectedStandardDept}
                    onChange={(e) => handleStandardDeptChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    <option value="">Select a department...</option>
                    {STANDARD_DEPARTMENT_OPTIONS.map(d => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                    <option value="OTHER">Other / Custom Department</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedStandardDept === 'OTHER' && (
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Custom Department Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Safeguarding Unit"
                        value={modalName}
                        onChange={(e) => setModalName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  )}
                  <div className={selectedStandardDept === 'OTHER' ? '' : 'sm:col-span-3'}>
                    <label className="block font-bold text-slate-700 mb-1">Unit Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      placeholder="e.g. M&E"
                      value={modalCode}
                      onChange={(e) => setModalCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Color Badge Theme</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setModalColor(c.id)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${
                        modalColor === c.id
                          ? `${c.bg} ${c.border} ring-2 ring-indigo-500 font-bold ${c.text}`
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] truncate">{c.label}</span>
                      {modalColor === c.id && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {staffDirectory.filter(s => s.role !== 'Admin' && !s.id?.includes('admin')).length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-relaxed">
                  Department heads and staff members are assigned later, after staff have been onboarded. Create the department now, then assign its head and members from the staff stage once staff records exist.
                </div>
              ) : (
              <>
              {/* Department Head (Line Manager) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Designated Department Head (Line Manager) *
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  This person will hold quality review and sign-off authority for tasks submitted by this department.
                </p>
                <select
                  value={modalHeadStaffId}
                  onChange={(e) => {
                    setModalHeadStaffId(e.target.value);
                    if (!modalSelectedStaffIds.includes(e.target.value) && e.target.value) {
                      setModalSelectedStaffIds(prev => [...prev, e.target.value]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                >
                  <option value="">Select a Staff Member as Department Head...</option>
                  {staffDirectory.filter(s => s.status === 'Active').map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.jobTitle} ({s.department || 'Unassigned'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deputy Head (Optional) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Deputy Head / Alternate Approver (Optional)
                </label>
                <select
                  value={modalDeputyStaffId}
                  onChange={(e) => {
                    setModalDeputyStaffId(e.target.value);
                    if (!modalSelectedStaffIds.includes(e.target.value) && e.target.value) {
                      setModalSelectedStaffIds(prev => [...prev, e.target.value]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                >
                  <option value="">No Deputy Head (Optional)</option>
                  {staffDirectory.filter(s => s.status === 'Active' && s.id !== modalHeadStaffId).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.jobTitle}
                    </option>
                  ))}
                </select>
              </div>
              </>
              )}

              {/* Department Mandate */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Core Institutional Mandate & Scope</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Responsible for results frameworks, logframe indicators, data collection tools, baseline surveys, and MEL plans across all active proposals."
                  value={modalMandate}
                  onChange={(e) => setModalMandate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              {staffDirectory.filter(s => s.role !== 'Admin' && !s.id?.includes('admin')).length > 0 && (
              <>
              {/* Link Staff Members to this Unit Checklist */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700">
                    Assign Staff Members to this Unit ({modalSelectedStaffIds.length} Selected)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Checked staff will report to this unit's Head
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {sortStaffByHierarchy(staffDirectory).map(staff => {
                    const isSelected = modalSelectedStaffIds.includes(staff.id);
                    const isHead = staff.id === modalHeadStaffId;
                    const isDeputy = staff.id === modalDeputyStaffId;

                    return (
                      <label
                        key={staff.id}
                        className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isHead || isDeputy}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModalSelectedStaffIds(prev => [...prev, staff.id]);
                              } else {
                                setModalSelectedStaffIds(prev => prev.filter(id => id !== staff.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {staff.fullName}
                              {isHead && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">Head</span>}
                              {isDeputy && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">Deputy</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">{staff.jobTitle}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Current: {staff.department || 'Unassigned'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              </>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingDeptId ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK LINK STAFF ROSTER MODAL */}
      {/* ========================================================================= */}
      {showLinkStaffModal && targetDeptForStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  Manage Staff Roster: {targetDeptForStaff.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check staff members to link them to this unit under Line Manager {targetDeptForStaff.headStaffName}.
                </p>
              </div>
              <button
                onClick={() => setShowLinkStaffModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter staff by name or job title..."
                  value={staffModalSearch}
                  onChange={(e) => setStaffModalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-64">
              {staffDirectory
                .filter(s =>
                  s.fullName.toLowerCase().includes(staffModalSearch.toLowerCase()) ||
                  s.jobTitle.toLowerCase().includes(staffModalSearch.toLowerCase())
                )
                .map(staff => {
                  const isChecked = linkStaffSelection.includes(staff.id);
                  const isHead = staff.id === targetDeptForStaff.headStaffId;
                  const isDeputy = staff.id === targetDeptForStaff.deputyStaffId;

                  return (
                    <label
                      key={staff.id}
                      className={`flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer text-xs ${
                        isChecked ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isHead}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLinkStaffSelection(prev => [...prev, staff.id]);
                            } else {
                              setLinkStaffSelection(prev => prev.filter(id => id !== staff.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {staff.fullName}
                            {isHead && (
                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                                Head of Dept
                              </span>
                            )}
                            {isDeputy && (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                                Deputy
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{staff.jobTitle}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          staff.department === targetDeptForStaff.name
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {staff.department || 'Unassigned'}
                        </span>
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4 text-xs">
              <span className="text-slate-500 font-medium">
                {linkStaffSelection.length} staff selected for this department
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkStaffModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickLinkStaff}
                  className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Unit Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

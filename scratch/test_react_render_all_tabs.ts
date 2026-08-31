import React from 'react';
import { renderToString } from 'react-dom/server';
import { initialOrgProfile, sampleOpportunities, initialInstitutionalMemory } from '../src/data/seedData';
import { DashboardView } from '../src/components/DashboardView';
import { OpportunityScoutView } from '../src/components/OpportunityScoutView';
import { AnalyseFundingCallView } from '../src/components/AnalyseFundingCallView';
import { WorkspaceView } from '../src/components/WorkspaceView';
import { WorkspacesListView } from '../src/components/WorkspacesListView';
import { InstitutionalMemoryView } from '../src/components/InstitutionalMemoryView';
import { OrgProfileView } from '../src/components/OrgProfileView';

console.log('Testing rendering of all individual views...');

try {
  console.log('1. Testing DashboardView...');
  const h1 = renderToString(React.createElement(DashboardView, {
    opportunities: sampleOpportunities,
    staffDirectory: initialOrgProfile.staffDirectory || [],
    orgProfile: initialOrgProfile,
    currentUser: {
      id: 'u1',
      email: 'test@org.com',
      fullName: 'Test User',
      role: 'Admin',
      roles: ['Admin'],
      organizationId: 'org-demo-01',
      organizationName: 'Test Org',
      createdAt: new Date().toISOString()
    },
    onSelectWorkspace: () => {},
    onUpdateWorkspace: () => {},
    onNavigateToAnalyze: () => {},
  }));
  console.log('✅ DashboardView rendered! Length:', h1.length);

  console.log('2. Testing OpportunityScoutView...');
  const h2 = renderToString(React.createElement(OpportunityScoutView, {
    orgProfile: initialOrgProfile,
    onPursueOpportunity: () => {},
    onNavigateToOrgPreferences: () => {},
    onOpenWorkspace: () => {},
  }));
  console.log('✅ OpportunityScoutView rendered! Length:', h2.length);

  console.log('3. Testing AnalyseFundingCallView...');
  const h3 = renderToString(React.createElement(AnalyseFundingCallView, {
    orgProfile: initialOrgProfile,
    onPursueOpportunity: () => {},
  }));
  console.log('✅ AnalyseFundingCallView rendered! Length:', h3.length);

  console.log('4. Testing WorkspacesListView...');
  const h4 = renderToString(React.createElement(WorkspacesListView, {
    opportunities: sampleOpportunities,
    onSelectWorkspace: () => {},
    onNavigateToAnalyze: () => {},
  }));
  console.log('✅ WorkspacesListView rendered! Length:', h4.length);

  console.log('5. Testing WorkspaceView...');
  const h5 = renderToString(React.createElement(WorkspaceView, {
    workspace: sampleOpportunities[0],
    staffDirectory: initialOrgProfile.staffDirectory || [],
    orgProfile: initialOrgProfile,
    onUpdateWorkspace: () => {},
    onBackToList: () => {},
  }));
  console.log('✅ WorkspaceView rendered! Length:', h5.length);

  console.log('6. Testing InstitutionalMemoryView...');
  const h6 = renderToString(React.createElement(InstitutionalMemoryView, {
    records: initialInstitutionalMemory,
    onAddRecord: () => {},
  }));
  console.log('✅ InstitutionalMemoryView rendered! Length:', h6.length);

  console.log('7. Testing OrgProfileView (all sub-tabs)...');
  for (const tab of ['details', 'documents', 'preferences', 'staff', 'departments']) {
    const h7 = renderToString(React.createElement(OrgProfileView, {
      profile: initialOrgProfile,
      onSaveProfile: () => {},
      onResetToDemo: () => {},
      initialSubTab: tab as any,
    }));
    console.log(`✅ OrgProfileView (${tab}) rendered! Length:`, h7.length);
  }

  console.log('\n🎉 ALL VIEWS RENDERED SUCCESSFULLY WITHOUT THROWING!');
} catch (e) {
  console.error('❌ Render error:', e);
  process.exit(1);
}

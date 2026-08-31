import { OpportunityWorkspace, OrgProfile, GeneratedApplicationVersion } from '../types';
import { sanitizeFileName } from './docxExport';

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an Excel SpreadsheetML XML file (.xls/.xlsx compatible) containing
 * all mapped donor sections, institutional details, and supporting document checklists.
 */
export async function generateCompletedXlsx(
  workspace: OpportunityWorkspace,
  orgProfile: OrgProfile,
  isFinal: boolean,
  versionNumber: number
): Promise<{ blob: Blob; fileName: string; versionRecord: GeneratedApplicationVersion }> {
  const sections = workspace.applicationSections || [];
  const approvedSections = sections.filter(
    (s) => s.reviewStatus === 'Department Approved' || s.reviewStatus === 'Proposal Lead Approved'
  );

  const orgName = orgProfile?.name || 'Organisation';
  const oppTitle = workspace.title || 'Grant_Application';
  const statusLabel: 'Draft' | 'Final' = isFinal ? 'Final' : 'Draft';
  const fileName = `${sanitizeFileName(orgName)}_${sanitizeFileName(oppTitle)}_${statusLabel}_v${versionNumber}.xls`;

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubHeader">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Bold="1" ss:Color="#475569"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="DataCellBold">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
  </Style>
 </Styles>

 <Worksheet ss:Name="Application Narrative">
  <Table ss:DefaultColumnWidth="120" ss:DefaultRowHeight="20">
   <Column ss:Width="60"/>
   <Column ss:Width="260"/>
   <Column ss:Width="180"/>
   <Column ss:Width="80"/>
   <Column ss:Width="380"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="120"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="7" ss:StyleID="HeaderTitle">
     <Data ss:Type="String">${escapeXml(workspace.title)} — ${escapeXml(workspace.donor)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="7" ss:StyleID="SubHeader">
     <Data ss:Type="String">Applicant: ${escapeXml(orgProfile.name)} | Status: ${escapeXml(statusLabel)} v${versionNumber} | Generated: ${escapeXml(new Date().toLocaleDateString())}</Data>
    </Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>

   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Q #</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Exact Donor Question</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Donor Instructions</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Word Limit</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Approved GrantFlow Response</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Assigned Department</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Lead Officer</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Review Status</Data></Cell>
   </Row>

   ${sections
     .map(
       (sec) => `
   <Row ss:Height="60">
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(sec.sectionNumber)}</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(sec.donorQuestion)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sec.donorInstructions || 'N/A')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="Number">${sec.wordLimit || 0}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sec.draftResponse || '[No draft submitted]')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sec.assignedDepartment)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(sec.assignedStaff)}</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(sec.reviewStatus)}</Data></Cell>
   </Row>`
     )
     .join('')}
  </Table>
 </Worksheet>

 <Worksheet ss:Name="Supporting Documents">
  <Table ss:DefaultColumnWidth="150" ss:DefaultRowHeight="22">
   <Column ss:Width="280"/>
   <Column ss:Width="160"/>
   <Column ss:Width="100"/>
   <Column ss:Width="130"/>
   <Column ss:Width="200"/>

   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Required Document</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Mandatory</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Readiness Status</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Assigned Assignee</Data></Cell>
   </Row>

   ${workspace.documentsChecklist
     .map(
       (doc) => `
   <Row>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(doc.name)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(doc.category)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${doc.mandatory ? 'YES' : 'NO'}</Data></Cell>
    <Cell ss:StyleID="DataCellBold"><Data ss:Type="String">${escapeXml(doc.status)}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(doc.assignedTo || 'Unassigned')}</Data></Cell>
   </Row>`
     )
     .join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });

  const versionRecord: GeneratedApplicationVersion = {
    id: `ver-${Date.now()}-${versionNumber}`,
    versionNumber,
    label: `Application_v${versionNumber} — ${statusLabel}`,
    format: 'XLSX',
    fileName,
    fileSize: `${Math.round(blob.size / 1024)} KB`,
    status: statusLabel,
    generatedAt: new Date().toISOString(),
    generatedBy: workspace.proposalLead || 'Proposal Lead',
    isFinalSubmission: isFinal,
    mappedSectionsCount: sections.length,
    approvedSectionsCount: approvedSections.length,
    notes: isFinal
      ? `Final submission spreadsheet generated with ${approvedSections.length}/${sections.length} approved sections.`
      : 'Draft working spreadsheet generated for review.'
  };

  return { blob, fileName, versionRecord };
}

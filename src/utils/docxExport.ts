import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber
} from 'docx';
import { OpportunityWorkspace, OrgProfile, ApplicationSection, GeneratedApplicationVersion } from '../types';

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 60);
}

export async function generateCompletedDocx(
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
  const donorName = workspace.donor || 'Donor';
  const statusLabel: 'Draft' | 'Final' = isFinal ? 'Final' : 'Draft';
  const fileName = `${sanitizeFileName(orgName)}_${sanitizeFileName(oppTitle)}_${statusLabel}_v${versionNumber}.docx`;

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: isFinal
        ? 'COMPLETED GRANT APPLICATION — FINAL SUBMISSION VERSION'
        : 'GRANT APPLICATION — DRAFT WORKING COPY (NOT FINAL)',
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: workspace.title,
          bold: true,
          size: 32,
          color: '1E293B'
        })
      ],
      spacing: { after: 120 }
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Donor: ${donorName} | Funding Scope: ${workspace.fundingAmount || 'Amount TBD'} ${workspace.currency || 'USD'}`,
          bold: true,
          size: 22,
          color: '475569'
        })
      ],
      spacing: { after: 240 }
    })
  );

  const tableRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Applicant Organisation:', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 6500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: `${orgProfile.name} (${orgProfile.country})`, size: 18 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Registration & Status:', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 6500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: `${orgProfile.registrationStatus || 'Registered NGO'} • Established ${orgProfile.yearEstablished || 'N/A'}`, size: 18 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Proposal Leadership:', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 6500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: `Proposal Lead: ${workspace.proposalLead || 'Lead Writer'} • Final Approver: ${workspace.finalApprover || 'Executive Director'}`, size: 18 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Submission Deadline:', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 6500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: `${workspace.deadline || 'Deadline TBD'}`, size: 18 })] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Document Status & Version:', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 6500, type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: `Version ${versionNumber} (${statusLabel}) • Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, size: 18, bold: true })] })]
        })
      ]
    })
  ];

  children.push(
    new Table({
      rows: tableRows,
      width: { size: 9500, type: WidthType.DXA }
    })
  );

  children.push(
    new Paragraph({
      text: '',
      spacing: { after: 200 }
    })
  );

  children.push(
    new Paragraph({
      text: 'APPLICATION NARRATIVE & RESPONSES',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 180 }
    })
  );

  sections.forEach((sec) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${sec.sectionNumber ? sec.sectionNumber + ': ' : ''}${sec.donorQuestion}`,
            bold: true,
            size: 24,
            color: '0F172A'
          })
        ],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 80 }
      })
    );

    if (sec.donorInstructions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Donor Instructions: ',
              bold: true,
              italics: true,
              size: 18,
              color: '4338CA'
            }),
            new TextRun({
              text: sec.donorInstructions,
              italics: true,
              size: 18,
              color: '4338CA'
            }),
            sec.wordLimit
              ? new TextRun({
                  text: ` (Word Limit: ${sec.wordLimit} words)`,
                  bold: true,
                  size: 18,
                  color: '312E81'
                })
              : new TextRun({ text: '' })
          ],
          spacing: { after: 120 }
        })
      );
    }

    const responseText = sec.draftResponse?.trim() || '[No response drafted yet.]';
    const paragraphs = responseText.split('\n\n');

    paragraphs.forEach((p) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: p.trim(),
              size: 21,
              color: '1E293B'
            })
          ],
          spacing: { after: 120 }
        })
      );
    });

    const wordCount = sec.draftResponse ? sec.draftResponse.trim().split(/\s+/).filter(Boolean).length : 0;
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[Assigned: ${sec.assignedDepartment} (${sec.assignedStaff}) | Head: ${sec.departmentHead} | Status: ${sec.reviewStatus} | Word Count: ${wordCount}${sec.wordLimit ? ' / ' + sec.wordLimit : ''}]`,
            size: 16,
            color: '64748B',
            italics: true
          })
        ],
        spacing: { after: 260 }
      })
    );
  });

  children.push(
    new Paragraph({
      text: 'REQUIRED SUPPORTING ATTACHMENTS & VERIFICATION',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 180 }
    })
  );

  const docRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Required Attachment', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 2500, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: 2500, type: WidthType.DXA },
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: 'Readiness Status', bold: true, size: 18 })] })]
        })
      ]
    })
  ];

  workspace.documentsChecklist.forEach((doc) => {
    docRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4500, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: doc.name, size: 18 }),
                  doc.mandatory ? new TextRun({ text: ' (Mandatory)', bold: true, color: 'DC2626', size: 16 }) : new TextRun({ text: '' })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 2500, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: doc.category, size: 18 })] })]
          }),
          new TableCell({
            width: { size: 2500, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: doc.status === 'Ready' || doc.status === 'Signed' ? `✓ ${doc.status}` : `✗ ${doc.status}`,
                    bold: true,
                    color: doc.status === 'Ready' || doc.status === 'Signed' ? '059669' : 'D97706',
                    size: 18
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  });

  children.push(
    new Table({
      rows: docRows,
      width: { size: 9500, type: WidthType.DXA }
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `GrantFlow • ${orgProfile.name} • ${workspace.donor} Proposal [${statusLabel} v${versionNumber}]`,
                    size: 16,
                    color: '94A3B8'
                  })
                ],
                alignment: AlignmentType.RIGHT
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Generated via GrantFlow Application Workspace • Page ',
                    size: 16,
                    color: '94A3B8'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8'
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ]
          })
        },
        children
      }
    ]
  });

  const blob = await Packer.toBlob(doc);

  const versionRecord: GeneratedApplicationVersion = {
    id: `ver-${Date.now()}-${versionNumber}`,
    versionNumber,
    label: `Application_v${versionNumber} — ${statusLabel}`,
    format: 'DOCX',
    fileName,
    fileSize: `${Math.round(blob.size / 1024)} KB`,
    status: statusLabel,
    generatedAt: new Date().toISOString(),
    generatedBy: workspace.proposalLead || 'Proposal Lead',
    isFinalSubmission: isFinal,
    mappedSectionsCount: sections.length,
    approvedSectionsCount: approvedSections.length,
    notes: isFinal
      ? `Final submission document generated with ${approvedSections.length}/${sections.length} approved sections.`
      : 'Draft working copy generated for review.'
  };

  return { blob, fileName, versionRecord };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

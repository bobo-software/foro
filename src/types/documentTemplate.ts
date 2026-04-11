/**
 * Document template types and predefined template configurations.
 *
 * Each template controls header layout, color scheme, table style,
 * and footer style for PDF document generation.
 */

/** Supported template identifiers */
export type DocumentTemplateId = 'classic' | 'modern' | 'minimal';

/** RGB color tuple */
export type RGB = [number, number, number];

/** Full template configuration consumed by PDF renderers */
export interface DocumentTemplateConfig {
  id: DocumentTemplateId;
  name: string;
  description: string;

  /* ---- Colors ---- */
  /** Primary accent color (headings, bars, highlights) */
  primaryColor: RGB;
  /** Secondary text color (addresses, details) */
  secondaryTextColor: RGB;
  /** Main body text color */
  textColor: RGB;

  /* ---- Header ---- */
  /** Draw a colored accent bar across the top of the page */
  accentBar: boolean;
  /** Height of the accent bar in mm (only used when accentBar=true) */
  accentBarHeight: number;
  /** Logo position: 'left' places it before the business name, 'right' places it top-right */
  logoPosition: 'left' | 'right';
  /** Max logo width in mm */
  logoMaxWidth: number;
  /** Max logo height in mm */
  logoMaxHeight: number;

  /* ---- Table ---- */
  /** Background color for the table header row */
  tableHeaderBg: RGB;
  /** Text color for the table header row */
  tableHeaderText: RGB;
  /** Draw full borders around the table */
  tableBorders: boolean;
  /** Draw vertical column dividers inside the table */
  tableColumnDividers: boolean;
  /** Use alternating row backgrounds */
  tableAlternateRows: boolean;
  /** Background color for alternating rows */
  tableAlternateRowBg: RGB;

  /* ---- Totals ---- */
  /** Use a box/background behind the totals section */
  totalsBoxed: boolean;

  /* ---- Footer ---- */
  /** Draw a thin accent line above the footer */
  footerAccentLine: boolean;

  /**
   * Invoice PDF export only: smaller fonts and tighter vertical spacing so the
   * downloaded PDF matches compact browser print (does not affect quotations /
   * settings preview unless they opt in).
   */
  compactTypography?: boolean;
}

/** Human-friendly template metadata for the settings UI picker cards */
export interface DocumentTemplateInfo {
  id: DocumentTemplateId;
  name: string;
  description: string;
}

// ─── Predefined Templates ─────────────────────────────────────────────────────

const classicTemplate: DocumentTemplateConfig = {
  id: 'classic',
  name: 'Classic',
  description: 'Traditional layout with bordered tables and gray tones. Conservative and familiar.',

  primaryColor: [0, 0, 0],
  secondaryTextColor: [80, 80, 80],
  textColor: [0, 0, 0],

  accentBar: false,
  accentBarHeight: 0,
  logoPosition: 'left',
  logoMaxWidth: 30,
  logoMaxHeight: 15,

  tableHeaderBg: [240, 240, 240],
  tableHeaderText: [60, 60, 60],
  tableBorders: true,
  tableColumnDividers: true,
  tableAlternateRows: true,
  tableAlternateRowBg: [250, 250, 250],

  totalsBoxed: false,

  footerAccentLine: false,
};

const modernTemplate: DocumentTemplateConfig = {
  id: 'modern',
  name: 'Modern',
  description: 'Bold accent bar, colored header, and a clean professional look.',

  primaryColor: [59, 130, 246],       // Indigo-blue
  secondaryTextColor: [100, 116, 139], // Slate-500
  textColor: [15, 23, 42],            // Slate-900

  accentBar: true,
  accentBarHeight: 4,
  logoPosition: 'right',
  logoMaxWidth: 35,
  logoMaxHeight: 18,

  tableHeaderBg: [59, 130, 246],      // Primary blue
  tableHeaderText: [255, 255, 255],   // White
  tableBorders: false,
  tableColumnDividers: false,
  tableAlternateRows: true,
  tableAlternateRowBg: [241, 245, 249], // Slate-100

  totalsBoxed: true,

  footerAccentLine: true,
};

const minimalTemplate: DocumentTemplateConfig = {
  id: 'minimal',
  name: 'Minimal',
  description: 'Clean, spacious layout with subtle lines and generous whitespace.',

  primaryColor: [51, 65, 85],         // Slate-700
  secondaryTextColor: [148, 163, 184], // Slate-400
  textColor: [30, 41, 59],            // Slate-800

  accentBar: false,
  accentBarHeight: 0,
  logoPosition: 'left',
  logoMaxWidth: 28,
  logoMaxHeight: 14,

  tableHeaderBg: [255, 255, 255],     // White (no fill)
  tableHeaderText: [148, 163, 184],   // Slate-400
  tableBorders: false,
  tableColumnDividers: false,
  tableAlternateRows: false,
  tableAlternateRowBg: [255, 255, 255],

  totalsBoxed: false,

  footerAccentLine: false,
};

// ─── Exports ──────────────────────────────────────────────────────────────────

/** Map of template ID -> full config */
export const PREDEFINED_TEMPLATES: Record<DocumentTemplateId, DocumentTemplateConfig> = {
  classic: classicTemplate,
  modern: modernTemplate,
  minimal: minimalTemplate,
};

/** Ordered list of templates for the UI picker */
export const TEMPLATE_LIST: DocumentTemplateInfo[] = [
  { id: 'classic', name: 'Classic', description: classicTemplate.description },
  { id: 'modern', name: 'Modern', description: modernTemplate.description },
  { id: 'minimal', name: 'Minimal', description: minimalTemplate.description },
];

/** Get template config by ID, falling back to classic */
export function getTemplateConfig(id?: DocumentTemplateId | string | null): DocumentTemplateConfig {
  if (id && id in PREDEFINED_TEMPLATES) {
    return PREDEFINED_TEMPLATES[id as DocumentTemplateId];
  }
  return PREDEFINED_TEMPLATES.classic;
}

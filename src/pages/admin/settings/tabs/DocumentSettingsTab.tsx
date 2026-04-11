import { useState, useEffect, useCallback } from 'react';
import { LuEye } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import BusinessService from '@/services/businessService';
import { clearLogoCache } from '@/utils/pdfLogoHelper';
import { generatePreviewPdf } from '@/utils/pdfTemplates/previewPdf';
import {
  TEMPLATE_LIST,
  type DocumentTemplateId,
} from '@/types/documentTemplate';

/**
 * Settings > Documents tab.
 * Lets the user pick a PDF template for quotations and statements (Classic / Modern / Minimal),
 * toggle logo on documents, and note that invoices use a fixed classic layout.
 */
export function DocumentSettingsTab() {
  const business = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);

  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateId>('classic');
  const [showLogo, setShowLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewing, setPreviewing] = useState<DocumentTemplateId | null>(null);

  // Sync state from business on load
  useEffect(() => {
    if (business) {
      setSelectedTemplate((business.document_template as DocumentTemplateId) || 'classic');
      setShowLogo(business.show_logo_on_documents ?? false);
    }
  }, [business]);

  const handleSelectTemplate = useCallback((id: DocumentTemplateId) => {
    setSelectedTemplate(id);
    setDirty(true);
  }, []);

  const handleToggleLogo = useCallback(() => {
    setShowLogo((prev) => !prev);
    setDirty(true);
  }, []);

  const handlePreview = useCallback(async (id: DocumentTemplateId) => {
    setPreviewing(id);
    try {
      await generatePreviewPdf(id);
    } catch (err) {
      console.error('Failed to generate preview:', err);
      toast.error('Failed to generate preview');
    } finally {
      setPreviewing(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!business?.id) return;
    setSaving(true);
    try {
      await BusinessService.update(business.id, {
        document_template: selectedTemplate,
        show_logo_on_documents: showLogo,
      });
      // Update local store
      setCurrentBusiness({
        ...business,
        document_template: selectedTemplate,
        show_logo_on_documents: showLogo,
      });
      clearLogoCache();
      setDirty(false);
      toast.success('Document settings saved');
    } catch (err) {
      console.error('Failed to save document settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [business, selectedTemplate, showLogo, setCurrentBusiness]);

  const hasLogo = Boolean(business?.logo_url);

  return (
    <div className="space-y-8">
      {/* Template Picker */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          Document Template
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Choose the look and feel for quotations and account statements. Invoices always use the same classic layout as the on-screen preview.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEMPLATE_LIST.map((tmpl) => {
            const isSelected = selectedTemplate === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={`relative flex flex-col items-center rounded-xl border-2 p-4 transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                {/* Mini preview illustration */}
                <TemplatePreviewSvg templateId={tmpl.id} isSelected={isSelected} />

                <span className={`mt-3 text-sm font-semibold ${
                  isSelected
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {tmpl.name}
                </span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center">
                  {tmpl.description}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(tmpl.id);
                  }}
                  disabled={previewing === tmpl.id}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewing === tmpl.id ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <LuEye className="w-3.5 h-3.5" />
                      Preview Example
                    </>
                  )}
                </button>

                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Logo Toggle */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          Logo on Documents
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Include your company logo in the header of exported PDFs.
        </p>

        <div className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Show logo on documents</p>
            {!hasLogo && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                No logo uploaded yet.{' '}
                <a
                  href="/app/settings"
                  className="underline hover:text-amber-700 dark:hover:text-amber-300"
                >
                  Upload one in Business settings
                </a>
                .
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleLogo}
            disabled={!hasLogo}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              !hasLogo
                ? 'bg-slate-200 dark:bg-slate-700 opacity-50 cursor-not-allowed'
                : showLogo
                  ? 'bg-indigo-600'
                  : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showLogo && hasLogo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Document Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Template Preview SVG Components ──────────────────────────────────────────

function TemplatePreviewSvg({ templateId, isSelected }: { templateId: DocumentTemplateId; isSelected: boolean }) {
  const accent = isSelected ? '#6366f1' : '#94a3b8';
  const bg = isSelected ? '#eef2ff' : '#f8fafc';
  const line = isSelected ? '#c7d2fe' : '#e2e8f0';
  const text = isSelected ? '#4338ca' : '#64748b';

  switch (templateId) {
    case 'classic':
      return (
        <svg viewBox="0 0 120 80" className="w-full max-w-[140px] h-auto" aria-hidden>
          <rect width="120" height="80" rx="4" fill={bg} stroke={line} strokeWidth="1" />
          {/* Header text lines */}
          <rect x="8" y="8" width="40" height="4" rx="1" fill={text} />
          <rect x="8" y="14" width="30" height="2" rx="1" fill={line} />
          <rect x="80" y="8" width="32" height="5" rx="1" fill={accent} />
          <rect x="88" y="15" width="24" height="2" rx="1" fill={line} />
          {/* Separator */}
          <line x1="8" y1="22" x2="112" y2="22" stroke={line} strokeWidth="0.8" />
          {/* Table */}
          <rect x="8" y="28" width="104" height="5" rx="1" fill={line} />
          <rect x="8" y="35" width="104" height="4" rx="0.5" fill="transparent" stroke={line} strokeWidth="0.5" />
          <rect x="8" y="41" width="104" height="4" rx="0.5" fill={bg} stroke={line} strokeWidth="0.5" />
          <rect x="8" y="47" width="104" height="4" rx="0.5" fill="transparent" stroke={line} strokeWidth="0.5" />
          {/* Totals */}
          <rect x="70" y="56" width="42" height="3" rx="1" fill={text} />
          <rect x="70" y="61" width="42" height="3" rx="1" fill={text} />
          <line x1="70" y1="66" x2="112" y2="66" stroke={accent} strokeWidth="0.8" />
          <rect x="70" y="68" width="42" height="4" rx="1" fill={accent} />
        </svg>
      );
    case 'modern':
      return (
        <svg viewBox="0 0 120 80" className="w-full max-w-[140px] h-auto" aria-hidden>
          <rect width="120" height="80" rx="4" fill={bg} stroke={line} strokeWidth="1" />
          {/* Accent bar */}
          <rect width="120" height="4" rx="0" fill={accent} />
          {/* Header */}
          <rect x="8" y="10" width="45" height="5" rx="1" fill={accent} />
          <rect x="8" y="17" width="35" height="2" rx="1" fill={line} />
          <rect x="90" y="10" width="22" height="8" rx="2" fill={line} opacity="0.5" />
          <rect x="75" y="20" width="37" height="5" rx="1" fill={accent} />
          {/* Separator */}
          <line x1="8" y1="28" x2="112" y2="28" stroke={accent} strokeWidth="0.8" />
          {/* Table with colored header */}
          <rect x="8" y="32" width="104" height="5" rx="1" fill={accent} />
          <rect x="8" y="39" width="104" height="4" rx="0.5" fill="transparent" />
          <rect x="8" y="45" width="104" height="4" rx="0.5" fill={isSelected ? '#e0e7ff' : '#f1f5f9'} />
          <rect x="8" y="51" width="104" height="4" rx="0.5" fill="transparent" />
          {/* Totals box */}
          <rect x="66" y="60" width="48" height="14" rx="2" fill={isSelected ? '#e0e7ff' : '#f1f5f9'} stroke={accent} strokeWidth="0.5" />
          <rect x="70" y="63" width="40" height="3" rx="1" fill={text} />
          <rect x="70" y="68" width="40" height="4" rx="1" fill={accent} />
        </svg>
      );
    case 'minimal':
      return (
        <svg viewBox="0 0 120 80" className="w-full max-w-[140px] h-auto" aria-hidden>
          <rect width="120" height="80" rx="4" fill={bg} stroke={line} strokeWidth="1" />
          {/* Header — minimal text */}
          <rect x="8" y="10" width="35" height="4" rx="1" fill={text} />
          <rect x="8" y="16" width="55" height="2" rx="1" fill={line} />
          <rect x="72" y="8" width="40" height="6" rx="1" fill={text} opacity="0.6" />
          <rect x="82" y="16" width="30" height="2" rx="1" fill={line} />
          {/* Table — no borders, just lines */}
          <rect x="8" y="28" width="104" height="2" rx="0.5" fill={line} opacity="0.5" />
          <line x1="8" y1="32" x2="112" y2="32" stroke={line} strokeWidth="0.3" />
          <line x1="8" y1="38" x2="112" y2="38" stroke={line} strokeWidth="0.2" />
          <line x1="8" y1="44" x2="112" y2="44" stroke={line} strokeWidth="0.2" />
          <line x1="8" y1="50" x2="112" y2="50" stroke={line} strokeWidth="0.2" />
          {/* Totals — simple */}
          <rect x="78" y="58" width="34" height="2" rx="1" fill={line} />
          <rect x="78" y="62" width="34" height="2" rx="1" fill={line} />
          <line x1="78" y1="66" x2="112" y2="66" stroke={text} strokeWidth="0.5" />
          <rect x="78" y="68" width="34" height="3" rx="1" fill={text} />
        </svg>
      );
  }
}

export default DocumentSettingsTab;

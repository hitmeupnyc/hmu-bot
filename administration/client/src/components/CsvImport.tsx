import { useState, useRef } from 'react';
import { ApplicationFormData } from '../types';

interface CsvImportProps {
  onImport: (applications: ApplicationFormData[]) => void;
  onClose: () => void;
  isLoading?: boolean;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ParsedResult {
  valid: ApplicationFormData[];
  errors: ImportError[];
}

const CSV_HEADERS = [
  'name',
  'pronouns', 
  'preferred_name',
  'email',
  'social_url_primary',
  'social_url_secondary', 
  'social_url_tertiary',
  'birth_year',
  'referral_source',
  'sponsor_name',
  'sponsor_email_confirmation',
  'referral_details',
  'kinky_experience',
  'self_description',
  'consent_understanding',
  'additional_info',
  'consent_policy_agreement'
];

const REFERRAL_SOURCES = [
  'Fetlife',
  'Google',
  'HMU Instagram',
  'Friend/Word of mouth',
  'Event attendee',
  'Other'
];

export function CsvImport({ onImport, onClose, isLoading = false }: CsvImportProps) {
  const [preview, setPreview] = useState<ParsedResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [inputMethod, setInputMethod] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'tsv' | 'html' | 'unknown'>('unknown');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = (format: 'csv' | 'tsv' = 'csv') => {
    const headers = format === 'csv' ? CSV_HEADERS.join(',') : CSV_HEADERS.join('\t');
    const example = [
      'John Doe',
      'he/him',
      'Johnny',
      'john@example.com',
      'https://fetlife.com/users/johndoe',
      '',
      '',
      '1990',
      'Fetlife',
      'Jane Smith',
      'true',
      '',
      'I have been to a few events...',
      'I am a friendly person who...',
      'Consent means ongoing communication...',
      'No additional information',
      'yes'
    ];

    const separator = format === 'csv' ? ',' : '\t';
    const escapedExample = example.map(field => {
      if (format === 'csv' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(separator);

    const content = `${headers}\n${escapedExample}`;
    const mimeType = format === 'csv' ? 'text/csv' : 'text/tab-separated-values';
    const extension = format === 'csv' ? 'csv' : 'tsv';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application_import_template.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateBirthYear = (year: string): boolean => {
    const birthYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    return birthYear >= 1900 && birthYear <= currentYear - 21;
  };

  const detectPasteFormat = (text: string): 'csv' | 'tsv' | 'html' | 'unknown' => {
    // Check if it's HTML (Google Sheets often copies as HTML table)
    if (text.includes('<table') || text.includes('<tr') || text.includes('<td')) {
      return 'html';
    }
    
    // Count separators to determine format
    const lines = text.trim().split('\n');
    if (lines.length < 2) return 'unknown';
    
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    // If we have significantly more tabs than commas, it's likely TSV (from Google Sheets)
    if (tabCount > 0 && tabCount >= commaCount) {
      return 'tsv';
    }
    
    // If we have commas, it's likely CSV
    if (commaCount > 0) {
      return 'csv';
    }
    
    return 'unknown';
  };

  const parseHtmlTable = (html: string): string => {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const table = tempDiv.querySelector('table');
    if (!table) return html; // Fallback to original text
    
    const rows = Array.from(table.querySelectorAll('tr'));
    const csvRows = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => {
        const text = cell.textContent || '';
        // Escape commas and quotes for CSV format
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(',');
    });
    
    return csvRows.join('\n');
  };

  const convertTsvToCsv = (tsv: string): string => {
    return tsv.split('\n').map(line => {
      return line.split('\t').map(cell => {
        const text = cell.trim();
        // Escape commas and quotes for CSV format
        if (text.includes(',') || text.includes('"') || text.includes('\n')) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      }).join(',');
    }).join('\n');
  };

  const normalizePastedContent = (text: string): string => {
    const format = detectPasteFormat(text);
    setPasteFormat(format);
    
    switch (format) {
      case 'html':
        return parseHtmlTable(text);
      case 'tsv':
        return convertTsvToCsv(text);
      case 'csv':
        return text;
      default:
        // Try to auto-detect and convert common separators
        if (text.includes('\t')) {
          return convertTsvToCsv(text);
        }
        return text;
    }
  };

  const parseCsvContent = (content: string): ParsedResult => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return { valid: [], errors: [{ row: 0, field: 'file', message: 'CSV file must have headers and at least one data row' }] };
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataLines = lines.slice(1);
    
    const valid: ApplicationFormData[] = [];
    const errors: ImportError[] = [];

    // Validate headers
    const expectedHeaders = CSV_HEADERS.map(h => h.toLowerCase());
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      errors.push({ row: 0, field: 'headers', message: `Missing required headers: ${missingHeaders.join(', ')}` });
      return { valid, errors };
    }

    dataLines.forEach((line, index) => {
      const rowNumber = index + 2; // +2 because we start from line 2 (after headers)
      const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
      
      if (values.length !== headers.length) {
        errors.push({ row: rowNumber, field: 'structure', message: 'Row has incorrect number of columns' });
        return;
      }

      const rowData: any = {};
      headers.forEach((header, i) => {
        rowData[header] = values[i];
      });

      const rowErrors: ImportError[] = [];

      // Validate required fields
      if (!rowData.name?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
      }

      if (!rowData.email?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
      } else if (!validateEmail(rowData.email)) {
        rowErrors.push({ row: rowNumber, field: 'email', message: 'Invalid email format' });
      }

      if (!rowData.birth_year || !validateBirthYear(rowData.birth_year)) {
        rowErrors.push({ row: rowNumber, field: 'birth_year', message: 'Birth year must indicate age 21 or older' });
      }

      if (!rowData.referral_source || !REFERRAL_SOURCES.includes(rowData.referral_source)) {
        rowErrors.push({ row: rowNumber, field: 'referral_source', message: `Referral source must be one of: ${REFERRAL_SOURCES.join(', ')}` });
      }

      if (!rowData.sponsor_name?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'sponsor_name', message: 'Sponsor name is required' });
      }

      if (rowData.sponsor_email_confirmation !== 'true') {
        rowErrors.push({ row: rowNumber, field: 'sponsor_email_confirmation', message: 'Sponsor email confirmation must be "true"' });
      }

      if (!rowData.kinky_experience?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'kinky_experience', message: 'Kinky experience description is required' });
      }

      if (!rowData.self_description?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'self_description', message: 'Self description is required' });
      }

      if (!rowData.consent_understanding?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'consent_understanding', message: 'Consent understanding is required' });
      }

      if (rowData.consent_policy_agreement !== 'yes' && rowData.consent_policy_agreement !== 'questions') {
        rowErrors.push({ row: rowNumber, field: 'consent_policy_agreement', message: 'Consent policy agreement must be "yes" or "questions"' });
      }

      // Validate conditional fields
      if ((rowData.referral_source === 'Other' || rowData.referral_source === 'Event attendee') && !rowData.referral_details?.trim()) {
        rowErrors.push({ row: rowNumber, field: 'referral_details', message: 'Referral details required for "Other" or "Event attendee" referral sources' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        // Convert to ApplicationFormData format
        const applicationData: ApplicationFormData = {
          name: rowData.name,
          pronouns: rowData.pronouns || '',
          preferred_name: rowData.preferred_name || '',
          email: rowData.email,
          social_urls: {
            primary: rowData.social_url_primary || '',
            secondary: rowData.social_url_secondary || '',
            tertiary: rowData.social_url_tertiary || ''
          },
          birth_year: parseInt(rowData.birth_year),
          referral_source: rowData.referral_source,
          sponsor_name: rowData.sponsor_name,
          sponsor_email_confirmation: rowData.sponsor_email_confirmation === 'true',
          referral_details: rowData.referral_details || '',
          kinky_experience: rowData.kinky_experience,
          self_description: rowData.self_description,
          consent_understanding: rowData.consent_understanding,
          additional_info: rowData.additional_info || '',
          consent_policy_agreement: rowData.consent_policy_agreement as 'yes' | 'questions'
        };
        valid.push(applicationData);
      }
    });

    return { valid, errors };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseCsvContent(content);
      setPreview(result);
      setShowPreview(true);
    };
    reader.readAsText(selectedFile);
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) {
      alert('Please paste CSV content');
      return;
    }

    const normalizedContent = normalizePastedContent(pastedText);
    const result = parseCsvContent(normalizedContent);
    setPreview(result);
    setShowPreview(true);
  };

  const handleRichPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        // Try HTML first (Google Sheets rich format)
        if (clipboardItem.types.includes('text/html')) {
          const blob = await clipboardItem.getType('text/html');
          const html = await blob.text();
          const csvContent = parseHtmlTable(html);
          setPastedText(csvContent);
          setPasteFormat('html');
          
          const result = parseCsvContent(csvContent);
          setPreview(result);
          setShowPreview(true);
          return;
        }
        
        // Fallback to plain text
        if (clipboardItem.types.includes('text/plain')) {
          const blob = await clipboardItem.getType('text/plain');
          const text = await blob.text();
          const normalizedContent = normalizePastedContent(text);
          setPastedText(normalizedContent);
          
          const result = parseCsvContent(normalizedContent);
          setPreview(result);
          setShowPreview(true);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to read rich clipboard content:', error);
      // Fallback to manual paste
      alert('Unable to access clipboard directly. Please paste your content manually in the text area below.');
    }
  };

  const handleImport = () => {
    if (preview && preview.valid.length > 0) {
      onImport(preview.valid);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setShowPreview(false);
    setPastedText('');
    setPasteFormat('unknown');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Let the default paste happen first, then process it
    setTimeout(() => {
      const text = e.currentTarget.value;
      if (text) {
        const normalizedContent = normalizePastedContent(text);
        if (normalizedContent !== text) {
          setPastedText(normalizedContent);
        }
      }
    }, 10);
  };

  const getFormatDisplay = () => {
    switch (pasteFormat) {
      case 'html':
        return '📊 Google Sheets/HTML Table';
      case 'tsv':
        return '📋 Tab-separated values';
      case 'csv':
        return '📄 Comma-separated values';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Import Applications from CSV</h2>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {!showPreview ? (
            <div className="space-y-6">
              {/* Input Method Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    type="button"
                    onClick={() => setInputMethod('file')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      inputMethod === 'file'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMethod('paste')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      inputMethod === 'paste'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Paste Text
                  </button>
                </nav>
              </div>

              {/* Template Download */}
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-800 mb-3">
                  Need help with the format? Download our template to see the expected structure.
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => downloadTemplate('csv')}
                    className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    📄 Download CSV Template
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTemplate('tsv')}
                    className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                  >
                    📊 Download TSV Template (for Google Sheets)
                  </button>
                </div>
              </div>

              {/* File Upload Tab */}
              {inputMethod === 'file' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select CSV File
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg p-2"
                    />
                  </div>
                </div>
              )}

              {/* Paste Text Tab */}
              {inputMethod === 'paste' && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="text-sm font-medium text-green-800 mb-2">✨ Smart Paste from Google Sheets</h4>
                    <p className="text-sm text-green-700 mb-3">
                      Copy data directly from Google Sheets, Excel, or other spreadsheet applications. 
                      We'll automatically detect and convert the format!
                    </p>
                    <button
                      type="button"
                      onClick={handleRichPaste}
                      className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      📋 Smart Paste from Clipboard
                    </button>
                  </div>

                  <div className="text-center text-gray-500 text-sm">
                    — or —
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Manual Paste Area
                      </label>
                      {pasteFormat !== 'unknown' && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          {getFormatDisplay()}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      onPaste={handleTextareaPaste}
                      placeholder="Or paste your CSV content here manually. Include headers in the first row..."
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supports CSV, TSV (tab-separated), and HTML table formats
                    </p>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handlePasteProcess}
                      disabled={!pastedText.trim()}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Process Pasted Content
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-gray-900">Import Preview</h3>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded-md"
                >
                  ← Start Over
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">Valid Applications</p>
                  <p className="text-3xl font-bold text-green-900">{preview?.valid.length || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">Errors</p>
                  <p className="text-3xl font-bold text-red-900">{preview?.errors.length || 0}</p>
                </div>
              </div>

              {preview && preview.errors.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="text-sm font-medium text-red-800 mb-3">Validation Errors:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {preview.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                        <span className="font-medium">Row {error.row}:</span> {error.field} - {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview && preview.valid.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">Preview of Valid Applications:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {preview.valid.slice(0, 5).map((application, index) => (
                      <div key={index} className="text-sm bg-blue-100 p-2 rounded">
                        <span className="font-medium">{application.name}</span> ({application.email}) - {application.referral_source}
                      </div>
                    ))}
                    {preview.valid.length > 5 && (
                      <p className="text-sm text-blue-600 italic text-center py-1">
                        ...and {preview.valid.length - 5} more applications
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isLoading || !preview || preview.valid.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Importing...' : `Import ${preview?.valid.length || 0} Applications`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
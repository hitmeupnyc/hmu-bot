import { useState, useRef } from 'react';
import { ApplicationFormData } from '../types';
import { HeaderMapping } from './HeaderMapping';

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

interface HeaderMapping {
  [expectedHeader: string]: string | null; // maps expected header to found header or null if not mapped
}

const EXPECTED_HEADERS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'pronouns', label: 'Pronouns', required: false },
  { key: 'preferred_name', label: 'Preferred Name', required: false },
  { key: 'email', label: 'Email', required: true },
  { key: 'social_url_primary', label: 'Social URL Primary', required: false },
  { key: 'social_url_secondary', label: 'Social URL Secondary', required: false },
  { key: 'social_url_tertiary', label: 'Social URL Tertiary', required: false },
  { key: 'birth_year', label: 'Birth Year', required: true },
  { key: 'referral_source', label: 'Referral Source', required: true },
  { key: 'sponsor_name', label: 'Sponsor Name', required: true },
  { key: 'sponsor_email_confirmation', label: 'Sponsor Email Confirmation', required: true },
  { key: 'referral_details', label: 'Referral Details', required: false },
  { key: 'kinky_experience', label: 'Kinky Experience', required: true },
  { key: 'self_description', label: 'Self Description', required: true },
  { key: 'consent_understanding', label: 'Consent Understanding', required: true },
  { key: 'additional_info', label: 'Additional Info', required: false },
  { key: 'consent_policy_agreement', label: 'Consent Policy Agreement', required: true }
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
  const [rawData, setRawData] = useState('');
  const [foundHeaders, setFoundHeaders] = useState<string[]>([]);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [headerMapping, setHeaderMapping] = useState<HeaderMapping>({});
  const [showMapping, setShowMapping] = useState(false);
  const [preview, setPreview] = useState<ParsedResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateBirthYear = (year: string): boolean => {
    const birthYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    return birthYear >= 1900 && birthYear <= currentYear - 21;
  };

  const parseTsvData = (data: string): string[][] => {
    return data.trim().split('\n').map(line => 
      line.split('\t').map(cell => cell.trim())
    );
  };

  const detectHeaders = (data: string) => {
    const rows = parseTsvData(data);
    if (rows.length === 0) return;

    const firstRow = rows[0];
    setFoundHeaders(firstRow);

    // Check if headers match exactly
    const normalizedFound = firstRow.map(h => h.toLowerCase().trim());

    const exactMatch = EXPECTED_HEADERS.every(expected => 
      normalizedFound.includes(expected.key.toLowerCase())
    );

    if (exactMatch) {
      // Create automatic mapping
      const autoMapping: HeaderMapping = {};
      EXPECTED_HEADERS.forEach(expected => {
        const foundIndex = normalizedFound.indexOf(expected.key.toLowerCase());
        if (foundIndex !== -1) {
          autoMapping[expected.key] = firstRow[foundIndex];
        }
      });
      setHeaderMapping(autoMapping);
      setShowMapping(false);
      processWithMapping(autoMapping);
    } else {
      // Show mapping interface
      const initialMapping: HeaderMapping = {};
      EXPECTED_HEADERS.forEach(expected => {
        initialMapping[expected.key] = null;
      });
      setHeaderMapping(initialMapping);
      setShowMapping(true);
    }
  };

  const processWithMapping = (mapping: HeaderMapping) => {
    const rows = parseTsvData(rawData);
    if (rows.length === 0) return;

    const dataRows = hasHeaders ? rows.slice(1) : rows;
    const headerRow = hasHeaders ? rows[0] : [];
    
    const valid: ApplicationFormData[] = [];
    const errors: ImportError[] = [];

    dataRows.forEach((row, index) => {
      const rowNumber = index + (hasHeaders ? 2 : 1); // Account for header row if present
      const rowErrors: ImportError[] = [];

      // Extract data based on mapping
      const extractValue = (expectedHeader: string): string => {
        const mappedHeader = mapping[expectedHeader];
        if (!mappedHeader) return '';
        
        if (hasHeaders) {
          const columnIndex = headerRow.indexOf(mappedHeader);
          return columnIndex !== -1 ? (row[columnIndex] || '') : '';
        } else {
          // For no headers, the mapping value should be the column index
          const columnIndex = parseInt(mappedHeader) - 1; // 1-based to 0-based
          return columnIndex >= 0 && columnIndex < row.length ? row[columnIndex] : '';
        }
      };

      const name = extractValue('name').trim();
      const email = extractValue('email').trim();
      const birthYearStr = extractValue('birth_year').trim();
      const referralSource = extractValue('referral_source').trim();
      const sponsorName = extractValue('sponsor_name').trim();
      const sponsorEmailConfirmation = extractValue('sponsor_email_confirmation').trim();
      const kinkyExperience = extractValue('kinky_experience').trim();
      const selfDescription = extractValue('self_description').trim();
      const consentUnderstanding = extractValue('consent_understanding').trim();
      const consentPolicyAgreement = extractValue('consent_policy_agreement').trim();

      // Validate required fields
      if (!name) {
        rowErrors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
      }

      if (!email) {
        rowErrors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
      } else if (!validateEmail(email)) {
        rowErrors.push({ row: rowNumber, field: 'email', message: 'Invalid email format' });
      }

      if (!birthYearStr || !validateBirthYear(birthYearStr)) {
        rowErrors.push({ row: rowNumber, field: 'birth_year', message: 'Birth year must indicate age 21 or older' });
      }

      if (!referralSource || !REFERRAL_SOURCES.includes(referralSource)) {
        rowErrors.push({ row: rowNumber, field: 'referral_source', message: `Referral source must be one of: ${REFERRAL_SOURCES.join(', ')}` });
      }

      if (!sponsorName) {
        rowErrors.push({ row: rowNumber, field: 'sponsor_name', message: 'Sponsor name is required' });
      }

      if (sponsorEmailConfirmation !== 'true') {
        rowErrors.push({ row: rowNumber, field: 'sponsor_email_confirmation', message: 'Sponsor email confirmation must be "true"' });
      }

      if (!kinkyExperience) {
        rowErrors.push({ row: rowNumber, field: 'kinky_experience', message: 'Kinky experience description is required' });
      }

      if (!selfDescription) {
        rowErrors.push({ row: rowNumber, field: 'self_description', message: 'Self description is required' });
      }

      if (!consentUnderstanding) {
        rowErrors.push({ row: rowNumber, field: 'consent_understanding', message: 'Consent understanding is required' });
      }

      if (consentPolicyAgreement !== 'yes' && consentPolicyAgreement !== 'questions') {
        rowErrors.push({ row: rowNumber, field: 'consent_policy_agreement', message: 'Consent policy agreement must be "yes" or "questions"' });
      }

      // Validate conditional fields
      const referralDetails = extractValue('referral_details').trim();
      if ((referralSource === 'Other' || referralSource === 'Event attendee') && !referralDetails) {
        rowErrors.push({ row: rowNumber, field: 'referral_details', message: 'Referral details required for "Other" or "Event attendee" referral sources' });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        // Convert to ApplicationFormData format
        const applicationData: ApplicationFormData = {
          name,
          pronouns: extractValue('pronouns'),
          preferred_name: extractValue('preferred_name'),
          email,
          social_urls: {
            primary: extractValue('social_url_primary'),
            secondary: extractValue('social_url_secondary'),
            tertiary: extractValue('social_url_tertiary')
          },
          birth_year: parseInt(birthYearStr),
          referral_source: referralSource,
          sponsor_name: sponsorName,
          sponsor_email_confirmation: sponsorEmailConfirmation === 'true',
          referral_details: referralDetails,
          kinky_experience: kinkyExperience,
          self_description: selfDescription,
          consent_understanding: consentUnderstanding,
          additional_info: extractValue('additional_info'),
          consent_policy_agreement: consentPolicyAgreement as 'yes' | 'questions'
        };
        valid.push(applicationData);
      }
    });

    setPreview({ valid, errors });
    setShowPreview(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawData(content);
      detectHeaders(content);
    };
    reader.readAsText(selectedFile);
  };

  const handleTextareaChange = (value: string) => {
    setRawData(value);
    if (value.trim()) {
      detectHeaders(value);
    } else {
      setShowMapping(false);
      setShowPreview(false);
    }
  };

  const handleMappingChange = (newMapping: HeaderMapping) => {
    setHeaderMapping(newMapping);
  };

  const handleProcessMapping = () => {
    processWithMapping(headerMapping);
    setShowMapping(false);
  };

  const handleImport = () => {
    if (preview && preview.valid.length > 0) {
      onImport(preview.valid);
    }
  };

  const handleReset = () => {
    setRawData('');
    setFoundHeaders([]);
    setHeaderMapping({});
    setShowMapping(false);
    setPreview(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Import Applications</h2>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {!showMapping && !showPreview && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions</h3>
                <p className="text-sm text-blue-700">
                  Upload a file or paste tab-separated data (TSV format). We'll help you map your columns to our expected fields.
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg p-2"
                  />
                </div>

                <div className="text-center text-gray-500 text-sm">
                  — or —
                </div>

                {/* TSV Paste Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Tab-Separated Data
                  </label>
                  <textarea
                    value={rawData}
                    onChange={(e) => handleTextareaChange(e.target.value)}
                    placeholder="Paste your data here. Copy directly from Google Sheets, Excel, or other spreadsheets..."
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Copy cells directly from Google Sheets or Excel and paste here
                  </p>
                </div>
              </div>
            </div>
          )}

          {showMapping && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-gray-900">Map Your Columns</h3>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1 border border-gray-300 rounded-md"
                >
                  ← Start Over
                </button>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="hasHeaders"
                    checked={hasHeaders}
                    onChange={(e) => setHasHeaders(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="hasHeaders" className="ml-2 text-sm font-medium text-yellow-800">
                    My data has column headers in the first row
                  </label>
                </div>
                <p className="text-xs text-yellow-700">
                  Uncheck this if your data starts immediately without headers
                </p>
              </div>

              <HeaderMapping
                sourceHeaders={foundHeaders}
                targetHeaders={EXPECTED_HEADERS}
                mapping={headerMapping}
                onMappingChange={handleMappingChange}
              />

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
                  onClick={handleProcessMapping}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Process Data
                </button>
              </div>
            </div>
          )}

          {showPreview && (
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
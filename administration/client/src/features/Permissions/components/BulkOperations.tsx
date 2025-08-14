import { useState } from 'react';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlayIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Flag, useBulkGrantFlags, useProcessExpiredFlags } from '@/hooks/useFlags';

interface BulkOperationsProps {
  flags: Flag[];
}

interface BulkOperation {
  id: string;
  email: string;
  flag_id: string;
  expires_at?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

const csvTemplate = `email,flag_id,expires_at,reason
member1@example.com,email_verified,,Email verification completed
member2@example.com,premium_member,2025-12-31T23:59:59Z,Premium subscription
member3@example.com,admin,2025-06-30T23:59:59Z,Administrative access granted`;

export function BulkOperations({ flags }: BulkOperationsProps) {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [csvText, setCsvText] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'csv' | 'expired'>('manual');
  const [previewMode, setPreviewMode] = useState(false);

  const bulkGrantMutation = useBulkGrantFlags();
  const processExpiredMutation = useProcessExpiredFlags();

  const addOperation = () => {
    const newOp: BulkOperation = {
      id: Date.now().toString(),
      email: '',
      flag_id: '',
      expires_at: '',
      reason: '',
    };
    setOperations([...operations, newOp]);
  };

  const updateOperation = (id: string, field: keyof BulkOperation, value: string) => {
    setOperations(ops => 
      ops.map(op => op.id === id ? { ...op, [field]: value } : op)
    );
  };

  const removeOperation = (id: string) => {
    setOperations(ops => ops.filter(op => op.id !== id));
  };

  const parseCsv = () => {
    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const expectedHeaders = ['email', 'flag_id', 'expires_at', 'reason'];
      
      // Validate headers
      const hasRequiredHeaders = expectedHeaders.slice(0, 2).every(h => headers.includes(h));
      if (!hasRequiredHeaders) {
        alert('CSV must include at least "email" and "flag_id" columns');
        return;
      }

      const newOperations: BulkOperation[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 2 && values[0] && values[1]) {
          const operation: BulkOperation = {
            id: `csv-${i}`,
            email: values[0],
            flag_id: values[1],
            expires_at: values[2] || '',
            reason: values[3] || '',
          };
          newOperations.push(operation);
        }
      }
      
      setOperations(newOperations);
      setActiveTab('manual');
      setPreviewMode(true);
    } catch (error) {
      alert('Error parsing CSV. Please check the format.');
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-flags-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateOperations = () => {
    const errors: string[] = [];
    const emails = new Set();
    
    operations.forEach((op, index) => {
      if (!op.email) {
        errors.push(`Row ${index + 1}: Email is required`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(op.email)) {
        errors.push(`Row ${index + 1}: Invalid email format`);
      }
      
      if (!op.flag_id) {
        errors.push(`Row ${index + 1}: Flag selection is required`);
      } else if (!flags.find(f => f.id === op.flag_id)) {
        errors.push(`Row ${index + 1}: Invalid flag ID "${op.flag_id}"`);
      }
      
      if (op.expires_at && new Date(op.expires_at) <= new Date()) {
        errors.push(`Row ${index + 1}: Expiration date must be in the future`);
      }
      
      const key = `${op.email}-${op.flag_id}`;
      if (emails.has(key)) {
        errors.push(`Row ${index + 1}: Duplicate operation for ${op.email} and flag ${op.flag_id}`);
      }
      emails.add(key);
    });
    
    return errors;
  };

  const executeBulkOperations = async () => {
    const errors = validateOperations();
    if (errors.length > 0) {
      alert(`Validation errors:\n${errors.join('\n')}`);
      return;
    }

    const confirmed = confirm(
      `Execute ${operations.length} flag operations?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      await bulkGrantMutation.mutateAsync(operations);
      setOperations([]);
      setCsvText('');
      setPreviewMode(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const processExpiredFlags = async () => {
    const confirmed = confirm(
      'Process all expired flags? This will remove expired flag assignments from all members.\n\nThis action cannot be undone.'
    );
    
    if (!confirmed) return;

    try {
      await processExpiredMutation.mutateAsync();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const validOperations = operations.filter(op => op.email && op.flag_id);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'manual', label: 'Manual Entry', icon: PlusIcon },
              { id: 'csv', label: 'CSV Import', icon: ArrowUpTrayIcon },
              { id: 'expired', label: 'Cleanup', icon: TrashIcon }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Manual Bulk Operations</h3>
                <div className="flex gap-2">
                  {previewMode && (
                    <button
                      onClick={() => setPreviewMode(false)}
                      className="px-3 py-1 text-gray-600 bg-gray-100 rounded text-sm hover:bg-gray-200"
                    >
                      Edit Mode
                    </button>
                  )}
                  <button
                    onClick={addOperation}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Operation
                  </button>
                </div>
              </div>

              {operations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PlusIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No operations added yet. Click "Add Operation" to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {operations.map((operation, index) => (
                    <div key={operation.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md">
                      <div className="text-sm font-medium text-gray-500 w-8">
                        #{index + 1}
                      </div>
                      
                      <input
                        type="email"
                        placeholder="member@example.com"
                        value={operation.email}
                        onChange={(e) => updateOperation(operation.id, 'email', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      
                      <select
                        value={operation.flag_id}
                        onChange={(e) => updateOperation(operation.id, 'flag_id', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select flag</option>
                        {flags.map(flag => (
                          <option key={flag.id} value={flag.id}>
                            {flag.name} ({flag.category})
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="datetime-local"
                        value={operation.expires_at}
                        onChange={(e) => updateOperation(operation.id, 'expires_at', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Expiration (optional)"
                      />
                      
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={operation.reason}
                        onChange={(e) => updateOperation(operation.id, 'reason', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      
                      <button
                        onClick={() => removeOperation(operation.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {operations.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {validOperations.length} of {operations.length} operations are valid
                  </div>
                  <button
                    onClick={executeBulkOperations}
                    disabled={validOperations.length === 0 || bulkGrantMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <PlayIcon className="h-4 w-4" />
                    {bulkGrantMutation.isPending ? 'Processing...' : `Execute ${validOperations.length} Operations`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CSV Import Tab */}
          {activeTab === 'csv' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">CSV Import</h3>
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download Template
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CSV Data
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste CSV data here or use the template format..."
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-1">CSV Format:</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    Required columns: <code>email</code>, <code>flag_id</code>
                  </p>
                  <p className="text-sm text-blue-700">
                    Optional columns: <code>expires_at</code> (ISO format), <code>reason</code>
                  </p>
                </div>

                <button
                  onClick={parseCsv}
                  disabled={!csvText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Parse CSV
                </button>
              </div>
            </div>
          )}

          {/* Cleanup Tab */}
          {activeTab === 'expired' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Flag Cleanup Operations</h3>
              
              <div className="space-y-4">
                <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900">Process Expired Flags</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        This will automatically remove all expired flag assignments from members.
                        The operation will scan all members and revoke any flags that have passed their expiration date.
                      </p>
                      <button
                        onClick={processExpiredFlags}
                        disabled={processExpiredMutation.isPending}
                        className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <TrashIcon className="h-4 w-4" />
                        {processExpiredMutation.isPending ? 'Processing...' : 'Process Expired Flags'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Audit & Verification</h4>
                      <p className="text-sm text-green-700 mt-1">
                        All cleanup operations are logged in the audit trail.
                        You can view the results in the member details pages or audit logs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, InformationCircleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';
import { Flag, useGrantFlag, useMemberPermissions } from '@/hooks/useFlags';
import { addMonths, format } from 'date-fns';

interface FlagGrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  flags: Flag[];
  preselectedFlag?: Flag;
  preselectedEmail?: string;
}

interface GrantFormData {
  email: string;
  flagId: string;
  expiresAt: string;
  reason: string;
  useTemplate: string;
}

const expirationTemplates = [
  { label: 'Never', value: '' },
  { label: '1 Month', value: '1month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
  { label: '1 Year', value: '1year' },
  { label: 'Custom', value: 'custom' }
];

const reasonTemplates = [
  'Verified email address',
  'Premium subscription activated',
  'Administrative role assignment',
  'Event volunteer approval',
  'Manual verification by admin',
  'Compliance requirement met',
  'Community guideline acknowledgment'
];

export function FlagGrantModal({ 
  isOpen, 
  onClose, 
  flags, 
  preselectedFlag, 
  preselectedEmail 
}: FlagGrantModalProps) {
  const [formData, setFormData] = useState<GrantFormData>({
    email: '',
    flagId: '',
    expiresAt: '',
    reason: '',
    useTemplate: ''
  });

  const [flagSearch, setFlagSearch] = useState('');
  const [emailSuggestions] = useState<string[]>([]);
  const [showPermissionPreview, setShowPermissionPreview] = useState(false);

  const grantFlagMutation = useGrantFlag();
  
  // Fetch current permissions for the selected member (for preview)
  const { data: currentPermissions } = useMemberPermissions(
    formData.email,
    undefined,
    undefined,
    undefined
  );

  // Initialize form with preselected values
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: preselectedEmail || '',
        flagId: preselectedFlag?.id || '',
        expiresAt: '',
        reason: '',
        useTemplate: ''
      });
      setFlagSearch('');
      setShowPermissionPreview(false);
    }
  }, [isOpen, preselectedEmail, preselectedFlag]);

  // Filter flags based on search
  const filteredFlags = flags.filter(flag =>
    flag.name.toLowerCase().includes(flagSearch.toLowerCase()) ||
    flag.description?.toLowerCase().includes(flagSearch.toLowerCase()) ||
    flag.category?.toLowerCase().includes(flagSearch.toLowerCase())
  );

  // Group flags by category for better organization
  const flagsByCategory = filteredFlags.reduce((acc, flag) => {
    const category = flag.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(flag);
    return acc;
  }, {} as Record<string, Flag[]>);

  const selectedFlag = flags.find(f => f.id === formData.flagId);

  const handleExpirationTemplateChange = (template: string) => {
    setFormData(prev => ({ ...prev, useTemplate: template }));
    
    if (template === '') {
      setFormData(prev => ({ ...prev, expiresAt: '' }));
    } else if (template !== 'custom') {
      const months = parseInt(template.replace('month', '').replace('s', ''));
      const expirationDate = addMonths(new Date(), months);
      setFormData(prev => ({ 
        ...prev, 
        expiresAt: format(expirationDate, "yyyy-MM-dd'T'HH:mm")
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.flagId) {
      return;
    }

    try {
      await grantFlagMutation.mutateAsync({
        email: formData.email,
        flagId: formData.flagId,
        expiresAt: formData.expiresAt || undefined,
        reason: formData.reason || undefined
      });
      
      onClose();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const isFormValid = formData.email && formData.flagId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Grant Flag to Member" size="large">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-4">
            {/* Member Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="member@example.com"
              />
              {emailSuggestions.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-md shadow-sm">
                  {emailSuggestions.slice(0, 5).map(email => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, email }))}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Flag Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flag *
              </label>
              <div className="relative mb-2">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search flags..."
                  value={flagSearch}
                  onChange={(e) => setFlagSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="border border-gray-300 rounded-md max-h-32 overflow-y-auto">
                {Object.entries(flagsByCategory).map(([category, categoryFlags]) => (
                  <div key={category}>
                    <div className="px-3 py-1 bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                      {category}
                    </div>
                    {categoryFlags.map(flag => (
                      <label key={flag.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="flagId"
                          value={flag.id}
                          checked={formData.flagId === flag.id}
                          onChange={(e) => setFormData(prev => ({ ...prev, flagId: e.target.value }))}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{flag.name}</div>
                          {flag.description && (
                            <div className="text-xs text-gray-500">{flag.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Expiration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {expirationTemplates.map(template => (
                  <button
                    key={template.value}
                    type="button"
                    onClick={() => handleExpirationTemplateChange(template.value)}
                    className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                      formData.useTemplate === template.value
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
              
              {(formData.useTemplate === 'custom' || (formData.expiresAt && formData.useTemplate !== '')) && (
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Reason for granting this flag..."
              />
              <div className="mt-1">
                <div className="text-xs text-gray-500 mb-1">Quick reasons:</div>
                <div className="flex flex-wrap gap-1">
                  {reasonTemplates.slice(0, 3).map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, reason }))}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            {/* Selection Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Grant Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Member:</span>
                  <span className="font-medium">{formData.email || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Flag:</span>
                  <span className="font-medium">{selectedFlag?.name || 'Not selected'}</span>
                </div>
                
                {selectedFlag?.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="font-medium">{selectedFlag.category}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Expires:</span>
                  <span className="font-medium">
                    {formData.expiresAt ? format(new Date(formData.expiresAt), 'MMM d, yyyy') : 'Never'}
                  </span>
                </div>
              </div>

              {selectedFlag?.description && (
                <div className="mt-3 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                  <div className="flex items-start gap-2">
                    <InformationCircleIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700">{selectedFlag.description}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Permission Preview */}
            {formData.email && currentPermissions && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-blue-900">Current Permissions</h3>
                  <button
                    type="button"
                    onClick={() => setShowPermissionPreview(!showPermissionPreview)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showPermissionPreview ? 'Hide' : 'Show'} Details
                  </button>
                </div>
                
                {showPermissionPreview && currentPermissions.flags && (
                  <div className="space-y-1 text-xs">
                    {currentPermissions.flags.map((flag: any) => (
                      <div key={flag.id} className="flex items-center justify-between">
                        <span>{flag.name}</span>
                        {flag.expires_at && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <ClockIcon className="h-3 w-3" />
                            <span>{format(new Date(flag.expires_at), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {formData.flagId && !currentPermissions.flags.find((f: any) => f.id === formData.flagId) && (
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircleIcon className="h-3 w-3" />
                        <span>{selectedFlag?.name} (new)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || grantFlagMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {grantFlagMutation.isPending ? 'Granting...' : 'Grant Flag'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
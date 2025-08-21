import { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { format, isAfter, differenceInDays } from 'date-fns';
import { useMemberFlags, useRevokeFlag, MemberFlag } from '@/hooks/useFlags';

interface MemberFlagManagerProps {
  onGrantFlag: (email?: string) => void;
}

export function MemberFlagManager({ onGrantFlag }: MemberFlagManagerProps) {
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [showExpired, setShowExpired] = useState(false);
  
  const { data: memberFlags = [], isLoading } = useMemberFlags(selectedMember);
  const revokeFlagMutation = useRevokeFlag();

  const handleSearch = () => {
    if (searchEmail.trim()) {
      setSelectedMember(searchEmail.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getExpirationStatus = (expiresAt?: string) => {
    if (!expiresAt) return null;
    
    const expiration = new Date(expiresAt);
    const now = new Date();
    const days = differenceInDays(expiration, now);
    
    if (days < 0) {
      return { type: 'expired', text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    } else if (days <= 7) {
      return { type: 'warning', text: `${days}d left`, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    } else if (days <= 30) {
      return { type: 'notice', text: `${days}d left`, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    }
    
    return { type: 'valid', text: `${days}d left`, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
  };

  const handleRevoke = async (flag: MemberFlag) => {
    const confirmed = confirm(
      `Are you sure you want to revoke "${flag.name}" from this member?`
    );
    
    if (confirmed) {
      revokeFlagMutation.mutate({
        email: selectedMember,
        flagId: flag.id,
        reason: 'Manual revocation from member flag manager'
      });
    }
  };

  // Filter flags based on show expired setting
  const filteredFlags = memberFlags.filter(flag => {
    const isExpired = flag.expiresAt && isAfter(new Date(), new Date(flag.expiresAt));
    return showExpired || !isExpired;
  });

  const activeFlags = memberFlags.filter(flag => 
    !flag.expiresAt || isAfter(new Date(flag.expiresAt), new Date())
  );

  const expiredFlags = memberFlags.filter(flag => 
    flag.expiresAt && isAfter(new Date(), new Date(flag.expiresAt))
  );

  const expiringFlags = memberFlags.filter(flag => {
    if (!flag.expiresAt) return false;
    const days = differenceInDays(new Date(flag.expiresAt), new Date());
    return days >= 0 && days <= 7;
  });

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Member Permission Management</h2>
        
        <div className="flex gap-3">
          <div className="relative flex-1">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              placeholder="Enter member email to view their flags..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchEmail.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            Search
          </button>
        </div>
        
        {selectedMember && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-blue-700 font-medium">Viewing permissions for:</span>{' '}
                <span className="text-blue-900">{selectedMember}</span>
              </div>
              <button
                onClick={() => onGrantFlag(selectedMember)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
              >
                <PlusIcon className="h-3 w-3" />
                Grant Flag
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {selectedMember && (
        <div className="bg-white rounded-lg shadow">
          {isLoading ? (
            <div className="p-6 animate-pulse">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="text-center">
                    <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{memberFlags.length}</div>
                    <div className="text-xs text-gray-500">Total Flags</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{activeFlags.length}</div>
                    <div className="text-xs text-gray-500">Active</div>
                  </div>
                  {expiringFlags.length > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{expiringFlags.length}</div>
                      <div className="text-xs text-gray-500">Expiring Soon</div>
                    </div>
                  )}
                  {expiredFlags.length > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{expiredFlags.length}</div>
                      <div className="text-xs text-gray-500">Expired</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Member Flags ({filteredFlags.length})</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showExpired}
                      onChange={(e) => setShowExpired(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Show Expired
                  </label>
                </div>
              </div>

              {/* Flags List */}
              <div className="px-6 py-4">
                {filteredFlags.length > 0 ? (
                  <div className="space-y-3">
                    {filteredFlags.map((flag) => {
                      const expirationStatus = getExpirationStatus(flag.expiresAt);
                      const isExpired = flag.expiresAt && isAfter(new Date(), new Date(flag.expiresAt));
                      
                      return (
                        <div
                          key={flag.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            isExpired 
                              ? 'border-red-200 bg-red-50' 
                              : expirationStatus?.type === 'warning'
                              ? 'border-yellow-200 bg-yellow-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{flag.name}</h4>
                                {flag.category && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    {flag.category}
                                  </span>
                                )}
                                {isExpired && <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                                {expirationStatus?.type === 'warning' && <ClockIcon className="h-4 w-4 text-yellow-500" />}
                                {!flag.expiresAt && <CheckCircleIcon className="h-4 w-4 text-green-500" />}
                              </div>
                              
                              {flag.description && (
                                <p className="text-sm text-gray-600 mb-2">{flag.description}</p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                  Granted {format(new Date(flag.grantedAt), 'MMM d, yyyy')} by {flag.grantedBy}
                                </span>
                                
                                {flag.expiresAt && (
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    <span className={expirationStatus?.color}>
                                      {isExpired ? 'Expired' : 'Expires'} {format(new Date(flag.expiresAt), 'MMM d, yyyy')}
                                      {expirationStatus && !isExpired && ` (${expirationStatus.text})`}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {flag.metadata && Object.keys(flag.metadata).length > 0 && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                                  <div className="font-medium text-gray-700 mb-1">Metadata:</div>
                                  <pre className="text-gray-600">
                                    {JSON.stringify(flag.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {expirationStatus?.type === 'warning' && (
                                <button
                                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                                  title="Extend expiration"
                                >
                                  <CalendarIcon className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRevoke(flag)}
                                disabled={revokeFlagMutation.isPending}
                                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <XMarkIcon className="h-3 w-3" />
                                Revoke
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {memberFlags.length === 0 
                        ? 'This member has no flags assigned'
                        : 'No flags match your filter criteria'
                      }
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!selectedMember && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Search for a Member</h3>
          <p className="text-gray-500">
            Enter a member's email address to view and manage their flags and permissions.
          </p>
        </div>
      )}
    </div>
  );
}
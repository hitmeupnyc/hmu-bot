import { useState } from 'react';
import { PlusIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, CalendarIcon, KeyIcon } from '@heroicons/react/24/outline';
import { format, isAfter, differenceInDays } from 'date-fns';
import { useMemberFlags, useRevokeFlag, MemberFlag } from '@/hooks/useFlags';

interface MemberFlagsProps {
  memberEmail: string;
  onGrantFlag: (email?: string) => void;
}

export function MemberFlags({ memberEmail, onGrantFlag }: MemberFlagsProps) {
  const [showExpired, setShowExpired] = useState(false);
  
  const { data: memberFlags = [], isLoading } = useMemberFlags(memberEmail);
  const revokeFlagMutation = useRevokeFlag();

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
        email: memberEmail,
        flagId: flag.id,
        reason: 'Manual revocation from member details'
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-8 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Member Flags & Permissions</h3>
        <button
          onClick={() => onGrantFlag(memberEmail)}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Grant Flag
        </button>
      </div>

      {/* Stats */}
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

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Flags ({filteredFlags.length})</h4>
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

      {/* Flags List */}
      {filteredFlags.length > 0 ? (
        <div className="space-y-3">
          {filteredFlags.map((flag) => {
            const expirationStatus = getExpirationStatus(flag.expiresAt);
            const isExpired = flag.expiresAt && isAfter(new Date(), new Date(flag.expiresAt));
            
            return (
              <div
                key={flag.id}
                className={`p-3 border rounded-lg transition-colors ${
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
                      <KeyIcon className="h-4 w-4 text-gray-400" />
                      <h5 className="font-medium text-gray-900">{flag.name}</h5>
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
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View metadata
                        </summary>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                          <pre className="text-gray-600 whitespace-pre-wrap">
                            {JSON.stringify(flag.metadata, null, 2)}
                          </pre>
                        </div>
                      </details>
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
          <KeyIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">
            {memberFlags.length === 0 
              ? 'This member has no flags assigned'
              : 'No flags match your filter criteria'
            }
          </p>
        </div>
      )}
    </div>
  );
}
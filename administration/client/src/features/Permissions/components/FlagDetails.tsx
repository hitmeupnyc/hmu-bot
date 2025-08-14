import { useState } from 'react';
import { ShieldCheckIcon, ClockIcon, ExclamationTriangleIcon, UsersIcon, MagnifyingGlassIcon, CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { format, isAfter, differenceInDays } from 'date-fns';
import { Flag, FlagMember, useRevokeFlag } from '@/hooks/useFlags';

interface FlagDetailsProps {
  flag: Flag | null;
  members: FlagMember[];
  isLoading?: boolean;
}

const flagCategoryColors = {
  verification: 'bg-blue-100 text-blue-800 border-blue-200',
  subscription: 'bg-purple-100 text-purple-800 border-purple-200',
  feature: 'bg-green-100 text-green-800 border-green-200',
  compliance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  admin: 'bg-red-100 text-red-800 border-red-200',
};

export function FlagDetails({ flag, members, isLoading = false }: FlagDetailsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpired, setShowExpired] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'granted' | 'expires'>('name');
  
  const revokeFlagMutation = useRevokeFlag();

  if (!flag) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <ShieldCheckIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Select a flag to view details</p>
      </div>
    );
  }

  // Filter and sort members
  const filteredMembers = members
    .filter(member => {
      const matchesSearch = 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isExpired = member.expires_at && isAfter(new Date(), new Date(member.expires_at));
      
      return matchesSearch && (showExpired || !isExpired);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case 'granted':
          return new Date(b.granted_at).getTime() - new Date(a.granted_at).getTime();
        case 'expires':
          if (!a.expires_at && !b.expires_at) return 0;
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
        default:
          return 0;
      }
    });

  const getExpirationStatus = (expiresAt?: string) => {
    if (!expiresAt) return null;
    
    const expiration = new Date(expiresAt);
    const now = new Date();
    const days = differenceInDays(expiration, now);
    
    if (days < 0) {
      return { type: 'expired', text: 'Expired', color: 'text-red-600' };
    } else if (days <= 7) {
      return { type: 'warning', text: `${days}d left`, color: 'text-yellow-600' };
    } else if (days <= 30) {
      return { type: 'notice', text: `${days}d left`, color: 'text-blue-600' };
    }
    
    return { type: 'valid', text: `${days}d left`, color: 'text-green-600' };
  };

  const handleRevoke = async (member: FlagMember) => {
    const confirmed = confirm(
      `Are you sure you want to revoke "${flag.name}" from ${member.first_name} ${member.last_name}?`
    );
    
    if (confirmed) {
      revokeFlagMutation.mutate({
        email: member.email,
        flagId: flag.id,
        reason: 'Manual revocation from permissions dashboard'
      });
    }
  };

  const expiredCount = members.filter(m => 
    m.expires_at && isAfter(new Date(), new Date(m.expires_at))
  ).length;

  const expiringCount = members.filter(m => {
    if (!m.expires_at) return false;
    const days = differenceInDays(new Date(m.expires_at), new Date());
    return days >= 0 && days <= 7;
  }).length;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow animate-pulse">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{flag.name}</h2>
            {flag.description && (
              <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            flagCategoryColors[flag.category as keyof typeof flagCategoryColors] || 'bg-gray-100'
          }`}>
            {flag.category}
          </span>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{members.length}</div>
            <div className="text-xs text-gray-500">Total Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {members.filter(m => !m.expires_at || isAfter(new Date(m.expires_at), new Date())).length}
            </div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          {expiringCount > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{expiringCount}</div>
              <div className="text-xs text-gray-500">Expiring Soon</div>
            </div>
          )}
          {expiredCount > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
              <div className="text-xs text-gray-500">Expired</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 py-4">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Sort by Name</option>
            <option value="granted">Sort by Granted Date</option>
            <option value="expires">Sort by Expiration</option>
          </select>
          
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

        {/* Members List */}
        <h3 className="font-medium mb-3">
          Members with this flag ({filteredMembers.length})
        </h3>
        
        {filteredMembers.length > 0 ? (
          <div className="space-y-2">
            {filteredMembers.map((member) => {
              const expirationStatus = getExpirationStatus(member.expires_at);
              const isExpired = member.expires_at && isAfter(new Date(), new Date(member.expires_at));
              
              return (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-3 border rounded-md transition-colors ${
                    isExpired ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        {member.first_name} {member.last_name}
                      </div>
                      {isExpired && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span>
                        Granted {format(new Date(member.granted_at), 'MMM d, yyyy')} by {member.granted_by}
                      </span>
                      {member.expires_at && expirationStatus && (
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          <span className={expirationStatus.color}>
                            {expirationStatus.type === 'expired' ? 'Expired' : `Expires`} {format(new Date(member.expires_at), 'MMM d, yyyy')}
                            {expirationStatus.type !== 'expired' && ` (${expirationStatus.text})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {expirationStatus && expirationStatus.type === 'warning' && (
                      <button 
                        className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                        title="Extend expiration"
                      >
                        <CalendarIcon className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRevoke(member)}
                      disabled={revokeFlagMutation.isPending}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <XMarkIcon className="h-3 w-3" />
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <UsersIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {searchTerm || !showExpired ? 'No members match your criteria' : 'No members have this flag'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
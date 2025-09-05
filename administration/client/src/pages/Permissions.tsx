import {
  BulkOperations,
  FlagDetails,
  FlagGrantModal,
  FlagList,
  MemberFlagManager,
  PermissionTester,
} from '@/features/Permissions/components';
import { Flag, useFlagMembers, useFlags } from '@/hooks/useFlags';
import {
  BeakerIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

type TabType = 'flags' | 'members' | 'bulk' | 'tester';

export default function Permissions() {
  const [activeTab, setActiveTab] = useState<TabType>('flags');
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [preselectedEmail, setPreselectedEmail] = useState<string>('');

  const { data: flags = [], isLoading: flagsLoading } = useFlags();
  const { data: flagMembers = [] } = useFlagMembers(selectedFlag?.id || '');

  const handleGrantFlag = (email?: string) => {
    if (email) {
      setPreselectedEmail(email);
    }
    setShowGrantModal(true);
  };

  const handleCloseGrantModal = () => {
    setShowGrantModal(false);
    setPreselectedEmail('');
  };

  const tabs = [
    {
      id: 'flags' as TabType,
      label: 'Flags Overview',
      icon: ShieldCheckIcon,
      description: 'Browse and manage system flags',
    },
    {
      id: 'members' as TabType,
      label: 'Member Permissions',
      icon: UsersIcon,
      description: 'View and manage member-specific permissions',
    },
    {
      id: 'bulk' as TabType,
      label: 'Bulk Operations',
      icon: ChartBarIcon,
      description: 'Perform bulk flag operations and cleanup',
    },
    {
      id: 'tester' as TabType,
      label: 'Permission Tester',
      icon: BeakerIcon,
      description: 'Test and validate permission scenarios',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Permission Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage member flags and permissions across the system
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab descriptions */}
        <div className="mt-2">
          <p className="text-sm text-gray-600">
            {tabs.find((tab) => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'flags' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <FlagList
                flags={flags}
                selectedFlag={selectedFlag}
                onFlagSelect={setSelectedFlag}
                onGrantFlag={() => handleGrantFlag()}
                isLoading={flagsLoading}
              />
            </div>
            <div className="lg:col-span-2">
              <FlagDetails
                flag={selectedFlag}
                members={flagMembers}
                isLoading={false}
              />
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <MemberFlagManager onGrantFlag={handleGrantFlag} />
        )}

        {activeTab === 'bulk' && <BulkOperations flags={flags} />}

        {activeTab === 'tester' && <PermissionTester />}
      </div>

      {/* Grant Flag Modal */}
      <FlagGrantModal
        isOpen={showGrantModal}
        onClose={handleCloseGrantModal}
        flags={flags}
        preselectedFlag={selectedFlag || undefined}
        preselectedMemberId={preselectedEmail}
      />
    </div>
  );
}

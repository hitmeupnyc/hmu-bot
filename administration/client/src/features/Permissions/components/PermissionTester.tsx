import { useMemberPermissions } from '@/hooks/useFlags';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  PlayIcon,
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface PermissionTest {
  memberEmail: string;
  resourceType?: string;
  resourceId?: string;
  permission?: string;
}

interface TestResult {
  hasPermission: boolean;
  flags: Array<{
    id: string;
    name: string;
    category: string;
    expires_at?: string;
  }>;
  computedPermissions: string[];
  missingFlags?: string[];
  reason?: string;
}

export function PermissionTester() {
  const [testConfig, setTestConfig] = useState<PermissionTest>({
    memberEmail: '',
    resourceType: '',
    resourceId: '',
    permission: '',
  });

  const [testHistory, setTestHistory] = useState<
    Array<PermissionTest & { result: TestResult; timestamp: Date }>
  >([]);

  const {
    data: permissionData,
    isLoading: isTestingPermissions,
    refetch: runPermissionTest,
  } = useMemberPermissions(
    testConfig.memberEmail,
    testConfig.resourceType,
    testConfig.resourceId,
    testConfig.permission
  );

  const commonResourceTypes = [
    'event',
    'user',
    'integration',
    'settings',
    'audit',
  ];

  const commonPermissions = [
    'read',
    'write',
    'delete',
    'manage',
    'view_private',
    'export',
    'bulk_edit',
  ];

  const runTest = async () => {
    if (!testConfig.memberEmail) {
      alert('Member email is required');
      return;
    }

    try {
      const result = await runPermissionTest();

      if (result.data) {
        const testResult: TestResult = {
          hasPermission: result.data.hasPermission || false,
          flags: result.data.flags || [],
          computedPermissions: result.data.computedPermissions || [],
          missingFlags: result.data.missingFlags || [],
          reason: result.data.reason,
        };

        const historyEntry = {
          ...testConfig,
          result: testResult,
          timestamp: new Date(),
        };

        setTestHistory((prev) => [historyEntry, ...prev.slice(0, 9)]); // Keep last 10 tests
      }
    } catch (error) {
      console.error('Permission test failed:', error);
    }
  };

  const clearTest = () => {
    setTestConfig({
      memberEmail: '',
      resourceType: '',
      resourceId: '',
      permission: '',
    });
  };

  const getPermissionIcon = (hasPermission: boolean) => {
    return hasPermission ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" />
    );
  };

  const formatTestDescription = (test: PermissionTest) => {
    const parts = [`User: ${test.memberEmail}`];

    if (test.resourceType) {
      parts.push(`Resource: ${test.resourceType}`);
    }

    if (test.resourceId) {
      parts.push(`ID: ${test.resourceId}`);
    }

    if (test.permission) {
      parts.push(`Permission: ${test.permission}`);
    }

    return parts.join(' | ');
  };

  return (
    <div className="space-y-6">
      {/* Test Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5" />
          Permission Tester
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Email *
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                value={testConfig.memberEmail}
                onChange={(e) =>
                  setTestConfig((prev) => ({
                    ...prev,
                    memberEmail: e.target.value,
                  }))
                }
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="member@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <select
              value={testConfig.resourceType}
              onChange={(e) =>
                setTestConfig((prev) => ({
                  ...prev,
                  resourceType: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any resource</option>
              {commonResourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource ID
            </label>
            <input
              type="text"
              value={testConfig.resourceId}
              onChange={(e) =>
                setTestConfig((prev) => ({
                  ...prev,
                  resourceId: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="specific-resource-id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permission
            </label>
            <select
              value={testConfig.permission}
              onChange={(e) =>
                setTestConfig((prev) => ({
                  ...prev,
                  permission: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any permission</option>
              {commonPermissions.map((perm) => (
                <option key={perm} value={perm}>
                  {perm}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={runTest}
            disabled={!testConfig.memberEmail || isTestingPermissions}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <PlayIcon className="h-4 w-4" />
            {isTestingPermissions ? 'Testing...' : 'Run Test'}
          </button>

          <button
            onClick={clearTest}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear
          </button>
        </div>

        {/* Quick Test Templates */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Quick Templates:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: 'Admin Access',
                config: { resourceType: 'settings', permission: 'manage' },
              },
              {
                label: 'Event Management',
                config: { resourceType: 'event', permission: 'write' },
              },
              {
                label: 'Member Export',
                config: { resourceType: 'user', permission: 'export' },
              },
              {
                label: 'Integration Access',
                config: { resourceType: 'integration', permission: 'read' },
              },
            ].map((template) => (
              <button
                key={template.label}
                onClick={() =>
                  setTestConfig((prev) => ({ ...prev, ...template.config }))
                }
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test Results */}
      {permissionData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Current Test Result</h3>

          <div className="space-y-4">
            {/* Permission Status */}
            <div
              className={`p-4 rounded-lg border-l-4 ${
                permissionData.hasPermission
                  ? 'bg-green-50 border-green-400'
                  : 'bg-red-50 border-red-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getPermissionIcon(permissionData.hasPermission)}
                <span
                  className={`font-medium ${
                    permissionData.hasPermission
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}
                >
                  {permissionData.hasPermission
                    ? 'Permission Granted'
                    : 'Permission Denied'}
                </span>
              </div>

              <div className="text-sm text-gray-700">
                {formatTestDescription(testConfig)}
              </div>

              {permissionData.reason && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Reason:</strong> {permissionData.reason}
                </div>
              )}
            </div>

            {/* Member Flags */}
            {permissionData.flags && permissionData.flags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Member Flags ({permissionData.flags.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {permissionData.flags.map((flag: any) => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                    >
                      <div className="flex items-center gap-2">
                        <KeyIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{flag.name}</span>
                        {flag.category && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                            {flag.category}
                          </span>
                        )}
                      </div>
                      {flag.expires_at && (
                        <span className="text-xs text-gray-500">
                          Expires:{' '}
                          {new Date(flag.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Computed Permissions */}
            {permissionData.computedPermissions &&
              permissionData.computedPermissions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Computed Permissions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {permissionData.computedPermissions.map(
                      (permission: string) => (
                        <span
                          key={permission}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
                        >
                          {permission}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Missing Flags */}
            {permissionData.missingFlags &&
              permissionData.missingFlags.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
                    Missing Required Flags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {permissionData.missingFlags.map((flag: string) => (
                      <span
                        key={flag}
                        className="px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Tests</h3>

          <div className="space-y-3">
            {testHistory.map((test, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
              >
                <div className="flex-1">
                  <div className="text-sm text-gray-900">
                    {formatTestDescription(test)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {test.timestamp.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getPermissionIcon(test.result.hasPermission)}
                  <button
                    onClick={() =>
                      setTestConfig({
                        memberEmail: test.memberEmail,
                        resourceType: test.resourceType || '',
                        resourceId: test.resourceId || '',
                        permission: test.permission || '',
                      })
                    }
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Rerun
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">
          How to Use the Permission Tester
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enter a member email to test their permissions</li>
          <li>
            • Optionally specify resource type, ID, and permission for targeted
            testing
          </li>
          <li>• Use quick templates for common permission scenarios</li>
          <li>
            • Review flags, computed permissions, and missing requirements
          </li>
          <li>• Test history helps you track and compare results</li>
        </ul>
      </div>
    </div>
  );
}

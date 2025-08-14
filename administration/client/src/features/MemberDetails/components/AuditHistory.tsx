import { AuditLogEntry } from '@/hooks/useAudit';

interface AuditHistoryProps {
  auditLog: AuditLogEntry[] | undefined;
}

export function AuditHistory({ auditLog }: AuditHistoryProps) {
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'view':
        return 'bg-blue-100 text-blue-800';
      case 'note':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!auditLog || auditLog.length === 0) {
    return <div className="text-gray-500 text-sm">No audit recorded yet.</div>;
  }

  return (
    <div className="space-y-4">
      {auditLog
        .filter((entry) => entry.action !== 'view')
        .map((entry) => (
          <div key={entry.id} className="border-l-4 border-blue-200 pl-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(
                    entry.action
                  )}`}
                >
                  {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                </span>
                <span className="text-sm text-gray-600">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                Session: {entry.user_email || 'unknown'} | IP: {entry.user_ip}
              </span>
            </div>

            {entry.action === 'update' &&
              entry.oldValues &&
              entry.newValues && (
                <div className="mt-2 text-sm">
                  <div className="text-gray-600 mb-1">Changes made:</div>
                  <div className="bg-gray-50 rounded p-2 space-y-1">
                    {Object.keys(entry.newValues).map((key) => {
                      const oldValue = entry.oldValues?.[key];
                      const newValue = entry.newValues?.[key];

                      if (
                        oldValue !== newValue &&
                        key !== 'id' &&
                        key !== 'updated_at'
                      ) {
                        return (
                          <div key={key} className="text-xs">
                            <span className="font-medium capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="text-red-600 line-through ml-1">
                              {String(oldValue || '(empty)')}
                            </span>
                            <span className="mx-1">→</span>
                            <span className="text-green-600">
                              {String(newValue || '(empty)')}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

            {entry.action === 'create' && entry.newValues && (
              <div className="mt-2 text-sm">
                <div className="text-gray-600">
                  Member created with initial data
                </div>
              </div>
            )}

            {entry.action === 'note' && entry.metadata && (
              <div className="mt-2 text-sm">
                <div className="bg-purple-50 rounded p-3 border-l-2 border-purple-200">
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {entry.metadata.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

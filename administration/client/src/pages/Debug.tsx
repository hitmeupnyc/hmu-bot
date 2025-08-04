import { useState } from 'react';

interface DebugResponse {
  status: string;
  timestamp: string;
  version: string;
  database: string;
  environment: string;
  debug?: {
    application: {
      name: string;
      version: string;
      environment: string;
      port: number;
      uptime: string;
    };
    database: {
      type: string;
      path: string;
      exists: boolean;
      size: string;
      tableCounts: {
        members: number;
        events: number;
        memberships: number;
      };
    };
    system: {
      platform: string;
      arch: string;
      hostname: string;
      release: string;
      totalMemory: string;
      freeMemory: string;
      cpus: number;
      loadAverage: number[];
    };
    process: {
      pid: number;
      version: string;
      nodeVersion: string;
      platform: string;
      arch: string;
      memoryUsage: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
        arrayBuffers: number;
      };
      uptime: number;
      cwd: string;
    };
    environment: Record<string, string>;
    git: {
      branch?: string;
      commit?: string;
      fullCommit?: string;
      error?: string;
    };
    network: {
      name: string;
      addresses: string[];
    }[];
    time: {
      iso: string;
      unix: number;
      local: string;
      utc: string;
    };
  };
}

export function Debug() {
  const [debugData, setDebugData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugKey, setDebugKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const fetchDebugData = async (key: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3000/health', {
        headers: {
          'X-Debug-Key': key,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch debug data: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.debug) {
        throw new Error('Invalid debug key - only basic health information returned');
      }

      setDebugData(result);
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDebugData(debugKey);
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  };

  if (!authenticated) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">Debug Access Required</h3>
              <p className="text-sm text-red-600 mt-1">
                This page contains sensitive system information and requires authentication.
              </p>
            </div>
          </div>

          <form onSubmit={handleKeySubmit} className="space-y-4">
            <div>
              <label htmlFor="debugKey" className="block text-sm font-medium text-red-700">
                Debug Key
              </label>
              <input
                type="password"
                id="debugKey"
                value={debugKey}
                onChange={(e) => setDebugKey(e.target.value)}
                className="mt-1 block w-full border border-red-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Enter debug access key"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Access Debug Info'}
            </button>
          </form>

          {error && <div className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded">{error}</div>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading debug information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchDebugData(debugKey)}
            className="mt-4 bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!debugData || !debugData.debug) {
    return <div className="p-8 text-center">No debug data available</div>;
  }

  const debug = debugData.debug;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 System Debug Information</h1>
        <p className="text-gray-600">
          Generated at {new Date(debugData.timestamp).toLocaleString()}
        </p>
        <button
          onClick={() => fetchDebugData(debugKey)}
          className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          🔄 Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Application Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🚀</span>
            Application
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-mono text-sm">{debug.application.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Version:</dt>
              <dd className="font-mono text-sm">{debug.application.version}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Environment:</dt>
              <dd className="font-mono text-sm">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    debug.application.environment === 'production'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {debug.application.environment}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Port:</dt>
              <dd className="font-mono text-sm">{debug.application.port}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Uptime:</dt>
              <dd className="font-mono text-sm">{debug.application.uptime}</dd>
            </div>
          </dl>
        </div>

        {/* Database Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🗄️</span>
            Database
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Type:</dt>
              <dd className="font-mono text-sm">{debug.database.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Status:</dt>
              <dd className="font-mono text-sm">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    debug.database.exists
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {debug.database.exists ? 'Connected' : 'Missing'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Size:</dt>
              <dd className="font-mono text-sm">{debug.database.size}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Members:</dt>
              <dd className="font-mono text-sm">{debug.database.tableCounts.members}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Events:</dt>
              <dd className="font-mono text-sm">{debug.database.tableCounts.events}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Memberships:</dt>
              <dd className="font-mono text-sm">{debug.database.tableCounts.memberships}</dd>
            </div>
          </dl>
        </div>

        {/* System Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">💻</span>
            System
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Platform:</dt>
              <dd className="font-mono text-sm">{debug.system.platform}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Architecture:</dt>
              <dd className="font-mono text-sm">{debug.system.arch}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Hostname:</dt>
              <dd className="font-mono text-sm">{debug.system.hostname}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">CPUs:</dt>
              <dd className="font-mono text-sm">{debug.system.cpus}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Total Memory:</dt>
              <dd className="font-mono text-sm">{debug.system.totalMemory}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Free Memory:</dt>
              <dd className="font-mono text-sm">{debug.system.freeMemory}</dd>
            </div>
          </dl>
        </div>

        {/* Process Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⚙️</span>
            Process
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">PID:</dt>
              <dd className="font-mono text-sm">{debug.process.pid}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Node Version:</dt>
              <dd className="font-mono text-sm">{debug.process.nodeVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Uptime:</dt>
              <dd className="font-mono text-sm">{formatUptime(debug.process.uptime)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Memory (RSS):</dt>
              <dd className="font-mono text-sm">{formatBytes(debug.process.memoryUsage.rss)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Heap Used:</dt>
              <dd className="font-mono text-sm">
                {formatBytes(debug.process.memoryUsage.heapUsed)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Heap Total:</dt>
              <dd className="font-mono text-sm">
                {formatBytes(debug.process.memoryUsage.heapTotal)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Git Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🌿</span>
            Git
          </h2>
          {debug.git.error ? (
            <p className="text-gray-500 italic">{debug.git.error}</p>
          ) : (
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Branch:</dt>
                <dd className="font-mono text-sm">{debug.git.branch || 'Unknown'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Commit:</dt>
                <dd className="font-mono text-sm">{debug.git.commit || 'Unknown'}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* Environment Variables */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔐</span>
            Environment
          </h2>
          <dl className="space-y-2">
            {Object.entries(debug.environment).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt className="text-gray-600">{key}:</dt>
                <dd className="font-mono text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      value.includes('[CONFIGURED]')
                        ? 'bg-green-100 text-green-800'
                        : value.includes('[NOT SET]')
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {value}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Network Info */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🌐</span>
          Network Interfaces
        </h2>
        <div className="space-y-4">
          {debug.network.map((iface, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-900">{iface.name}</h3>
              <div className="mt-1 space-y-1">
                {iface.addresses.map((addr, addrIndex) => (
                  <div key={addrIndex} className="font-mono text-sm text-gray-600">
                    {addr}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Info */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">🕐</span>
          Time Information
        </h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-between">
            <dt className="text-gray-600">ISO:</dt>
            <dd className="font-mono text-sm">{debug.time.iso}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Unix:</dt>
            <dd className="font-mono text-sm">{debug.time.unix}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Local:</dt>
            <dd className="font-mono text-sm">{debug.time.local}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">UTC:</dt>
            <dd className="font-mono text-sm">{debug.time.utc}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

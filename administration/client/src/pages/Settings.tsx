export function Settings() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Integration Settings</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Eventbrite</h3>
              <p className="text-sm text-gray-500 mb-2">Connect your Eventbrite account to sync events and attendees</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Configure Eventbrite
              </button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Patreon</h3>
              <p className="text-sm text-gray-500 mb-2">Sync patron information and membership levels</p>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                Configure Patreon
              </button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Klaviyo</h3>
              <p className="text-sm text-gray-500 mb-2">Manage email marketing and contact lists</p>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Configure Klaviyo
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500">General settings will be available in a future update.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Members</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Active Members</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">--</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Professional Affiliates</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">--</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Members</h3>
          <p className="text-gray-500">No members yet. Start by adding some!</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
          <p className="text-gray-500">No events scheduled.</p>
        </div>
      </div>
    </div>
  );
}
import { PlusIcon } from '@heroicons/react/24/outline';

export function Events() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Event
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md">
              Upcoming
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
              Past
            </button>
            <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">
              All
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events scheduled</h3>
            <p>Get started by creating your first event.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 002.25 2.25v7.5m-6 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0-6a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { EventService } from '../services/eventService';
import { EventWithDetails, Member, CreateEventMarketingRequest, CreateVolunteerRequest } from '../types';
import { EventMarketingForm } from '../components/EventMarketingForm';
import { EventVolunteersManager } from '../components/EventVolunteersManager';
import { Modal } from '../components/Modal';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState<EventWithDetails | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'marketing' | 'volunteers' | 'attendance'>('overview');
  const [showMarketingForm, setShowMarketingForm] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [volunteerLoading, setVolunteerLoading] = useState(false);

  const eventId = id ? parseInt(id, 10) : 0;

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
      fetchMembers();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await EventService.getEventWithDetails(eventId);
      if (response.success && response.data) {
        setEventDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members?limit=100');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleMarketingSubmit = async (data: CreateEventMarketingRequest) => {
    try {
      setMarketingLoading(true);
      await EventService.createEventMarketing(eventId, data);
      setShowMarketingForm(false);
      await fetchEventDetails();
    } catch (error) {
      console.error('Failed to save marketing:', error);
      alert('Failed to save marketing content. Please try again.');
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleVolunteerSubmit = async (data: CreateVolunteerRequest) => {
    try {
      setVolunteerLoading(true);
      await EventService.addVolunteer(eventId, data);
      await fetchEventDetails();
    } catch (error) {
      console.error('Failed to add volunteer:', error);
      alert('Failed to add volunteer. Please try again.');
    } finally {
      setVolunteerLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getEventStatus = () => {
    if (!eventDetails) return 'unknown';
    const now = new Date();
    const start = new Date(eventDetails.event.start_datetime);
    const end = new Date(eventDetails.event.end_datetime);
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'past';
  };

  const getStatusBadge = () => {
    const status = getEventStatus();
    const isActive = eventDetails ? eventDetails.event.flags & 1 : false;
    const isPublic = eventDetails ? eventDetails.event.flags & 2 : false;
    
    return (
      <div className="flex space-x-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
          status === 'ongoing' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status === 'upcoming' ? 'Upcoming' :
           status === 'ongoing' ? 'Ongoing' : 'Past'}
        </span>
        {isPublic && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            Public
          </span>
        )}
        {!isActive && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            Inactive
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading event details...</div>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event not found</h2>
        <button
          onClick={() => navigate('/events')}
          className="text-blue-600 hover:text-blue-500"
        >
          ← Back to Events
        </button>
      </div>
    );
  }

  const { event, marketing, volunteers, attendance } = eventDetails;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Events
          </button>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
              {event.description && (
                <p className="text-gray-600 mb-4">{event.description}</p>
              )}
              {getStatusBadge()}
            </div>
            <button 
              onClick={() => navigate('/events', { state: { editEventId: eventDetails.event.id } })}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit Event
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="font-medium text-gray-700">Start:</span>
              <div className="text-gray-900">{formatDateTime(event.start_datetime)}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">End:</span>
              <div className="text-gray-900">{formatDateTime(event.end_datetime)}</div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Capacity:</span>
              <div className="text-gray-900">{event.max_capacity || 'Unlimited'}</div>
            </div>
          </div>

          {eventDetails.eventbrite_link && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <span className="text-blue-800 font-medium">Eventbrite Integration:</span>
              <span className="text-blue-700 ml-2">
                Sync Status: {eventDetails.eventbrite_link.sync_status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'marketing', label: 'Marketing' },
              { key: 'volunteers', label: `Volunteers (${volunteers.length})` },
              { key: 'attendance', label: `Attendance (${attendance.length})` }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium text-gray-900 mb-2">Event Statistics</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total Registrations:</dt>
                      <dd className="font-medium">{attendance.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Volunteers:</dt>
                      <dd className="font-medium">{volunteers.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Checked In:</dt>
                      <dd className="font-medium">
                        {attendance.filter(a => a.check_in_method).length}
                      </dd>
                    </div>
                  </dl>
                </div>

                {eventDetails.eventbrite_event && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium text-gray-900 mb-2">Eventbrite Info</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Capacity:</dt>
                        <dd className="font-medium">{eventDetails.eventbrite_event.capacity || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Last Synced:</dt>
                        <dd className="font-medium">
                          {new Date(eventDetails.eventbrite_event.last_synced_at).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Marketing Tab */}
          {activeTab === 'marketing' && (
            <div>
              {marketing ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Marketing Content</h3>
                    <button
                      onClick={() => setShowMarketingForm(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Edit Marketing
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Primary Copy</h4>
                      <p className="text-gray-700 text-sm">{marketing.primary_marketing_copy || 'Not set'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Blurb</h4>
                      <p className="text-gray-700 text-sm">{marketing.blurb || 'Not set'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Social Media Copy</h4>
                      <p className="text-gray-700 text-sm">{marketing.social_media_copy || 'Not set'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Email Subject</h4>
                      <p className="text-gray-700 text-sm">{marketing.email_subject || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">No marketing content yet</h3>
                  <button
                    onClick={() => setShowMarketingForm(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Add Marketing Content
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Volunteers Tab */}
          {activeTab === 'volunteers' && (
            <EventVolunteersManager
              eventId={eventId}
              volunteers={volunteers}
              members={members}
              onAddVolunteer={handleVolunteerSubmit}
              isLoading={volunteerLoading}
            />
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Event Attendance</h3>
              
              {attendance.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No attendance records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Member
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ticket Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check-in Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendance.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.member_id ? `Member ${record.member_id}` : 'Non-member'}
                            </div>
                            {record.eventbrite_attendee_id && (
                              <div className="text-sm text-gray-500">
                                Eventbrite: {record.eventbrite_attendee_id}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.ticket_type || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.registration_date ? formatDateTime(record.registration_date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {record.check_in_method ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Checked In ({record.check_in_method})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Not Checked In
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Marketing Form Modal */}
      <Modal
        isOpen={showMarketingForm}
        onClose={() => setShowMarketingForm(false)}
        title="Event Marketing Content"
        size="large"
      >
        <EventMarketingForm
          eventId={eventId}
          initialData={marketing ? {
            ...marketing,
            hashtags: marketing.hashtags ? marketing.hashtags.split(',').map(tag => tag.trim()) : undefined,
            key_selling_points: marketing.key_selling_points ? marketing.key_selling_points.split(',').map(point => point.trim()) : undefined
          } : undefined}
          onSubmit={handleMarketingSubmit}
          onCancel={() => setShowMarketingForm(false)}
          isLoading={marketingLoading}
        />
      </Modal>
    </div>
  );
}
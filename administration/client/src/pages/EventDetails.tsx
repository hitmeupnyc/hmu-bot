import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventMarketingForm } from '../components/EventMarketingForm';
import { EventVolunteersManager } from '../components/EventVolunteersManager';
import { Modal } from '../components/Modal';
import {
  Attendance,
  Header,
  LoadingStates,
  Marketing,
  Overview,
  Tabs,
} from '../features/EventDetails/components';
import { useEventCrud } from '../features/EventDetails/hooks/useEventCrud';
import { useEventDetails } from '../hooks/useEvents';
import { useMembers } from '../hooks/useMembers';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'marketing' | 'volunteers' | 'attendance'
  >('overview');
  const [showMarketingForm, setShowMarketingForm] = useState(false);

  const eventId = parseInt(id || '0', 10);
  const {
    data: eventDetails,
    isLoading,
    error,
  } = useEventDetails(eventId, !!id);
  const { data: membersData } = useMembers({ limit: 100 });
  const members = membersData?.members || [];

  const {
    handleMarketingSubmit,
    handleVolunteerSubmit,
    marketingLoading,
    volunteerLoading,
  } = useEventCrud(eventId);

  if (isLoading || error || !eventDetails) {
    return <LoadingStates isLoading={isLoading} error={error} />;
  }

  const { event, marketing, volunteers, attendance } = eventDetails;

  return (
    <div className="max-w-7xl mx-auto">
      <Header
        event={event}
        eventDetails={eventDetails}
        onBack={() => navigate('/events')}
        onEdit={() => navigate('/events', { state: { editEventId: event.id } })}
      />

      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        volunteersCount={volunteers.length}
        attendanceCount={attendance.length}
      >
        {activeTab === 'overview' && (
          <Overview
            eventDetails={eventDetails}
            volunteers={volunteers}
            attendance={attendance}
          />
        )}

        {activeTab === 'marketing' && (
          <Marketing
            marketing={marketing}
            onEditMarketing={() => setShowMarketingForm(true)}
          />
        )}

        {activeTab === 'volunteers' && (
          <EventVolunteersManager
            eventId={eventId}
            volunteers={volunteers}
            members={members}
            onAddVolunteer={handleVolunteerSubmit}
            isLoading={volunteerLoading}
          />
        )}

        {activeTab === 'attendance' && <Attendance attendance={attendance} />}
      </Tabs>

      {/* Marketing Form Modal */}
      <Modal
        isOpen={showMarketingForm}
        onClose={() => setShowMarketingForm(false)}
        title="Event Marketing Content"
        size="large"
      >
        <EventMarketingForm
          eventId={eventId}
          initialData={
            marketing
              ? {
                  ...marketing,
                  hashtags: marketing.hashtags
                    ? marketing.hashtags.split(',').map((tag) => tag.trim())
                    : undefined,
                  key_selling_points: marketing.key_selling_points
                    ? marketing.key_selling_points
                        .split(',')
                        .map((point) => point.trim())
                    : undefined,
                }
              : undefined
          }
          onSubmit={async (data) => {
            await handleMarketingSubmit(data);
            setShowMarketingForm(false);
          }}
          onCancel={() => setShowMarketingForm(false)}
          isLoading={marketingLoading}
        />
      </Modal>
    </div>
  );
}

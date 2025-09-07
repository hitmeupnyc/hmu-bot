import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Header,
  LoadingStates,
  Overview,
  Tabs,
} from '@/features/EventDetails/components';
import { useEventDetails } from '@/hooks/useEvents';

export function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  const eventId = parseInt(id || '0', 10);
  const { data: event, isLoading, error } = useEventDetails(eventId, !!id);

  if (isLoading || error) {
    return <LoadingStates isLoading={isLoading} error={error} />;
  }


  return (
    <div className="max-w-7xl mx-auto">
      <Header
        event={event}
        onBack={() => navigate('/events')}
        onEdit={() => navigate('/events', { state: { editEventId: event.id } })}
      />

      <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'overview' && <Overview event={event} />}
      </Tabs>
    </div>
  );
}

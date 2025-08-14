import { Modal } from '@/components/Modal';
import { EventForm } from '@/features/EventDetails/components/EventForm';
import { Event, EventFormData } from '@/types';

interface EventFormModalProps {
  isOpen: boolean;
  editingEvent: Event | null;
  onSubmit: (formData: EventFormData) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export function EventFormModal({
  isOpen,
  editingEvent,
  onSubmit,
  onClose,
  isLoading,
}: EventFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingEvent ? 'Edit Event' : 'Create New Event'}
    >
      <EventForm
        event={editingEvent || undefined}
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </Modal>
  );
}

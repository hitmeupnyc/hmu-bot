import { Modal } from '@/components/Modal';
import { EditMemberForm } from '@/features/MemberDetails/components/EditMemberForm';
import { Member, MemberFormData } from '@/types';

interface MemberFormModalProps {
  isOpen: boolean;
  editingMember: Member | null;
  onSubmit: (formData: MemberFormData) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

export function MemberFormModal({
  isOpen,
  editingMember,
  onSubmit,
  onClose,
  isLoading,
}: MemberFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMember ? 'Edit Member' : 'Add New Member'}
    >
      <EditMemberForm
        member={editingMember || undefined}
        onSubmit={onSubmit}
        onCancel={onClose}
        isLoading={isLoading}
      />
    </Modal>
  );
}

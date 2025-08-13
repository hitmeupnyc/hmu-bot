import { Modal } from '../../../components/Modal';
import { Member, MemberFormData } from '../../../types';
import { EditMemberForm } from '../../MemberDetails/components/EditMemberForm';

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
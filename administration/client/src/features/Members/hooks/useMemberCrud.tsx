import { useState } from 'react';
import {
  useCreateMember,
  useDeleteMember,
  useUpdateMember,
} from '../../../hooks/useMembers';
import { Member, MemberFormData } from '../../../types';

export function useMemberCrud() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const handleCreateMember = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleDeleteMember = async (member: Member) => {
    try {
      await deleteMember.mutateAsync(member.id);
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('Failed to delete member. Please try again.');
    }
  };

  const handleFormSubmit = async (formData: MemberFormData) => {
    try {
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          preferred_name: formData.preferred_name || '',
          email: formData.email,
          pronouns: formData.pronouns || '',
          sponsor_notes: formData.sponsor_notes || '',
          is_professional_affiliate: formData.is_professional_affiliate,
        });
      } else {
        await createMember.mutateAsync({
          first_name: formData.first_name,
          last_name: formData.last_name,
          preferred_name: formData.preferred_name || '',
          email: formData.email,
          pronouns: formData.pronouns || '',
          sponsor_notes: formData.sponsor_notes || '',
          is_professional_affiliate: formData.is_professional_affiliate,
        });
      }

      setIsModalOpen(false);
      setEditingMember(null);
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Failed to save member. Please try again.');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
  };

  return {
    isModalOpen,
    editingMember,
    handleCreateMember,
    handleEditMember,
    handleDeleteMember,
    handleFormSubmit,
    closeModal,
    isCreatePending: createMember.isPending,
    isUpdatePending: updateMember.isPending,
    isDeletePending: deleteMember.isPending,
    isFormLoading: createMember.isPending || updateMember.isPending,
  };
}

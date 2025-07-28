import { Router } from 'express';
import { MemberService } from '../services/MemberService';
import { asyncHandler } from '../middleware/errorHandler';
import { ApplicationFormData } from '../types';

const router = Router();
const memberService = new MemberService();

// POST /api/applications - Submit new membership application
router.post('/', asyncHandler(async (req, res) => {
  const applicationData: ApplicationFormData = req.body;
  
  // Convert application data to member format
  const memberData = {
    first_name: applicationData.name.split(' ')[0] || '',
    last_name: applicationData.name.split(' ').slice(1).join(' ') || '',
    preferred_name: applicationData.preferred_name,
    email: applicationData.email,
    pronouns: applicationData.pronouns,
    sponsor_notes: `Application: ${applicationData.sponsor_name} sponsor. Referral: ${applicationData.referral_source}. ${applicationData.referral_details ? 'Details: ' + applicationData.referral_details : ''}`,
    is_professional_affiliate: false // Applications start as regular members
  };
  
  // Create the member record
  const member = await memberService.createMember(memberData);
  
  // Log the full application data for review
  console.log('New membership application received:', {
    memberId: member.id,
    applicationData: applicationData
  });
  
  res.status(201).json({
    success: true,
    data: { memberId: member.id },
    message: 'Application submitted successfully'
  });
}));

export { router as applicationRoutes };
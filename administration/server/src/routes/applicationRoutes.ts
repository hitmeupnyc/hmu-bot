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

// POST /api/applications/bulk - Bulk import applications from CSV
router.post('/bulk', asyncHandler(async (req, res) => {
  const { applications }: { applications: ApplicationFormData[] } = req.body;
  
  if (!Array.isArray(applications) || applications.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input: applications array is required'
    });
  }
  
  const results = {
    imported: 0,
    errors: [] as Array<{ index: number; error: string; email?: string }>
  };
  
  // Process each application
  for (let i = 0; i < applications.length; i++) {
    try {
      const applicationData = applications[i];
      
      // Convert application data to member format
      const memberData = {
        first_name: applicationData.name.split(' ')[0] || '',
        last_name: applicationData.name.split(' ').slice(1).join(' ') || '',
        preferred_name: applicationData.preferred_name,
        email: applicationData.email,
        pronouns: applicationData.pronouns,
        sponsor_notes: `CSV Import - Application: ${applicationData.sponsor_name} sponsor. Referral: ${applicationData.referral_source}. ${applicationData.referral_details ? 'Details: ' + applicationData.referral_details : ''}. Kinky Experience: ${applicationData.kinky_experience}. Self Description: ${applicationData.self_description}. Consent Understanding: ${applicationData.consent_understanding}. ${applicationData.additional_info ? 'Additional: ' + applicationData.additional_info : ''}`,
        is_professional_affiliate: false
      };
      
      // Create the member record
      await memberService.createMember(memberData);
      results.imported++;
      
      // Log the application data
      console.log('CSV Import - New membership application:', {
        index: i + 1,
        email: applicationData.email,
        applicationData: applicationData
      });
      
    } catch (error) {
      console.error(`CSV Import - Failed to process application ${i + 1}:`, error);
      results.errors.push({
        index: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
        email: applications[i]?.email
      });
    }
  }
  
  const statusCode = results.errors.length > 0 ? 207 : 201; // 207 Multi-Status for partial success
  
  res.status(statusCode).json({
    success: results.errors.length === 0,
    data: {
      imported: results.imported,
      total: applications.length,
      errors: results.errors
    },
    message: `Imported ${results.imported} out of ${applications.length} applications${
      results.errors.length > 0 ? ` (${results.errors.length} errors)` : ''
    }`
  });
}));

export { router as applicationRoutes };
import { Effect } from 'effect';
import { Router } from 'express';
import { MemberService } from '../services/effect/MemberEffects';
import {
  effectToExpress,
  extractBody,
} from '../services/effect/adapters/expressAdapter';

interface ApplicationFormData {
  name: string;
  pronouns: string;
  preferred_name: string;
  email: string;
  social_urls: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  birth_year: number;
  referral_source: string;
  sponsor_name: string;
  sponsor_email_confirmation: boolean;
  referral_details: string;
  kinky_experience: string;
  self_description: string;
  consent_understanding: string;
  additional_info: string;
  consent_policy_agreement: 'yes' | 'questions';
}

const router = Router();

// POST /api/applications - Submit new membership application
router.post(
  '/',
  effectToExpress((req, res) => {
    res.status(201);
    return Effect.gen(function* () {
      const applicationData = yield* extractBody<ApplicationFormData>(req);

      // Convert application data to member format
      const memberData = {
        first_name: applicationData.name.split(' ')[0] || '',
        last_name: applicationData.name.split(' ').slice(1).join(' ') || '',
        preferred_name: applicationData.preferred_name,
        email: applicationData.email,
        pronouns: applicationData.pronouns,
        sponsor_notes: `Application: ${applicationData.sponsor_name} sponsor. Referral: ${applicationData.referral_source}. ${applicationData.referral_details ? 'Details: ' + applicationData.referral_details : ''}`,
      };

      // Create the member record

      const memberService = yield* MemberService;
      const member = yield* memberService.createMember(memberData);

      // Log the full application data for review
      console.log('New membership application received:', {
        memberId: member.id,
        applicationData: applicationData,
      });

      return {
        success: true,
        data: { memberId: member.id },
        message: 'Application submitted successfully',
      };
    });
  })
);

// POST /api/applications/bulk - Bulk import applications from CSV
router.post(
  '/bulk',
  effectToExpress((req, res) =>
    Effect.gen(function* () {
      const bodyData = yield* extractBody<{
        applications: ApplicationFormData[];
      }>(req);
      const { applications } = bodyData;

      if (!Array.isArray(applications) || applications.length === 0) {
        res.status(400);
        return {
          success: false,
          error: 'Invalid input: applications array is required',
        };
      }

      const results = {
        imported: 0,
        errors: [] as Array<{ index: number; error: string; email?: string }>,
      };

      // Process each application using Effect.forEach for better error handling
      yield* Effect.forEach(
        applications,
        (applicationData, index) =>
          Effect.gen(function* () {
            try {
              // Convert application data to member format
              const memberData = {
                first_name: applicationData.name.split(' ')[0] || '',
                last_name:
                  applicationData.name.split(' ').slice(1).join(' ') || '',
                preferred_name: applicationData.preferred_name,
                email: applicationData.email,
                pronouns: applicationData.pronouns,
                sponsor_notes: `CSV Import - Application: ${applicationData.sponsor_name} sponsor. Referral: ${applicationData.referral_source}. ${applicationData.referral_details ? 'Details: ' + applicationData.referral_details : ''}. Kinky Experience: ${applicationData.kinky_experience}. Self Description: ${applicationData.self_description}. Consent Understanding: ${applicationData.consent_understanding}. ${applicationData.additional_info ? 'Additional: ' + applicationData.additional_info : ''}`,
              };

              // Create the member record
              const memberService = yield* MemberService;
              yield* memberService.createMember(memberData);
              results.imported++;

              // Log the application data
              console.log('CSV Import - New membership application:', {
                index: index + 1,
                email: applicationData.email,
                applicationData: applicationData,
              });
            } catch (error) {
              console.error(
                `CSV Import - Failed to process application ${index + 1}:`,
                error
              );
              results.errors.push({
                index: index + 1,
                error: error instanceof Error ? error.message : 'Unknown error',
                email: applicationData?.email,
              });
            }
          }).pipe(
            Effect.catchAll(() => Effect.succeed(void 0)) // Continue processing even if one fails
          ),
        { concurrency: 1 } // Process sequentially to avoid overwhelming the database
      );

      const statusCode = results.errors.length > 0 ? 207 : 201; // 207 Multi-Status for partial success
      res.status(statusCode);

      return {
        success: results.errors.length === 0,
        data: {
          imported: results.imported,
          total: applications.length,
          errors: results.errors,
        },
        message: `Imported ${results.imported} out of ${applications.length} applications${
          results.errors.length > 0 ? ` (${results.errors.length} errors)` : ''
        }`,
      };
    })
  )
);

export { router as applicationRoutes };

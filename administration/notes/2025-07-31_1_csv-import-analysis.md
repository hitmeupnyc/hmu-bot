# CSV Import for Applications - Analysis

## Current Application Structure

Based on my exploration of the codebase, I found:

### Frontend (ApplicationForm.tsx)
- Complex form with sections: Basic Info, Social Media, Referral, Sponsor, Experience, Consent
- Validation for required fields (name, email, birth_year, referral_source, etc.)
- Rich form data structure with nested social_urls object

### Backend (applicationRoutes.ts)
- Single POST endpoint `/api/applications`
- Converts application data to member format
- Creates member record via MemberService
- Maps application fields to Members table structure

### Database Structure (Members table)
- Basic fields: first_name, last_name, email, preferred_name, pronouns
- sponsor_notes (text field for application details)
- flags (bitfield as per CLAUDE.md guidance)
- created_at, updated_at timestamps

## CSV Import Implementation Plan

1. **CSV Structure Design**: Create template matching ApplicationFormData structure
2. **Backend API**: New endpoint for bulk CSV processing
3. **Frontend UI**: File upload with validation preview
4. **Processing Logic**: Parse, validate, and batch import applications
5. **Error Handling**: Detailed feedback for validation failures

## Key Considerations
- Maintain existing validation rules from ApplicationForm
- Handle nested social_urls structure in CSV format
- Preserve audit trail for bulk imports
- Support partial imports (skip invalid rows, import valid ones)
# Task: Implement Profile Management Screen

## Description
Create a comprehensive profile management interface for users to update their personal information, professional details, and account settings. The screen should support both customer and professional user types with appropriate fields for each.

## Acceptance Criteria
* Profile sections with accordion/tab layout:
  - Personal Information
  - Professional Details (for professionals only)
  - Bank Account (for professionals only)
  - Security Settings
  - Privacy Settings
* Personal Information section:
  - Avatar upload with crop tool
  - Full name (first and last)
  - Email (with verification status)
  - Phone number (with verification)
  - CPF/CNPJ validation
  - Address with CEP lookup
  - Date of birth
  - Bio/description field
* Professional Details section:
  - Business name
  - Service categories
  - Years of experience
  - Certifications/licenses upload
  - Portfolio link
  - Service areas (neighborhoods/cities)
  - Languages spoken
* Bank Account section:
  - Account type (checking/savings)
  - Bank selection dropdown
  - Agency and account numbers
  - PIX key configuration
  - Account holder name verification
* Security Settings:
  - Password change form
  - Two-factor authentication setup
  - Active sessions list
  - Login history
* Auto-save functionality with indicators
* Field validation with helpful error messages
* Progress indicator for profile completion
* Mobile-responsive form layout

## Technical Implementation
* **Components to create:**
  - `ProfileManagement.tsx` - Main container
  - `PersonalInfoForm.tsx` - Personal details form
  - `ProfessionalDetailsForm.tsx` - Professional info
  - `BankAccountForm.tsx` - Banking details
  - `SecuritySettings.tsx` - Security options
  - `AvatarUpload.tsx` - Image upload with crop
  - `ProfileProgress.tsx` - Completion indicator
  - `AutoSaveIndicator.tsx` - Save status display

* **tRPC API calls:**
  - `profile.get(userId)` - Fetch profile data
  - `profile.updatePersonal(userId, data)` - Update personal info
  - `profile.updateProfessional(userId, data)` - Update professional details
  - `profile.updateBankAccount(userId, data)` - Update banking
  - `profile.uploadAvatar(userId, file)` - Upload profile picture
  - `profile.verifyCPF(cpf)` - Validate CPF/CNPJ
  - `address.lookupCEP(cep)` - CEP address lookup
  - `banks.getList()` - Fetch bank list

* **Features to implement:**
  - React Dropzone for avatar upload
  - Image cropping tool
  - Auto-save with debouncing (3 seconds)
  - CEP API integration for address
  - CPF/CNPJ validation algorithm
  - Form section validation
  - Progress calculation logic

* **Validation rules:**
  - Email format validation
  - Phone number format (Brazilian)
  - CPF/CNPJ checksum validation
  - Required fields based on user type
  - Bank account number formats

## Dependencies
* React Hook Form with validation
* React Dropzone for file upload
* React Avatar Editor for image cropping
* Brazilian validation libraries (CPF/CNPJ)
* CEP lookup API integration
* Auto-save hook implementation

## Related Tasks
* T2025-08-02-implement-backend-profile-update.md - Backend endpoints
* T2025-08-02-implement-avatar-upload.md - Avatar system
* T2025-08-02-implement-document-verification.md - KYC verification
* T2025-08-02-implement-professional-portfolio.md - Portfolio feature
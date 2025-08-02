# Task: Implement Create Service Form

## Description
Design and implement a multi-step wizard form for professionals to create new service listings. The form should guide users through all required information while providing helpful tips and real-time validation to ensure high-quality service listings.

## Acceptance Criteria
* Multi-step wizard with progress indicator:
  - Step 1: Basic Information (title, category, description)
  - Step 2: Pricing & Options (packages, add-ons)
  - Step 3: Availability Setup (schedule, booking rules)
  - Step 4: Photos & Media (gallery upload)
  - Step 5: Preview & Publish
* Basic Information step includes:
  - Service title with character limit (100 chars)
  - Category selection dropdown
  - Detailed description with rich text editor
  - Service tags for searchability
* Pricing step features:
  - Multiple pricing packages (Basic, Standard, Premium)
  - Custom package names and descriptions
  - Add-on services with individual pricing
  - Currency formatting (R$)
  - Estimated duration per package
* Availability configuration:
  - Weekly schedule grid
  - Booking advance notice (hours/days)
  - Maximum bookings per day
  - Blackout dates selector
  - Service location (on-site, customer location, remote)
* Photo upload with:
  - Drag-and-drop interface
  - Multiple file selection (max 10 photos)
  - Image reordering
  - Caption/description per photo
  - Cover photo selection
* Preview mode showing exact service appearance
* Save as draft functionality
* Form validation with helpful error messages
* Tips and best practices inline
* Mobile-responsive wizard navigation

## Technical Implementation
* **Components to create:**
  - `CreateServiceForm.tsx` - Main wizard container
  - `ServiceBasicInfo.tsx` - Step 1 component
  - `ServicePricing.tsx` - Step 2 with package builder
  - `ServiceAvailability.tsx` - Step 3 schedule setup
  - `ServicePhotos.tsx` - Step 4 media upload
  - `ServicePreview.tsx` - Step 5 preview
  - `WizardProgress.tsx` - Progress indicator
  - `DraftManager.tsx` - Auto-save functionality

* **tRPC API calls:**
  - `services.create(serviceData)` - Create new service
  - `services.saveDraft(draftData)` - Save draft
  - `services.uploadPhotos(files)` - Upload images
  - `categories.getAll()` - Fetch categories
  - `services.validateTitle(title)` - Check title uniqueness

* **Form management:**
  - React Hook Form for validation
  - Multi-step form state management
  - File upload with progress tracking
  - Auto-save draft every 30 seconds
  - Form data persistence in localStorage

* **Validation rules:**
  - Required fields validation
  - Price must be greater than 0
  - At least one photo required
  - Schedule must have available slots
  - Description minimum 50 characters

## Dependencies
* React Hook Form with yup validation
* Rich text editor component
* React Dropzone for file uploads
* Date picker for availability
* Image compression library

## Related Tasks
* T2025-08-02-develop-frontend-create-service-form.md - Original task
* T2025-08-02-implement-backend-create-service-endpoint.md - Backend API
* T2025-08-02-implement-photo-upload.md - Photo upload system
* T2025-08-02-implement-edit-service-screen.md - Edit functionality
# Task: Implement Notification Preferences UI

## Description
Create a user-friendly interface for users to manage their notification preferences across different channels (SMS, WhatsApp, Email) and notification types. This screen should provide granular control over which notifications users receive and when.

## Acceptance Criteria
* Notification channels section:
  - Toggle switches for SMS, WhatsApp, and Email
  - Channel status indicators (enabled/disabled)
  - Phone number and email verification status
* Notification types matrix:
  - Rows for each notification type:
    - New booking requests (professionals)
    - Booking confirmations
    - Booking updates (accepted/declined/cancelled)
    - Payment confirmations
    - Service reminders (24h before)
    - Review requests
    - Promotional offers
    - Platform updates
  - Columns for each channel with checkboxes
  - Select all/none options per channel
* Quiet hours settings:
  - Enable/disable quiet hours
  - Start and end time selectors
  - Timezone display and selection
  - Override for urgent notifications
* Additional preferences:
  - Language selection (Portuguese, English)
  - Notification frequency (immediate, daily digest)
  - Email format (HTML, plain text)
* Test notification feature:
  - Send test button for each channel
  - Success/error feedback
  - Preview of notification format
* Save changes with confirmation
* Mobile-responsive layout

## Technical Implementation
* **Components to create:**
  - `NotificationPreferences.tsx` - Main container
  - `ChannelToggles.tsx` - Channel enable/disable switches
  - `NotificationMatrix.tsx` - Type vs channel grid
  - `QuietHours.tsx` - Do not disturb settings
  - `LanguageSelector.tsx` - Language preference
  - `TestNotification.tsx` - Test sending component
  - `PreferencesSaveBar.tsx` - Save/cancel actions

* **tRPC API calls:**
  - `notifications.getPreferences(userId)` - Fetch current settings
  - `notifications.updatePreferences(userId, preferences)` - Save changes
  - `notifications.sendTest(userId, channel)` - Send test notification
  - `notifications.verifyChannel(userId, channel, code)` - Verify phone/email
  - `notifications.getSupportedLanguages()` - Get available languages

* **State management:**
  - Form state with React Hook Form
  - Unsaved changes detection
  - Loading states for save/test operations
  - Validation for phone numbers and email

* **Features to implement:**
  - Auto-save draft preferences
  - Bulk selection controls
  - Visual feedback for changes
  - Confirmation before disabling all notifications
  - Help tooltips for each notification type

## Dependencies
* React Hook Form for form management
* Phone number input component with validation
* Time picker component
* Toggle/switch components
* Toast notifications for feedback

## Related Tasks
* T2025-08-02-implement-backend-notification-preferences.md - Backend API
* T2025-08-02-implement-twilio-integration.md - Notification sending
* T2025-08-02-implement-user-settings-screen.md - Parent settings page
* T2025-08-02-implement-notification-templates.md - Message templates
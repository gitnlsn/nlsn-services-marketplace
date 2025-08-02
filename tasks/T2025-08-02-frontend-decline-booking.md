# Task: Develop frontend action for professionals to decline a booking

## Description
Develop the frontend functionality that allows a professional to decline a booking request. This will typically involve a button or action on the professional's "My Bookings" screen.

## Acceptance Criteria
*   A clear UI element (e.g., a "Decline" button) is available for pending booking requests on the professional's "My Bookings" screen.
*   Clicking the "Decline" button triggers a backend API call to update the booking status.
*   Upon successful declination, the UI for that booking updates to reflect the new status (e.g., "Declined").
*   The functionality adheres to Shadcn UI styling and native HTML validation principles (if applicable).

## Technical Notes
*   Utilize Shadcn UI `Button` component.
*   Implement a client-side function to call the backend API for updating booking status.
*   Consider optimistic UI updates for a smoother user experience.
*   Ensure proper error handling and user feedback for declination failures.

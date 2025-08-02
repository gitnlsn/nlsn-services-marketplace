# Task: Develop frontend action for users (client/professional) to cancel a booking

## Description
Develop the frontend functionality that allows both clients and professionals to cancel a booking. This will typically involve a button or action on their respective "My Bookings" screens.

## Acceptance Criteria
*   A clear UI element (e.g., a "Cancel" button) is available for bookings on both the client's and professional's "My Bookings" screens.
*   Clicking the "Cancel" button triggers a backend API call to update the booking status.
*   Upon successful cancellation, the UI for that booking updates to reflect the new status (e.g., "Cancelled").
*   The functionality adheres to Shadcn UI styling and native HTML validation principles (if applicable).
*   Consider confirmation dialogs before proceeding with cancellation.

## Technical Notes
*   Utilize Shadcn UI `Button` component and potentially a `AlertDialog` for confirmation.
*   Implement a client-side function to call the backend API for updating booking status.
*   Consider optimistic UI updates for a smoother user experience.
*   Ensure proper error handling and user feedback for cancellation failures.

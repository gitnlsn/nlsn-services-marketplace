# Task: Implement My Bookings Screen (Customer View)

## Description
Create the My Bookings screen for customers to view and manage all their service bookings. This screen should provide a clear overview of upcoming, past, and cancelled bookings with appropriate actions for each status.

## Acceptance Criteria
* Tab navigation for booking categories:
  - Upcoming bookings (default view)
  - Past bookings
  - Cancelled bookings
* Booking cards display:
  - Service name and image
  - Professional name and avatar
  - Booking date and time
  - Service location/address
  - Booking status badge
  - Total price paid
  - Booking reference number
* Quick actions per booking status:
  - Upcoming: Cancel booking, Message professional, Add to calendar
  - Past: Leave review, Book again, View receipt
  - Cancelled: Rebook service, View cancellation details
* Filter options:
  - Date range picker
  - Service category filter
  - Search by service/professional name
* Export functionality:
  - Export to calendar (ICS file)
  - Download booking history (PDF/CSV)
* Empty states for each tab with helpful CTAs
* Pagination or infinite scroll for long lists
* Mobile-optimized with swipe gestures between tabs

## Technical Implementation
* **Components to create:**
  - `MyBookingsCustomer.tsx` - Main container component
  - `BookingTabs.tsx` - Tab navigation component
  - `BookingCard.tsx` - Individual booking display
  - `BookingFilters.tsx` - Filter controls
  - `BookingActions.tsx` - Action buttons per status
  - `EmptyBookings.tsx` - Empty state component
  - `ExportOptions.tsx` - Export functionality

* **tRPC API calls:**
  - `bookings.getCustomerBookings(customerId, status, filters)` - Fetch bookings
  - `bookings.cancel(bookingId, reason)` - Cancel booking
  - `bookings.getReceipt(bookingId)` - Download receipt
  - `bookings.exportToCalendar(bookingId)` - Get ICS data
  - `bookings.exportHistory(customerId, format)` - Export booking history

* **Features to implement:**
  - Tab state persistence in URL
  - Real-time status updates
  - Calendar integration (Google, Apple, Outlook)
  - PDF receipt generation
  - Booking history export

* **State management:**
  - Active tab state
  - Filter state with debouncing
  - Pagination state
  - Loading and error states per tab

## Dependencies
* React Query for data fetching
* Date picker component
* PDF generation library
* Calendar export library (ical.js)
* Tab component from UI library

## Related Tasks
* T2025-08-02-develop-frontend-customer-view-bookings.md - Original task
* T2025-08-02-frontend-cancel-booking.md - Cancel functionality
* T2025-08-02-implement-reviews-screen.md - Review functionality
* T2025-08-02-implement-messaging-system.md - Professional messaging
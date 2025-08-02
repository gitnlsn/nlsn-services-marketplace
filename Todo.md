# Project Development Tasks

This document outlines the key development tasks derived from the project's documentation, categorized by feature area.

## 1. Authentication

*   Ensure user authentication status is reflected on the frontend.

## 2. Service Management

### 2.4 Performance Monitoring (Future Consideration)

*   Consider implementing a dashboard for professionals to view service performance (views, inquiries, booking history).

## 3. Search

*   Implement filtering and categorization options for search results.

## 4. Booking Management

### 4.3 Accept Booking

*   Develop frontend action for professionals to accept a booking.
*   Implement backend endpoint to update booking status to "Accepted".

### 4.4 Decline Booking

*   Develop frontend action for professionals to decline a booking.
*   Implement backend endpoint to update booking status to "Declined".

### 4.5 Cancel Booking

*   Develop frontend action for users (client/professional) to cancel a booking.
*   Implement backend endpoint to update booking status to "Cancelled".

## 5. Payments

### 5.1 Service Payment

*   Implement frontend payment interface.
*   Integrate with Pagarme API for processing payments (credit cards, Pix, boleto).
*   Implement backend webhook to handle Pagarme payment success notifications.
*   Update booking/transaction status in the database upon payment confirmation.
*   Implement escrow logic: hold funds until service completion, then release to professional's account after 15-day holding period.

## 6. Notifications

*   Integrate with Twilio API for sending SMS, WhatsApp, and Email notifications.
*   Implement backend logic to send notifications for:
    *   New Booking (to professional).
    *   Booking Confirmation (to client after payment).
    *   Service Completed (to client, prompting review).
    *   Withdrawal Successful (to professional).

### 6.1 Manage Notification Preferences

*   Develop frontend interface for users to manage their notification preferences (channels, types).
*   Implement backend endpoint to update user notification preferences.

## 7. User Profile & Reviews

### 7.1 Manage Profile

*   Develop frontend interface for users to manage their profile information.
*   Implement backend endpoint to update user profile records.

### 7.2 Leave a Review

*   Develop frontend interface for clients to leave reviews for completed services.
*   Implement backend endpoint to create review records.
*   Implement backend logic to update service/professional ratings based on new reviews.

## 8. Photo Upload

*   Integrate with cloud storage solution for storing image files.
*   Store photo URLs/metadata in the database (Prisma).

## 9. Frontend Screens (General UI/UX)

*   Design and implement the Home Screen (featured services, search bar, categories).
*   Design and implement Search Results Screen.
*   Design and implement Service Detail Screen.
*   Design and implement Professional Profile Screen (public view).
*   Design and implement Booking Confirmation Screen.
*   Design and implement Payment Screen.
*   Design and implement My Bookings Screen (Customer view).
*   Design and implement Reviews Screen.
*   Design and implement Professional Dashboard.
*   Design and implement My Services Screen (professional view).
*   Design and implement Create Service Screen.
*   Design and implement Edit Service Screen.
*   Design and implement My Bookings Screen (Professional view).
*   Design and implement Earnings & Withdrawal Screen.
*   Design and implement Professional Profile Screen (edit view).
*   Implement navigation flows between all screens as described in `frontend-screens.html`.

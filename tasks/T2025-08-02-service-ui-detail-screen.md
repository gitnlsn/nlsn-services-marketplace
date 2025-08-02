# Task: Implement Service Detail Screen

## Description
Create the Service Detail Screen that displays comprehensive information about a specific service, including image galleries, pricing, availability, professional information, and reviews. This is a critical conversion page where users decide to book a service.

## Acceptance Criteria
* Image gallery with main image and thumbnails (Swiper.js carousel)
* Service title, description, and category badges
* Pricing table with different options/packages
* Availability calendar showing bookable dates/times
* Professional info card with:
  - Avatar and name
  - Rating and review count
  - Response time
  - Verification badges
  - "View Profile" link
* Reviews section with:
  - Overall rating breakdown
  - Individual reviews with photos
  - Filter by rating
  - Load more pagination
* Sticky booking CTA that follows scroll
* Share buttons for social media
* Related services suggestions
* Breadcrumb navigation
* Mobile-optimized layout with bottom booking bar

## Technical Implementation
* **Components to create:**
  - `ServiceDetailScreen.tsx` - Main container
  - `ServiceImageGallery.tsx` - Swiper.js image carousel
  - `PricingTable.tsx` - Service pricing options
  - `AvailabilityCalendar.tsx` - Calendar component
  - `ProfessionalCard.tsx` - Professional info display
  - `ReviewsSection.tsx` - Reviews container
  - `ReviewCard.tsx` - Individual review component
  - `BookingCTA.tsx` - Sticky booking button
  - `ShareButtons.tsx` - Social sharing component
  - `RelatedServices.tsx` - Similar services carousel

* **tRPC API calls:**
  - `services.getById(id)` - Fetch service details
  - `services.getAvailability(serviceId, month)` - Get availability
  - `reviews.getByService(serviceId, pagination)` - Fetch reviews
  - `services.getRelated(serviceId)` - Get similar services
  - `services.incrementView(serviceId)` - Track page view

* **Features to implement:**
  - Lazy loading for images
  - Calendar integration for availability
  - Review photo lightbox viewer
  - Share functionality with Open Graph meta tags
  - Structured data for SEO

* **State management:**
  - Loading states for each section
  - Error handling with retry options
  - Optimistic updates for bookmarking

## Dependencies
* Swiper.js for image gallery
* Calendar component library
* React Query for data fetching
* Next.js Image component for optimization
* Open Graph meta tags setup

## Related Tasks
* T2025-08-02-develop-frontend-booking-interface.md - Booking flow
* T2025-08-02-implement-professional-profile-screen.md - Professional profile
* T2025-08-02-implement-reviews-screen.md - Reviews display
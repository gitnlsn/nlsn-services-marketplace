# Project Development Tasks

This document outlines the detailed development tasks for the services marketplace, with emphasis on clear, actionable frontend and backend implementation steps.

## Implementation Status Summary

### ✅ COMPLETED TASKS
- **Authentication Backend**: NextAuth.js with Google OAuth, Prisma adapter, database sessions
- **Database Schema**: Complete schema with all models (User, Service, Booking, Payment, Review, etc.)
- **Backend API**: All tRPC routers implemented (booking, service, payment, user, admin, etc.)
- **Payment Integration**: Pagarme service integration with webhook handling
- **Basic UI Components**: Shadcn/ui component library setup
- **Basic Auth UI**: Google signin button, auth status component, login pages

### 🔄 IN PROGRESS
- **Professional Dashboard**: Basic component exists, needs booking management features
- **Testing Setup**: Vitest configured, needs comprehensive test coverage

### 📋 PENDING HIGH PRIORITY
- **Home Page**: Replace T3 template with marketplace home screen
- **Service Management**: Create/edit service forms, my services page
- **Search & Discovery**: Search results page, filter sidebar, sort options
- **Service Detail Page**: Image gallery, booking widget, reviews section
- **Booking Flow UI**: Multi-step booking, payment forms, confirmation
- **Customer Dashboard**: My bookings, booking history, profile management
- **Payment Screens**: Credit card forms, Pix QR codes, Boleto generation

---

## 1. Authentication System

### 1.1 Authentication UI Components
- [x] ~~Create `AuthModal` component with tabs for Login/Register~~ *(Basic Google OAuth implemented)*
  - [ ] Implement email/password login form with validation
  - [ ] Implement registration form with password strength indicator
  - [x] ~~Add social login buttons (Google, Facebook)~~ *(Google implemented)*
  - [ ] Include "Forgot Password" link and flow
  - [ ] Add loading states and error handling
- [x] ~~Create `AuthGuard` HOC to protect authenticated routes~~ *(Implemented as with-auth.tsx)*
- [ ] Implement `UserMenu` dropdown component showing:
  - [ ] User avatar and name
  - [ ] Links to profile, bookings, settings
  - [ ] Logout button
- [x] ~~Add session persistence with automatic token refresh~~ *(Database sessions with 7-day expiry)*
- [ ] Create `OnboardingFlow` component for new users:
  - [ ] Step 1: Basic profile information
  - [ ] Step 2: Choose account type (Customer/Professional)
  - [ ] Step 3: Professional verification (if applicable)

### 1.2 Authentication State Management
- [x] ~~Implement auth context/store with user data, tokens, and auth status~~ *(AuthContext implemented)*
- [x] ~~Add auth state persistence to localStorage/cookies~~ *(Database sessions)*
- [x] ~~Create auth hooks: `useAuth`, `useUser`, `useAuthCheck`~~ *(useAuthGuard hook exists)*
- [x] ~~Ensure user authentication status is reflected on the frontend~~ *(AuthStatus component)*

## 2. Home Screen Implementation

### 2.1 Hero Section
- [ ] Create `HeroSection` component with:
  - [ ] Animated background image/video
  - [ ] Main headline and subheading
  - [ ] Central search bar with autocomplete
  - [ ] Quick category buttons (6 most popular)
- [ ] Implement `SearchBar` component:
  - [ ] Service type autocomplete dropdown
  - [ ] Location input with geolocation button
  - [ ] Date picker for immediate/scheduled service
  - [ ] "Search" CTA button

### 2.2 Featured Services Carousel
- [ ] Create `FeaturedServicesCarousel` component:
  - [ ] Horizontal scrolling with touch/swipe support
  - [ ] Auto-play with pause on hover
  - [ ] Dots/thumbnail navigation
- [ ] Implement `ServiceCard` component displaying:
  - [ ] Service image (with lazy loading)
  - [ ] Professional avatar and name
  - [ ] Service title and brief description
  - [ ] Price range
  - [ ] Rating stars and review count
  - [ ] "Book Now" and "Save" buttons

### 2.3 Category Grid
- [ ] Create `CategoryGrid` component:
  - [ ] Responsive grid layout (4x2 desktop, 3x3 tablet, 2x4 mobile)
  - [ ] Category icons with hover effects
  - [ ] Category name and service count
  - [ ] "View All Categories" link

### 2.4 How It Works Section
- [ ] Implement `HowItWorks` component with:
  - [ ] Tab switcher for Customer/Professional views
  - [ ] 3-step illustrated process
  - [ ] Animated transitions between steps
  - [ ] CTA buttons for each user type

## 3. Search & Discovery

### 3.1 Search Results Page
- [ ] Create `SearchResultsLayout` with:
  - [ ] Sticky header with search bar
  - [ ] Left sidebar for filters (desktop) / bottom sheet (mobile)
  - [ ] Results grid/list area
  - [ ] Results count and sort dropdown
- [ ] Implement `FilterSidebar` component:
  - [ ] Price range slider with min/max inputs
  - [ ] Rating filter (clickable stars)
  - [ ] Distance radius selector
  - [ ] Availability toggle (Available now/Schedule for later)
  - [ ] Service subcategories multi-select
  - [ ] Professional certifications checkboxes
  - [ ] "Clear All" and "Apply Filters" buttons
- [ ] Create `SortDropdown` with options:
  - [ ] Relevance (default)
  - [ ] Price: Low to High
  - [ ] Price: High to Low
  - [ ] Rating
  - [ ] Distance
  - [ ] Most Booked
- [ ] Implement filtering and categorization options for search results

### 3.2 Search State Management
- [ ] Implement search URL state management (query params)
- [ ] Add debounced search input
- [ ] Create infinite scroll or pagination component
- [ ] Implement search history/suggestions

### 3.3 Map View
- [ ] Create `MapView` component:
  - [ ] Interactive map with service location pins
  - [ ] Cluster markers for dense areas
  - [ ] Pin popups with mini service cards
  - [ ] List/Map toggle button

## 4. Service Detail Page

### 4.1 Image Gallery
- [ ] Create `ServiceGallery` component:
  - [ ] Main image viewer with zoom capability
  - [ ] Thumbnail strip navigation
  - [ ] Full-screen lightbox mode
  - [ ] Image counter (e.g., "3 of 8")
  - [ ] Share and download buttons

### 4.2 Service Information Section
- [ ] Implement `ServiceHeader` showing:
  - [ ] Service title with category badges
  - [ ] Price display with "starting at" or range
  - [ ] Duration estimate
  - [ ] Service area/coverage map
- [ ] Create `ProfessionalCard` component:
  - [ ] Professional photo (click to view profile)
  - [ ] Name with verification badge
  - [ ] Years of experience
  - [ ] Response time
  - [ ] Overall rating
  - [ ] "Message" and "View Profile" buttons

### 4.3 Booking Widget
- [ ] Create sticky `BookingWidget` component:
  - [ ] Calendar date picker
  - [ ] Time slot selector (based on availability)
  - [ ] Service options/add-ons checklist
  - [ ] Guest count (if applicable)
  - [ ] Price calculator showing real-time total
  - [ ] "Book Now" and "Request Quote" buttons

### 4.4 Reviews Section
- [ ] Implement `ReviewsSection` with:
  - [ ] Rating distribution bar chart
  - [ ] Filter by rating buttons
  - [ ] Sort dropdown (Recent/Helpful)
  - [ ] Individual review cards showing:
    - [ ] Reviewer name and avatar
    - [ ] Rating stars and date
    - [ ] Review text with "Read more" expansion
    - [ ] Review photos in a mini gallery
    - [ ] "Helpful" button with count

### 4.5 Performance Monitoring
- [ ] Consider implementing a dashboard for professionals to view service performance (views, inquiries, booking history)

## 5. Booking Flow

### 5.1 Booking Confirmation Page
- [ ] Create multi-step `BookingFlow` component:
  - [ ] Progress indicator (Review → Payment → Confirmation)
  - [ ] Ability to go back to previous steps
- [ ] Implement `BookingReview` step:
  - [ ] Service summary card with edit option
  - [ ] Selected date/time with change button
  - [ ] Customer information form
  - [ ] Special instructions textarea
  - [ ] Cancellation policy display
  - [ ] Terms acceptance checkboxes
- [ ] Add real-time availability checking
- [ ] Implement promo code input with validation

### 5.2 Payment Integration
- [ ] Create `PaymentStep` component:
  - [ ] Payment method selector (Credit Card/Pix/Boleto)
  - [ ] Credit card form with:
    - [ ] Card number with type detection
    - [ ] Expiry date and CVV
    - [ ] Billing address
    - [ ] Save card for future use checkbox
  - [ ] Pix payment flow:
    - [ ] Generate QR code
    - [ ] Copy payment code button
    - [ ] Payment confirmation polling
  - [ ] Boleto generation with download button
- [ ] Implement payment processing with loading states
- [ ] Add 3D Secure authentication modal
- [ ] Create payment error handling with retry options
- [x] ~~Integrate with Pagarme API for processing payments (credit cards, Pix, boleto)~~ *(Backend service implemented)*
- [x] ~~Implement backend webhook to handle Pagarme payment success notifications~~ *(Webhook route implemented)*
- [x] ~~Update booking/transaction status in the database upon payment confirmation~~ *(Payment router implemented)*
- [ ] Implement escrow logic: hold funds until service completion, then release to professional's account after 15-day holding period

### 5.3 Booking Success Page
- [ ] Create `BookingSuccess` component:
  - [ ] Success animation/illustration
  - [ ] Booking reference number
  - [ ] Service details summary
  - [ ] Calendar integration buttons
  - [ ] "View Booking" and "Back to Home" CTAs
  - [ ] Email confirmation notice

### 5.4 Booking Management Actions
- [ ] Develop frontend action for professionals to accept a booking
- [x] ~~Implement backend endpoint to update booking status to "Accepted"~~ *(Booking router implemented)*
- [ ] Develop frontend action for professionals to decline a booking
- [x] ~~Implement backend endpoint to update booking status to "Declined"~~ *(Booking router implemented)*
- [ ] Develop frontend action for users (client/professional) to cancel a booking
- [x] ~~Implement backend endpoint to update booking status to "Cancelled"~~ *(Booking router implemented)*

## 6. User Dashboard

### 6.1 Customer Dashboard
- [ ] Create `CustomerDashboard` layout:
  - [ ] Sidebar navigation (desktop) / bottom tabs (mobile)
  - [ ] Main content area with router outlet
- [ ] Implement `MyBookings` page:
  - [ ] Tabs for Upcoming/Past/Cancelled bookings
  - [ ] Booking cards showing:
    - [ ] Service and professional info
    - [ ] Date, time, and status
    - [ ] Action buttons based on status
  - [ ] Search and filter options
  - [ ] Calendar view toggle
- [ ] Create `BookingDetail` modal/page:
  - [ ] Complete booking information
  - [ ] Professional contact options
  - [ ] Cancel/Reschedule buttons
  - [ ] Add to calendar options
  - [ ] Receipt download

### 6.2 Professional Dashboard
- [ ] Create `ProfessionalDashboard` with:
  - [ ] Stats overview cards:
    - [ ] Today's bookings
    - [ ] This week's earnings
    - [ ] Pending reviews
    - [ ] Profile views
  - [ ] Quick actions panel
  - [ ] Recent activity feed
- [ ] Implement `BookingManagement` page:
  - [ ] Incoming booking requests with:
    - [ ] Accept/Decline buttons
    - [ ] 24-hour countdown timer
    - [ ] Customer details preview
  - [ ] Accepted bookings calendar view
  - [ ] Booking status filters
- [ ] Create `EarningsOverview` page:
  - [ ] Earnings chart (daily/weekly/monthly)
  - [ ] Transaction history table
  - [ ] Pending vs available balance
  - [ ] Withdrawal request button
  - [ ] Tax document downloads

## 7. Service Management (Professional)

### 7.1 My Services Page
- [ ] Create `MyServices` grid/list view:
  - [ ] Service cards with edit/delete actions
  - [ ] Status indicators (Active/Inactive/Under Review)
  - [ ] Performance metrics per service
  - [ ] "Create New Service" CTA

### 7.2 Create/Edit Service
- [x] ~~Implement backend service creation endpoint~~ *(Service router with create/update/delete)*
- [x] ~~Add service validation and categories~~ *(Category router implemented)*
- [ ] Implement `ServiceForm` with steps:
  - [ ] Basic Information:
    - [ ] Title and category selection
    - [ ] Description with rich text editor
    - [ ] Service area selector
  - [ ] Pricing & Duration:
    - [ ] Pricing model selector (Fixed/Hourly/Custom)
    - [ ] Price input with currency
    - [ ] Duration estimation
    - [ ] Add-on services with prices
  - [ ] Photos & Portfolio:
    - [ ] Drag-and-drop image uploader
    - [ ] Image reordering
    - [ ] Caption/description for each image
    - [ ] Cover image selector
  - [ ] Availability:
    - [ ] Weekly schedule selector
    - [ ] Blackout dates calendar
    - [ ] Advance booking limits
- [ ] Add form validation and auto-save
- [ ] Implement preview mode

## 8. Reviews & Ratings

### 8.1 Leave Review Flow
- [ ] Create `ReviewModal` triggered after service completion:
  - [ ] 5-star rating selector
  - [ ] Category ratings (Quality, Punctuality, Communication)
  - [ ] Review text with character counter
  - [ ] Photo upload option
  - [ ] Anonymous review toggle
- [ ] Add review incentive notifications
- [ ] Develop frontend interface for clients to leave reviews for completed services
- [x] ~~Implement backend endpoint to create review records~~ *(Review router implemented)*
- [x] ~~Implement backend logic to update service/professional ratings based on new reviews~~ *(Avg rating calculation in schema)*

### 8.2 Review Management
- [ ] Create `ReviewResponse` feature for professionals:
  - [ ] Reply to reviews publicly
  - [ ] Report inappropriate reviews
  - [ ] Review insights dashboard

## 9. Profile Management

### 9.1 User Profile Pages
- [ ] Create `PublicProfile` component:
  - [ ] Header with cover image and avatar
  - [ ] Bio and verification badges
  - [ ] Services grid (for professionals)
  - [ ] Reviews and ratings summary
  - [ ] Contact/Book buttons
- [ ] Implement `ProfileEdit` page:
  - [ ] Avatar and cover image upload
  - [ ] Personal information forms
  - [ ] Professional certifications upload
  - [ ] Bio/About section editor
  - [ ] Social media links
  - [ ] Privacy settings
- [ ] Develop frontend interface for users to manage their profile information
- [x] ~~Implement backend endpoint to update user profile records~~ *(User router implemented)*

### 9.2 Notification Preferences
- [ ] Create `NotificationSettings` page:
  - [ ] Channel toggles (Email/SMS/WhatsApp/Push)
  - [ ] Notification type preferences:
    - [ ] Booking updates
    - [ ] Payment confirmations
    - [ ] Review requests
    - [ ] Marketing communications
  - [ ] Quiet hours settings
  - [ ] Language preferences
- [ ] Develop frontend interface for users to manage their notification preferences (channels, types)
- [x] ~~Implement backend endpoint to update user notification preferences~~ *(User schema includes notification preferences)*

## 10. Notifications System

- [ ] Integrate with Twilio API for sending SMS, WhatsApp, and Email notifications
- [x] ~~Implement backend notification data models~~ *(Notification model in schema)*
- [x] ~~Implement backend notification router~~ *(Notification router implemented)*
- [ ] Implement backend logic to send notifications for:
  - [ ] New Booking (to professional)
  - [ ] Booking Confirmation (to client after payment)
  - [ ] Service Completed (to client, prompting review)
  - [ ] Withdrawal Successful (to professional)

## 11. Photo Upload System

- [ ] Integrate with cloud storage solution for storing image files
- [x] ~~Store photo URLs/metadata in the database (Prisma)~~ *(Image model in schema)*
- [ ] Implement image optimization and compression
- [ ] Add file type and size validation

## 12. Technical Frontend Infrastructure

### 12.1 Component Library
- [ ] Set up Storybook for component documentation
- [ ] Create design system with:
  - [ ] Color palette and themes
  - [ ] Typography scales
  - [ ] Spacing system
  - [ ] Common components (buttons, inputs, cards)
- [ ] Implement dark mode support

### 12.2 Performance Optimizations
- [ ] Implement route-based code splitting
- [ ] Add image optimization and lazy loading
- [ ] Set up service worker for offline support
- [ ] Implement virtual scrolling for long lists
- [ ] Add skeleton loaders for all data-fetching components

### 12.3 Error Handling
- [ ] Create global error boundary
- [ ] Implement toast notification system
- [ ] Add offline detection and messaging
- [ ] Create 404 and error pages
- [ ] Implement retry mechanisms for failed requests

### 12.4 Analytics & Monitoring
- [ ] Integrate analytics (Google Analytics/Mixpanel)
- [ ] Add error tracking (Sentry)
- [ ] Implement user behavior tracking
- [ ] Create A/B testing framework

### 12.5 Accessibility
- [ ] Ensure WCAG 2.1 AA compliance
- [ ] Add keyboard navigation support
- [ ] Implement screen reader announcements
- [ ] Create high contrast theme option
- [ ] Add focus indicators

### 12.6 Testing
- [ ] Set up component testing with React Testing Library
- [ ] Create E2E tests for critical user flows
- [ ] Implement visual regression testing
- [ ] Add performance testing benchmarks

## 13. Mobile Optimization

### 13.1 Progressive Web App
- [ ] Configure PWA manifest
- [ ] Implement app install prompt
- [ ] Add splash screens
- [ ] Enable push notifications

### 13.2 Mobile-Specific Features
- [ ] Implement touch gestures (swipe, pinch-to-zoom)
- [ ] Add haptic feedback
- [ ] Create bottom sheet components
- [ ] Optimize for thumb-friendly navigation

## 14. Internationalization
- [ ] Set up i18n framework
- [ ] Extract all strings to translation files
- [ ] Implement language switcher
- [ ] Add RTL layout support
- [ ] Create currency and date formatters

---

## Priority Order (Updated Based on Current Status)

### Phase 1 (MVP) - NEXT TO IMPLEMENT
1. **Home screen implementation** - Replace T3 template with marketplace design
2. **Service management UI** - Create/edit service forms, my services page
3. **Search functionality UI** - Search results page, filter sidebar
4. **Service detail page** - Image gallery, booking widget, reviews section
5. **Basic booking flow UI** - Multi-step booking forms
6. **Payment integration UI** - Credit card forms, Pix QR codes, Boleto
7. **Customer dashboard** - My bookings, booking history

### Phase 2 - ENHANCE EXISTING
1. **Professional dashboard enhancement** - Add booking management features
2. **Review system UI** - Leave review modal, review display
3. **Profile management UI** - Profile edit forms, public profile pages
4. **Escrow payment logic** - 15-day holding period automation
5. **Notification system** - Twilio integration, preference UI

### Phase 3 - ADVANCED FEATURES
1. Advanced features (map view, calendar integration)
2. Mobile optimizations (PWA, touch gestures)
3. Photo upload system (cloud storage integration)
4. Analytics and monitoring
5. Internationalization
6. Comprehensive testing suite

### COMPLETED FOUNDATION ✅
- ✅ Authentication system (NextAuth.js + Google OAuth)
- ✅ Database schema (Complete Prisma schema)
- ✅ Backend API (All tRPC routers)
- ✅ Payment integration backend (Pagarme service + webhooks)
- ✅ Basic UI components (Shadcn/ui setup)

---

## Current Focus: Frontend Implementation
With the backend foundation complete, the primary focus should be on implementing the frontend user interfaces to create a functional marketplace experience. The authentication system and all API endpoints are ready to be consumed by the frontend components.
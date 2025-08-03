# Calendar Integration Guide

This marketplace integrates with Google Calendar to provide seamless availability management and booking synchronization.

## Features

### For Service Providers
- **Two-way sync** with Google Calendar
- **Automatic availability** based on calendar free/busy times
- **Booking events** created automatically in calendar
- **Calendar selection** - choose which calendar to sync
- **Real-time updates** when calendar changes

### For Customers
- **Real-time availability** based on provider's actual calendar
- **Booking confirmations** sent as calendar invites
- **Automatic reminders** from Google Calendar

## Setup

### 1. Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable the Google Calendar API
4. Use the same OAuth 2.0 credentials as your Google login

### 2. Update OAuth Scopes

The following scopes are automatically requested:
- `openid` - Basic authentication
- `profile` - User profile information
- `email` - Email address
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events` - Create and manage events

### 3. Connect Calendar

Providers can connect their Google Calendar:
1. Go to Professional Dashboard
2. Click "Availability Settings"
3. Click "Connect Google Calendar"
4. Authorize the application
5. Select which calendar to sync

## Usage

### Setting Availability

#### Option 1: Manual Configuration
- Set weekly recurring availability slots
- Specify working hours for each day
- Enable/disable specific time slots

#### Option 2: Google Calendar Sync
- Import free time from Google Calendar
- Automatically block busy times
- Keep availability up-to-date

### Managing Bookings

When a booking is created:
1. **Time slot is reserved** in the system
2. **Calendar event is created** in Google Calendar
3. **Customer receives invite** (if email provided)
4. **Reminders are set** automatically

### Syncing Strategy

The system uses a hybrid approach:
- **Base availability** from manual settings
- **Real-time blocking** from Google Calendar
- **Conflict resolution** favors calendar events

## API Integration

### Check Connection Status
```typescript
const { data: isConnected } = api.googleCalendar.isConnected.useQuery();
```

### List Calendars
```typescript
const { data: calendars } = api.googleCalendar.listCalendars.useQuery();
```

### Get Free/Busy Times
```typescript
const { data: busyTimes } = api.googleCalendar.getFreeBusy.useQuery({
  startDate: new Date(),
  endDate: addDays(new Date(), 7),
  calendarId: "primary"
});
```

### Create Booking Event
```typescript
const createEvent = api.googleCalendar.createBookingEvent.useMutation();
createEvent.mutate({ 
  bookingId: "booking123",
  calendarId: "primary" 
});
```

## Components

### GoogleCalendarIntegration
Full integration component with:
- Connection status
- Calendar selection
- Sync controls
- Settings management

```tsx
import { GoogleCalendarIntegration } from "~/components/availability/google-calendar-integration";

<GoogleCalendarIntegration />
```

### GoogleCalendarBookingButton
Add booking to calendar button:

```tsx
import { GoogleCalendarBookingButton } from "~/components/availability/google-calendar-integration";

<GoogleCalendarBookingButton bookingId={booking.id} />
```

## Privacy & Permissions

### Data Access
- **Read access** to view free/busy times
- **Write access** to create booking events
- **No access** to event details or attendees
- **Scoped** to selected calendar only

### Data Storage
- Only event IDs are stored
- No calendar content is cached
- Tokens are encrypted and secure

## Troubleshooting

### Connection Issues
1. **"Unauthorized" error**
   - Re-authenticate with Google
   - Check if calendar permissions were granted
   - Ensure tokens haven't expired

2. **"Calendar not found"**
   - Verify calendar still exists
   - Check sharing permissions
   - Try selecting a different calendar

3. **Events not syncing**
   - Check Google Calendar API quotas
   - Verify event creation permissions
   - Look for conflicting events

### Performance Tips
- Sync only necessary date ranges
- Use appropriate cache times
- Batch API requests when possible
- Monitor API usage in Google Console

## Best Practices

### For Providers
1. **Keep calendar updated** - Mark busy times promptly
2. **Use descriptive titles** - Help identify bookings
3. **Set buffer times** - Add padding between appointments
4. **Review permissions** - Audit calendar access regularly

### For Implementation
1. **Handle offline gracefully** - Cache availability locally
2. **Respect rate limits** - Implement exponential backoff
3. **Validate time zones** - Always use consistent zones
4. **Log API errors** - Monitor integration health

## Future Enhancements

- Support for multiple calendar providers (Outlook, Apple)
- Recurring appointment templates
- Group booking coordination
- Calendar analytics and insights
- Automated rescheduling
- Two-way sync for changes made in Google Calendar
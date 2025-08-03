# WebSocket Real-time Notifications Setup

This marketplace includes real-time notifications using WebSocket connections for instant updates on bookings and payments.

## Features

- Real-time booking notifications (new, accepted, declined)
- Real-time payment notifications (received, confirmed)
- Automatic reconnection on connection loss
- Heartbeat/ping-pong for connection health
- Multi-device support (same user on multiple devices)
- Browser notifications support

## Architecture

### Server-Side
- WebSocket server integrated with Next.js
- Session-based authentication
- Per-user connection management
- Automatic cleanup of dead connections

### Client-Side
- React hooks for WebSocket integration
- Automatic reconnection logic
- Queue for offline messages
- Browser notification API integration

## Usage

### Using the WebSocket Hook

```typescript
import { useWebSocket } from "~/hooks/use-websocket";

function MyComponent() {
  const { isConnected, sendMessage } = useWebSocket({
    onBookingUpdate: (data) => {
      console.log("Booking update:", data);
    },
    onPaymentUpdate: (data) => {
      console.log("Payment update:", data);
    },
    onNotification: (data) => {
      console.log("General notification:", data);
    }
  });

  return (
    <div>
      Status: {isConnected ? "Connected" : "Disconnected"}
    </div>
  );
}
```

### Using Real-time Notifications Component

```typescript
import { RealtimeNotifications } from "~/components/notifications/realtime-notifications";

function Header() {
  return (
    <header>
      <RealtimeNotifications />
    </header>
  );
}
```

### Server-Side Broadcasting

```typescript
import { wsServer } from "~/server/websocket/websocket-server";

// Send to specific user
wsServer.sendToUser(userId, {
  type: "notification",
  data: {
    message: "Your service was booked!",
    timestamp: new Date().toISOString()
  }
});

// Send booking update
wsServer.sendBookingUpdate(userId, {
  type: "new_booking",
  bookingId: "abc123",
  serviceName: "House Cleaning",
  message: "New booking received"
});

// Send payment update
wsServer.sendPaymentUpdate(userId, {
  type: "payment_received",
  paymentId: "pay123",
  amount: "150.00",
  message: "Payment received"
});
```

## Message Types

### Booking Updates
- `new_booking` - New booking created
- `booking_accepted` - Booking accepted by provider
- `booking_declined` - Booking declined by provider
- `booking_cancelled` - Booking cancelled
- `booking_completed` - Service completed

### Payment Updates
- `payment_received` - Payment received by provider
- `payment_confirmed` - Payment confirmed for client
- `payment_failed` - Payment processing failed
- `payment_refunded` - Payment refunded

### General Notifications
- `notification` - General notification message
- `ping` - Heartbeat ping
- `pong` - Heartbeat response

## Configuration

No additional configuration needed! WebSocket server starts automatically with the Next.js server.

### Browser Notifications

The system automatically requests browser notification permissions. Users can:
1. Allow notifications when prompted
2. Receive browser notifications even when the app is in background
3. Manage permissions in browser settings

## Security

- Session-based authentication required
- Connections validated against active sessions
- Automatic disconnection on session expiry
- No sensitive data in WebSocket messages

## Troubleshooting

### Connection Issues
- Check if user is authenticated
- Verify browser supports WebSockets
- Check for proxy/firewall blocking WebSocket connections
- Look for errors in browser console

### Notifications Not Showing
- Check browser notification permissions
- Ensure HTTPS is used (required for notifications)
- Verify notification data format
- Check if notifications are blocked by OS

### Performance Issues
- Monitor number of active connections
- Check for message flooding
- Verify heartbeat interval is appropriate
- Consider implementing message throttling

## Development Tips

1. **Testing WebSockets**
   - Use browser DevTools WebSocket inspector
   - Test reconnection by killing server
   - Simulate network issues with throttling

2. **Debugging**
   - Enable verbose logging in development
   - Monitor WebSocket frames in DevTools
   - Check server logs for connection issues

3. **Best Practices**
   - Keep messages small and focused
   - Use appropriate message types
   - Handle reconnection gracefully
   - Clean up connections on unmount

## Future Enhancements

- Message persistence for offline delivery
- WebSocket scaling with Redis pub/sub
- End-to-end encryption for messages
- Push notifications for mobile apps
- Message read receipts
- Typing indicators for chat features
# Geocoding Setup Guide

This marketplace supports two geocoding providers: OpenStreetMap (free) and Google Maps. You can choose based on your needs.

## OpenStreetMap (Default)

OpenStreetMap Nominatim is the default geocoding provider. It's free and doesn't require any API keys.

### Features
- Free to use
- No API key required
- Good for basic geocoding needs
- Rate limited (1 request per second)
- Less accurate than Google Maps in some regions

### Configuration
No configuration needed! OpenStreetMap is the default provider.

## Google Maps Geocoding

Google Maps provides more accurate geocoding with additional features.

### Features
- Higher accuracy
- Better support for business names
- Reverse geocoding support
- Place IDs for consistent references
- Higher rate limits
- Costs apply after free tier

### Setup

#### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Geocoding API
   - Maps JavaScript API (if using Google Maps display)
4. Create credentials (API Key)
5. Restrict the API key:
   - Application restrictions: HTTP referrers
   - API restrictions: Select enabled APIs only

#### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Google Maps API Key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Set geocoding provider to Google
GEOCODING_PROVIDER=google
```

#### 3. Set Up Billing

1. Enable billing in Google Cloud Console
2. Set up budget alerts to monitor usage
3. Free tier includes:
   - $200 monthly credit
   - 40,000 geocoding requests per month

## Usage in the Application

The application automatically uses the configured geocoding provider.

### Check Provider Status

```typescript
const { data } = api.geocoding.getProviderStatus.useQuery();
console.log(data);
// Output: { provider: 'google', providers: { openstreetmap: true, google: true } }
```

### Geocode an Address

```typescript
const { data } = api.geocoding.geocode.useQuery({ 
  address: "Av. Paulista, 1000, São Paulo" 
});
```

### Batch Geocode

```typescript
const { data } = api.geocoding.batchGeocode.useQuery({ 
  addresses: ["Address 1", "Address 2", "Address 3"] 
});
```

### Reverse Geocode (Google Maps only)

```typescript
const { data } = api.geocoding.reverseGeocode.useQuery({ 
  lat: -23.5505, 
  lng: -46.6333 
});
```

## Provider Comparison

| Feature | OpenStreetMap | Google Maps |
|---------|---------------|-------------|
| Cost | Free | Pay per use after free tier |
| API Key | Not required | Required |
| Accuracy | Good | Excellent |
| Rate Limit | 1 req/sec | 50 req/sec |
| Batch Support | Yes (5 at a time) | Yes (10 at a time) |
| Reverse Geocoding | Limited | Full support |
| Place IDs | No | Yes |
| Business Names | Limited | Excellent |
| Coverage | Global | Global |

## Best Practices

### For OpenStreetMap:
- Respect rate limits (1 request per second)
- Cache results to minimize API calls
- Add delays between batch requests
- Include country in address for better results

### For Google Maps:
- Monitor usage in Google Cloud Console
- Set up billing alerts
- Use place IDs for consistent results
- Enable only required APIs
- Restrict API keys properly

## Switching Providers

To switch between providers:

1. Update `GEOCODING_PROVIDER` in `.env`
2. Ensure Google Maps API key is configured (if switching to Google)
3. Restart the application

The system will automatically use the new provider. Cached results from the previous provider remain valid.

## Troubleshooting

### OpenStreetMap Issues
- **No results**: Try adding more context (city, state, country)
- **Rate limit errors**: Implement delays between requests
- **Inaccurate results**: Consider switching to Google Maps

### Google Maps Issues
- **API key errors**: Verify key is enabled for Geocoding API
- **Billing not enabled**: Set up billing in Google Cloud Console
- **CORS errors**: Check API key restrictions
- **No results**: Verify address format and country

### General Issues
- Check `GEOCODING_PROVIDER` environment variable
- Monitor browser console for errors
- Check server logs for detailed error messages
- Verify network connectivity
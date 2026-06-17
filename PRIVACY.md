# Privacy

FX to USD Converter is a static browser app. It does not include a project-owned backend or analytics.

## Browser Storage

The app stores the following data in `localStorage` on the user's device:

- Selected currency.
- Custom currencies.
- Cached exchange rates.
- Recent rate history.

Users can clear browser site data to remove all saved app data.

## Offline Cache

The service worker caches same-origin app files, such as HTML, CSS, JavaScript, icons, and the web app manifest. It does not intentionally cache third-party exchange-rate responses.

## Network Requests

The app makes these third-party requests:

- `https://open.er-api.com` for exchange rates.

That service may receive standard request metadata such as IP address, browser information, and request time.

## No Financial Advice

Exchange rates are provided for convenience and may differ from bank, card, cash counter, or market rates. The app is not financial advice.

# Kilometre shipping

The admin shipping settings support ordered road-distance bands, a full dispatch address, and the existing province/ward/default fees. Each band includes its upper boundary; outside the last band the province/ward fee takes precedence over the default fee. Existing orders keep their saved fee.

Set `GOOGLE_MAPS_API_KEY` in the Vercel **server** environment using an existing Google Cloud project with Routes API access. Restrict the key to the Routes API and set provider quotas appropriate to the shop. No key is exposed to customers. Without a key the kilometre mode cannot be enabled; current zone shipping continues normally. Enter the real dispatch address and the shop's actual bands before enabling the mode.

Checkout sends the completed delivery address to Google Routes and displays the resulting road kilometres and fee before the customer submits. The endpoint checks same-origin JSON requests, enforces a persistent ten-requests-per-minute bucket using a keyed hash of the client IP, applies an eight-second provider timeout, and does not log addresses or provider keys. Configure the provider's project quota as an additional spending limit.

Only the service role can create/read distance quotes. The database chooses the price from stored settings and binds the quote to the address, origin/configuration and a 15-minute expiry. Order creation validates this binding atomically; the browser cannot supply a trusted distance or shipping price. Checkout refreshes expiring quotes and invalidates them when the address changes. Private quote records older than one day after expiry are pruned when another quote is created.

Migration: `202610100011_distance_shipping.sql`.

Provider documentation: [Compute Routes](https://developers.google.com/maps/documentation/routes/compute_route_directions), [address waypoints](https://developers.google.com/maps/documentation/routes/specify_location).

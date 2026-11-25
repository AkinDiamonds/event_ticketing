# Event Tickets

A React and TypeScript frontend for discovering events, booking tickets, and managing ticket sales.

## Local development

```sh
npm ci
npm run dev
```

Run `npm run lint` to check the source and `npm run build` to produce the static site in `dist/`. Run `npm run preview` to preview that build locally.

## Deployment

1. Install dependencies with `npm ci`, build with `npm run build`, and publish `dist/`.
2. Configure the static host to serve `index.html` for client-side routes such as `/tickets/…`, `/verify-email`, and `/reset-password`. Serve existing assets directly.
3. Set `VITE_API_BASE_URL` at build time if using a different API origin. The default is the hosted Event Tickets API. Use the origin only, without `/api/v1`.
4. Add the frontend origin to the backend's `CORS_ORIGINS` and set its `FRONTEND_URL` to the deployed frontend URL. The backend uses these settings for browser requests, checkout callbacks, and account emails.

Vite variables are public. Keep Paystack secret keys and database credentials on the backend.

## API integration

The frontend uses the Events, Auth, and Orders APIs. Paystack hosts payment entry, and the backend confirms orders and sends entry codes. The current hosted API supports individual order lookups. Ticket availability switches and organizer sales counts require the corresponding backend API and database migration.

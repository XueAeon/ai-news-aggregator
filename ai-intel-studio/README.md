# AI Intel Studio Frontend

This repository has been simplified into a new-project baseline:

- JWT auth routes: `/auth/jwt/sign-in`, `/auth/jwt/sign-up`
- Protected app area: `/dashboard`
- Minimal dashboard navigation and home page
- Existing theme/layout/components kept for rapid feature development

## Prerequisites

- Node.js >= 20

## Run

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Where to start building

- Route entry: `src/routes/sections`
- Dashboard home: `src/pages/dashboard/home.jsx`
- API client: `src/lib/axios.js`
- Navigation: `src/layouts/nav-config-dashboard.jsx`

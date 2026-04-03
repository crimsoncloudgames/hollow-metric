This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Bot Protection (Cloudflare Turnstile)

Hollow Metric uses lightweight captcha protection on high-risk public forms.

Add these environment variables:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile site key used by public forms.
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key used for server-side verification.

Protected flows:

- Contact form (`/contact` -> `/api/contact`): token is verified server-side in the API route.
- Sign up (`/signup`): token is passed to Supabase Auth, which verifies server-side.
- Login (`/login`): token is passed to Supabase Auth, which verifies server-side.
- Forgot password (`/forgot-password`): token is passed to Supabase Auth, which verifies server-side.

Important setup notes:

- In Supabase Auth settings, enable captcha and configure Turnstile so Auth endpoints enforce token verification.
- In production, if `TURNSTILE_SECRET_KEY` is missing, the contact API captcha check will fail closed.
- In local development, the contact API allows requests if `TURNSTILE_SECRET_KEY` is not set.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

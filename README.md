# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Auto-cancel pending bookings after 24 hours

To automatically cancel online bookings that remain `Pending` for 24 hours (no downpayment), run this SQL file in your Supabase SQL Editor:

`supabase/auto-cancel-pending-bookings.sql`

What it does:
- Creates `public.auto_cancel_pending_bookings_no_downpayment()`
- Enables `pg_cron` (if not already enabled)
- Schedules cron job `auto-cancel-pending-bookings-24h` every 30 minutes

You can verify the job with:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'auto-cancel-pending-bookings-24h';
```

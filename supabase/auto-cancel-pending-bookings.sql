-- Auto-cancel online bookings with no downpayment after 24 hours.
-- Assumption in current schema: "Pending" means downpayment not yet received.

create extension if not exists pg_cron;

create or replace function public.auto_cancel_pending_bookings_no_downpayment()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cancelled_count integer := 0;
begin
  update public.bookings b
     set status = 'Cancelled',
         notes = concat_ws(
           E'\n',
           nullif(b.notes, ''),
           'Auto-cancelled: no downpayment received within 24 hours.'
         ),
         updated_at = now()
   where b.status = 'Pending'
     and coalesce(b.booking_type, 'online') = 'online'
     and b.created_at <= now() - interval '24 hours';

  get diagnostics cancelled_count = row_count;
  return cancelled_count;
end;
$$;

-- Recreate the job safely if this script is re-run.
select cron.unschedule('auto-cancel-pending-bookings-24h')
where exists (
  select 1
  from cron.job
  where jobname = 'auto-cancel-pending-bookings-24h'
);

select cron.schedule(
  'auto-cancel-pending-bookings-24h',
  '*/30 * * * *',
  $$select public.auto_cancel_pending_bookings_no_downpayment();$$
);


# SmartGrid Queue Auto-Processing Setup

This guide walks through setting up the once-daily queue processing function.

## What it does

Every day at **6am Manila time**, the system automatically:
1. **Releases stale locks** — leads locked for 7+ days
2. **Reassigns overworked leads** — if a lead has 3-5 attempts, move to the other caller
3. **Parks leads** — mark as 'attempted' after 6+ total attempts

No manual reassignment needed (though Angela can still do it via dashboard).

## Setup Steps

### Step 1: Deploy the Edge Function to Supabase

```bash
cd ~/Huna-Creatives
supabase functions deploy process-smartgrid-queue
```

This creates the function in your Supabase project. Note the URL it outputs, e.g.:
```
https://your-project-id.functions.supabase.co/functions/v1/process-smartgrid-queue
```

### Step 2: Create GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Create two secrets:

**Secret 1: `SUPABASE_QUEUE_FUNCTION_URL`**
- Value: The function URL from Step 1 (e.g., `https://your-project-id.functions.supabase.co/functions/v1/process-smartgrid-queue`)

**Secret 2: `SMARTGRID_CRON_SECRET`**
- Value: Any random string, e.g., `your-secret-key-12345`
  - Must match the `CRON_SECRET` env var in Supabase (see Step 3)

### Step 3: Set Supabase Function Secrets

Go to Supabase Dashboard → Edge Functions → `process-smartgrid-queue` → Configuration

Add these environment variables:
```
CRON_SECRET = [same value as SMARTGRID_CRON_SECRET from GitHub]
```

(The function also needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which Supabase sets automatically)

### Step 4: Test It

Manual trigger the workflow:
1. Go to GitHub repo → Actions → "Process SmartGrid Queue"
2. Click "Run workflow" → "Run workflow"
3. Check logs to see if it succeeded

The function will log:
```
[SmartGrid Queue] Processing started
[SmartGrid Queue] Found X contractors
[SmartGrid Queue] Releasing X stale locks
[SmartGrid Queue] Reassigning X leads (3-5 attempts)
[SmartGrid Queue] Parking X leads (6+ attempts)
[SmartGrid Queue] Processing completed successfully
```

### Step 5: Verify Automation

After setup, the workflow runs automatically at **22:00 UTC each day** (6am Manila time).

Check GitHub Actions → "Process SmartGrid Queue" to see scheduled runs.

## Monitoring

- **GitHub Actions**: Shows when workflow runs and any errors
- **Supabase Edge Functions logs**: Shows detailed processing logs
- **Admin dashboard**: Verify leads were reassigned/released

## Disable/Adjust

- **Disable**: Comment out the `schedule` line in `.github/workflows/process-smartgrid-queue.yml`
- **Change time**: Modify the `cron` expression (format: `minute hour * * *`)
  - `0 22 * * *` = daily at 22:00 UTC (6am Manila)
  - `0 2 * * *` = daily at 02:00 UTC (10am Manila)

## Costs

- Supabase Edge Function: ~free tier (minimal invocations)
- GitHub Actions: Free (1 run/day uses ~1s of quota)
- Supabase database queries: Minimal (one query per lead type)

This should NOT cause quota issues like the hourly version did.

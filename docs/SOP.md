# Standard Operating Procedure — Hauling Tracker

**Document type**: Operational SOP  
**Applies to**: All system users  
**Timezone**: All times are in WITA (UTC+8)

---

## Table of Contents

1. [General Rules](#1-general-rules)
2. [Login & Logout](#2-login--logout)
3. [Admin — Start of Day](#3-admin--start-of-day)
4. [Site Operator — CP1 (Truck Arrives at Stockpile)](#4-site-operator--cp1-truck-arrives-at-stockpile)
5. [Site Operator — CP2 (Truck Departs Stockpile)](#5-site-operator--cp2-truck-departs-stockpile)
6. [Jetty Operator — CP3 (Truck Arrives at Jetty)](#6-jetty-operator--cp3-truck-arrives-at-jetty)
7. [Jetty Operator — Barge Loading](#7-jetty-operator--barge-loading)
8. [Admin — End of Day](#8-admin--end-of-day)
9. [Supervisor — Reviewing and Correcting Data](#9-supervisor--reviewing-and-correcting-data)
10. [Admin — User Management](#10-admin--user-management)
11. [Analytics — Viewing Reports and Exporting Data](#11-analytics--viewing-reports-and-exporting-data)
12. [Error Handling & Escalation](#12-error-handling--escalation)
13. [System Maintenance Break](#13-system-maintenance-break)

---

## 1. General Rules

1. **Never share your login credentials** with another person. Each account is personal and tied to an audit trail.
2. **Log in only from the assigned device or approved device** for your role. Site operators use the site device; jetty operators use the jetty device.
3. **All timestamps are recorded automatically** when you submit a form. Do not attempt to enter data early or late on behalf of another person.
4. **If you make an input error**, do not submit it. Clear the form and re-enter. If the trip has already been submitted with wrong data, contact the supervisor immediately — do not attempt to re-submit a duplicate entry.
5. **The session must be active** for operators to record trips. If the system shows no active session, contact the admin before attempting any data entry.
6. **Data is locked by the admin** at the end of each operational day. Once locked, no edits are possible except by admin.
7. **Only enter data for the current operational day**. Do not back-date or forward-date entries unless explicitly authorized by management.

---

## 2. Login & Logout

### Logging in

1. Open the application URL in the browser.
2. On the login screen, enter your **username** (email format) and **password** exactly as assigned.
3. Tap or click **Login**.
4. You will be redirected automatically to the screen for your role:
   - Site operator → `/stockpile`
   - Jetty operator → `/jetty`
   - Supervisor → `/stockpile`
   - Analytics → `/analytics`
   - Admin → `/admin`
5. If you land back on the login page after entering correct credentials, contact the admin — your account role may not be configured.

### Switching language

- Tap the language toggle (ID / 中文) in the top bar to switch between Indonesian and Chinese. The change applies immediately and persists across sessions.

### Logging out

1. Tap the user icon or account menu in the top bar.
2. Select **Logout**.
3. Confirm if prompted. You will be returned to the login screen.
4. **Always log out** when leaving the device unattended, especially on shared devices.

---

## 3. Admin — Start of Day

**When**: Before operators begin recording trips. Must be done at the start of each operational day.  
**Who**: Admin only.

### Step-by-step

1. Log in with the admin account.
2. Navigate to `/sessions` (Session Management, accessible from the Admin page or directly via the URL).
3. Check the session list. Look for today's date in the table.
   - **If today's session already exists** with status `Active`: the system is ready. Notify operators they can begin.
   - **If no session exists for today**: a session is created automatically when the first trip is recorded. However, if you need to verify that operators can proceed, you may ask a site operator to attempt CP1 — this will trigger auto-creation.
4. Verify that **Site Lock** and **Jetty Lock** are both showing `Unlocked` for today's session. If they show `Locked` (from an inadvertent lock), click the lock button to toggle it back to `Unlocked`.
5. Notify the site operator(s) and jetty operator(s) that the system is open for the day.

> **Note**: If yesterday's session still shows `Active` (not ended), that is non-critical for today's operations. Today will auto-create its own session. However, you should end yesterday's session when convenient (see Section 8).

---

## 4. Site Operator — CP1 (Truck Arrives at Stockpile)

**When**: Each time a truck arrives at the stockpile entrance and is weighed empty.  
**Who**: Site operator, site_jetty_operator, supervisor, admin.  
**Tab**: "Masuk" (Arrival) on the stockpile page.

### What you need before starting

- Truck ID (No. Lambung) as printed on the truck — example: `KB 1234`
- The jetty destination the truck is going to (Hasnur or Talenta)
- Coal quality (Premium or Standard — confirmed by the stockpile supervisor or dispatch sheet)
- Current weather at the site
- The empty (tare) weight reading from the weighbridge in **kilograms**

### Step-by-step

1. Log in and go to the **Stockpile** page. You are on the **Masuk** (CP1) tab by default.
2. Check the **Session Banner** at the top. It should show `Active`. If it shows no session or appears ended, stop and contact the admin.
3. In the **No. Lambung** field, type the truck ID. The system will automatically convert it to uppercase.
   - Type exactly as shown on the truck (e.g., `KB 1234`, `AK 5678`).
   - Do not add extra spaces or characters.
4. Select the **Jetty Destination**:
   - Tap `Hasnur` or `Talenta` — whichever the truck is headed to for this trip.
   - Confirm with the driver's dispatch slip if unsure.
5. Select the **Coal Quality**:
   - `Premium` (labeled "Raw" in some language settings) — higher-grade coal
   - `Standard` (labeled "Clean" in some language settings) — standard-grade coal
   - Confirm with the stockpile supervisor or the truck's manifest if unsure.
6. Select the **Weather**:
   - `Cerah` (Clear)
   - `Berawan` (Cloudy)
   - `Hujan` (Rain)
   - Select the condition at the moment of weighing.
7. Enter the **Tare Weight** in kilograms in the tare field.
   - Example: if the weighbridge shows 18,500 kg, enter `18500`.
   - Do not enter commas, dots, or units — numbers only.
   - The value must be greater than zero. The system will reject a zero or blank value.
8. Review all fields. Verify the truck ID, jetty, and tare weight are correct.
9. Tap **Catat Masuk** (Record Arrival). Wait for the green success banner.
10. The success banner shows the **ticket number** (No. Tiket), truck ID, and tare weight. Verbally confirm the ticket number with the truck driver if required by your site protocol.
11. The truck list on the right side of the screen will refresh automatically to include this new trip with status `Pending`.

### What happens next

The trip is created in the system with status `Pending`. The truck can now proceed to load coal. The site operator must record CP2 when the same truck departs loaded.

### Common mistakes to avoid

- **Wrong truck ID**: Double-check the no. lambung on the truck itself, not from memory.
- **Wrong jetty**: Confirm with the driver. Correcting this after submission requires supervisor intervention.
- **Tare weight from yesterday**: Always read the current weighbridge display. Do not reuse previous values.

---

## 5. Site Operator — CP2 (Truck Departs Stockpile)

**When**: Each time a loaded truck departs the stockpile through the exit weighbridge.  
**Who**: Site operator, site_jetty_operator, supervisor, admin.  
**Tab**: "Keluar" (Departure) on the stockpile page.

### What you need before starting

- Truck ID (No. Lambung) — confirm it matches the truck you recorded at CP1
- The gross (loaded) weight reading from the exit weighbridge in **kilograms**

### Step-by-step

1. On the Stockpile page, tap the **Keluar** (CP2) tab. A red badge on the tab shows how many trucks are waiting for CP2.
2. Find the correct truck using one of two methods:

   **Method A — Search by truck ID (recommended):**
   1. In the search box, type the truck's No. Lambung.
   2. Tap the search button (magnifying glass icon).
   3. The system will display the truck's trip details: ticket number, jetty destination, coal quality, tare weight, and CP1 timestamp.
   4. Verify this is the correct truck and trip before proceeding.

   **Method B — Tap from the waiting list:**
   1. Below the search box, the list shows all trucks with status `Pending` (waiting for CP2).
   2. Tap the truck's row. The trip details will load in the form above.

3. Confirm the trip details shown match the physical truck in front of you:
   - No. Lambung ✓
   - Jetty destination ✓
   - Tare weight looks correct ✓
4. Enter the **Gross Weight** (loaded weight) in kilograms.
   - Example: if the weighbridge shows 37,200 kg, enter `37200`.
   - Numbers only — no commas, dots, or units.
   - The gross weight must be greater than the tare weight. The system will show a live preview of the **Netto (net weight)** = Gross − Tare. If the netto preview is zero or negative, the gross weight you entered is wrong — do not submit.
5. Check the **Netto preview** card that appears below the input. The netto value should be a realistic coal weight (typically between 10,000 kg and 25,000 kg depending on truck capacity). If it looks wrong, re-read the weighbridge.
6. Tap **Catat Keluar** (Record Departure). Wait for the green success banner.
7. The success banner shows the truck ID and the calculated netto site weight.
8. The truck's status changes to `In Transit`. It will now appear in the jetty operator's incoming queue.

### Common mistakes to avoid

- **Recording the wrong truck**: Always search by No. Lambung and verify the displayed tare weight matches your records.
- **Entering tare weight instead of gross weight**: The gross weight of a loaded truck is always heavier than the tare weight. If the netto preview is negative, you have entered the wrong value.
- **Submitting before the truck is actually on the weighbridge**: Always record the weight while the truck is stationary on the scale.

---

## 6. Jetty Operator — CP3 (Truck Arrives at Jetty)

**When**: Each time a truck arrives at the jetty weighbridge.  
**Who**: Jetty operator, site_jetty_operator, supervisor, admin.  
**Tab**: "Timbang" (Weigh) on the jetty page.

### What you need before starting

- Truck ID (No. Lambung) — confirm from the truck
- The gross (loaded) weight at the jetty weighbridge in **kilograms**
- The stockpile code (where the coal came from) — optional but recommended
- The tare (empty) weight at the jetty weighbridge — optional, only if the jetty uses a separate tare scale

### Step-by-step

1. On the Jetty page, tap the **Timbang** (CP3) tab. A badge shows how many trucks are currently `In Transit` (coming from the site).
2. Check the **In Transit** queue on the right side of the screen. This shows all trucks that have departed the stockpile and are expected at your jetty.
3. Find the truck using one of two methods:

   **Method A — Search by truck ID (recommended):**
   1. In the search box, type the truck's No. Lambung.
   2. Tap the search button.
   3. The system displays the truck's site data: netto site weight, gross site weight, CP1 and CP2 timestamps, and elapsed travel time.
   4. If the truck shows status `Completed`, it has already been weighed at the jetty today. Do not record it again. Show the completed record to the driver as confirmation.
   5. If the truck shows status `In Transit`, proceed to step 4.

   **Method B — Tap from the in-transit list:**
   1. In the queue list, tap the truck's row. The form will load with the truck's details.

4. Confirm the trip details shown match the truck in front of you:
   - No. Lambung ✓
   - Jetty destination matches your jetty ✓
   - Coal quality ✓
5. Enter the **Gross Jetty Weight** in kilograms.
   - Read the jetty weighbridge display.
   - Numbers only — no commas or units.
6. Select the **Stockpile Code** (source of the coal) from the dropdown. Options depend on the jetty:
   - Hasnur: `Jetty R`, `Jetty H/J`
   - Talenta: `Line 1`, `Line 2`, `Line 3`, `Line 4`, `Stockroom 2`
   - If you are unsure, you may leave this blank, but try to confirm from the driver or dispatch sheet.
7. Enter the **Tare Jetty Weight** (empty weight at jetty) — **only if your jetty procedure requires a separate jetty tare**.
   - If your jetty does not weigh the empty truck separately, leave this field blank.
   - When left blank, the system uses the gross jetty weight as the full netto jetty weight (meaning the truck was not re-tared at the jetty).
8. Review the **preview card** that appears:
   - **Netto Jetty**: net coal weight at the jetty
   - **Deviasi vs Site**: difference between netto jetty and netto site (negative = weight lost in transit, positive = weight gained). A normal small negative deviation (0–500 kg) is acceptable. A large negative deviation or a positive deviation should be noted and reported to the supervisor.
   - **Compare Gross**: difference in gross weight between jetty and site.
   - **Compare Tare** (if tare jetty entered): difference in empty weight between site and jetty tares.
9. If the deviation appears abnormal (see Section 12), note it and contact the supervisor before or after submitting.
10. Tap **Catat Timbang** (Record Jetty Weight). Wait for the green success banner.
11. The success banner shows the truck ID, netto jetty weight, and deviation.
12. The trip's status changes to `Completed`.

### Common mistakes to avoid

- **Weighing a truck that shows status `Completed`**: The system will not allow a second CP3 entry for the same trip. If a truck arrived but claims it was not recorded, search for the truck ID — if found as `Completed`, show the driver the record.
- **Leaving the stockpile code blank habitually**: This field is important for barge balance reconciliation. Always fill it when known.
- **Ignoring large deviations**: A deviation greater than ±1,000 kg should be flagged to the supervisor. Do not dismiss it.

---

## 7. Jetty Operator — Barge Loading

**When**: Each time a barge is loaded with coal at the jetty. This is recorded once per barge loading event, not per truck.  
**Who**: Jetty operator, site_jetty_operator, supervisor, admin.  
**Tab**: "Barge" on the jetty page.

### What you need before starting

- Jetty (Hasnur or Talenta)
- Loading date
- Barge name (e.g., `TAMA 2238`)
- Tug boat name (e.g., `PRIMA 3330`)
- Stockpile code (source of the coal for this barge)
- Total coal quantity loaded onto this barge in **kilograms**

### Step-by-step

1. On the Jetty page, tap the **Barge** tab.
2. Select the **Jetty** from the dropdown (`Hasnur` or `Talenta`).
3. Set the **Loading Date**. This defaults to today. Change it only if you are recording a loading that occurred on a different date (requires authorization).
4. Enter the **Barge Name** in uppercase (e.g., `TAMA 2238`).
5. Enter the **Tug Boat Name** in uppercase (e.g., `PRIMA 3330`).
6. Select the **Stockpile Code** from the dropdown. The options change based on the selected jetty:
   - Hasnur: `Jetty R`, `Jetty H/J`
   - Talenta: `Line 1`, `Line 2`, `Line 3`, `Line 4`, `Stockroom 2`
7. Enter the **Loading Quantity** in kilograms. This is the total coal weight loaded onto this barge.
   - Numbers only — no commas, dots, or units.
   - The value must be greater than zero.
8. Review all fields. Barge name and tug boat name are especially important as they cannot be changed after submission without admin/supervisor intervention.
9. Tap the **Record Barge Loading** button. Wait for the green success banner.
10. The barge loading will appear in the history list on the right. The running total for the filtered period is shown at the bottom.

### Reading the remaining coal balance

Once a jetty is selected, a summary card appears at the top of the right-hand panel showing:

- **Tiba di Jetty** — total net coal weight delivered to this jetty by all trucks (all-time cumulative)
- **Dimuat ke Tongkang** — total coal loaded onto barges at this jetty (all-time cumulative)
- **Sisa** — remaining coal at the jetty (Arrived − Loaded)

The balance refreshes automatically after each new barge loading is submitted. Use it to confirm there is enough coal available before recording a new barge loading. If **Sisa** is shown in red (negative), barge loadings exceed recorded arrivals — stop and report this to the supervisor immediately.

### Common mistakes to avoid

- **Recording per truck instead of per barge**: Barge loading is one record for the whole barge, not one per truck. Only record when a barge has been fully (or partially) loaded and the tonnage is confirmed.
- **Wrong loading quantity**: Cross-check with the draft survey or loading manifest before entering. This figure is used in the barge balance report.
- **Wrong jetty**: Selecting the wrong jetty mixes the barge records with the wrong jetty's tonnage. Deleting a barge loading requires admin access.

---

## 8. Admin — End of Day

**When**: At the end of each operational day, after all trucks have been processed.  
**Who**: Admin only (some partial steps can be done by supervisors for jetty session ends).

### Order of operations

End-of-day must follow this sequence to avoid locking operators out before they finish:

```
1. Confirm all trucks are completed (no pending or in-transit trips)
2. Lock Site data
3. Lock Jetty data  (or lock per-jetty if jettys finish at different times)
4. End Jetty sessions (Hasnur and/or Talenta)
5. End the full session
```

### Step-by-step

#### Step 1 — Verify all trips are complete

1. Go to the Admin page (`/admin`).
2. Filter or scroll through today's trip table.
3. Look for any trips with status `Pending` (CP1 done, CP2 not yet done) or `In Transit` (CP2 done, CP3 not yet done).
4. Contact the relevant operator to complete any remaining trips before proceeding.
5. Do not lock or end the session while trips are still pending or in transit.

#### Step 2 — Lock Site data

1. Go to `/sessions` (Session Management).
2. Find today's session row.
3. In the **Site Lock** column, click the `Unlocked` button. It will change to `Locked` and show the lock timestamp.
4. This prevents site operators from recording new CP2 entries for today's session. CP1 entries are also blocked.
5. Notify site operators that site data is now locked.

#### Step 3 — Lock Jetty data

1. In the same session row, click the `Unlocked` button in the **Jetty Lock** column. It will change to `Locked`.
2. This prevents jetty operators from recording new CP3 entries for today's session.
3. Notify jetty operators that jetty data is now locked.

#### Step 4 — End individual jetty sessions (optional)

This step is used when Hasnur and Talenta finish at different times, or to formally mark each jetty's operations as closed.

1. On the Stockpile page (site operator view), the Session Banner shows Hasnur and Talenta rows with an **Akhiri** (End) button each.
2. Tap **Akhiri** next to the jetty that has finished. A confirmation appears — tap **Ya, Akhiri** to confirm.
3. The jetty's row turns grey and shows `Selesai`. This records the end timestamp for that jetty.
4. Repeat for the other jetty when it finishes.

> Alternatively, supervisors can also end individual jetty sessions from the Session Banner on the stockpile page.

#### Step 5 — End the full session

1. On the Session Management page (`/sessions`), find today's session row.
2. In the last column, click **End Session**. A confirmation dialog appears.
3. Confirm the date shown is correct, then click **OK**.
4. The session status changes to `Ended` and the `ended_at` timestamp is recorded.
5. The session is now fully closed. All data for this session is read-only except via admin direct edit.

### After end of day

- Verify the total trip count and total netto tonnage shown in the session row matches expectations.
- If any discrepancies are noticed, use the Admin page to review individual trip records before the next day begins.

---

## 9. Supervisor — Reviewing and Correcting Data

**Who**: Supervisor, admin.  
**Where**: Admin page (`/admin`) and Changelog page (`/changelog`).

### Viewing today's trips

1. Go to the Admin page.
2. The main data table shows all trips. Use the **date filter** (top-right of the table) to select a specific date or date range.
3. Filter by jetty using the jetty dropdown if needed.
4. Sort columns by clicking the column headers (ticket number, truck ID, netto, deviation, etc.).
5. Use the search bar to find a specific truck by No. Lambung.

### Editing a trip field

All weight fields, coal quality, jetty destination, truck ID, and weather can be edited by supervisors and admins. **Editing is not possible if the trip is locked.**

1. In the trip table, locate the row to edit.
2. **Double-click** the cell you want to edit. It becomes an editable input.
3. Change the value.
4. Press **Enter** or click outside the cell to save.
5. The change is saved immediately and recorded in the audit log with your account name and timestamp.

> Editable fields: No. Lambung, Jetty Destination, Coal Quality, Tare Site, Gross Site, Gross Jetty, Tare Jetty, Stockpile Code, Adjustment, Weather.

### Deleting a trip

1. In the trip table row, click the **delete icon** (trash icon) at the end of the row.
2. A confirmation prompt appears — confirm the deletion.
3. The trip is permanently removed and recorded in the audit log.
4. **Deletion cannot be undone.** Only delete if the trip was a duplicate or was entered for the wrong truck entirely.

### Locking an individual trip

Admins can lock individual trips to prevent further editing, even by supervisors.

1. In the trip table row, click the **lock icon** at the end of the row.
2. The row will show a lock indicator. Locked trips cannot be edited by anyone except admins who toggle the lock off.

### Viewing the audit log (Changelog)

1. Go to `/changelog` (Changelog page) — accessible from the navigation menu.
2. The changelog shows all actions: CP1 entries, CP2 entries, CP3 entries, edits, and deletions.
3. Each entry shows:
   - Action type (e.g., "CP1 — Truck arrived at site", "Trip edited")
   - Partial trip ID
   - User email who performed the action
   - Timestamp (WITA)
4. Click any entry to expand it and see the **Before** and **After** JSON data — the exact field values before and after the change.
5. Use this to trace who changed what and when.

---

## 10. Admin — User Management

**Who**: Admin only.  
**Where**: Admin page → Users button (top of the page).

### Creating a new user

1. Go to the Admin page (`/admin`).
2. Click **Users** (or the user management button at the top).
3. A modal opens showing all existing users.
4. In the form at the bottom of the modal:
   - Enter the **email** (this is the login username — use a consistent format, e.g., `jetty008@hauling.local`).
   - Enter the **initial password**. Communicate this securely to the user. The user cannot change their own password through the app — only the admin can update it.
   - Select the **role** from the dropdown.
5. Click **Create User**. The new user appears in the list.
6. Test the login with the new credentials before handing over to the user.

### Roles to assign

| Role | Use when |
|------|---------|
| `stockpile_operator` | Operator stationed at the site/stockpile |
| `jetty_operator` | Operator stationed at Hasnur or Talenta jetty |
| `site_jetty_operator` | Person who covers both site and jetty |
| `supervisor` | Supervisor who needs to edit data and see the audit log |
| `analytics` | Management or reporting staff who only view reports |
| `admin` | System administrator — assign sparingly |

### Changing a user's password

1. In the Users modal, find the user row.
2. Double-click the password field (shown as `••••••`).
3. Type the new password.
4. Press Enter or click away to save.
5. Communicate the new password to the user securely.

### Changing a user's role

1. In the Users modal, find the user row.
2. Double-click the role field.
3. Select the new role from the dropdown.
4. Press Enter or click away to save. The change takes effect at the user's next login.

### Deleting a user

1. In the Users modal, find the user row.
2. Click the delete (trash) icon.
3. Confirm the deletion.
4. The user account is permanently removed. Their historical entries in the audit log remain and will show their email.

> **Important**: Deleting a user does not delete their recorded trips or audit entries. Only the login account is removed.

---

## 11. Analytics — Viewing Reports and Exporting Data

**Who**: Analytics, supervisor, admin, site_jetty_operator.  
**Where**: Analytics page (`/analytics`).

### Overview tab

Shows aggregate statistics for a selected date range:
- Total trips and tonnage for Hasnur and Talenta
- Daily breakdown (tonnage per day)
- Summary cards: total trips, total netto kg, total gross kg

**To use**:
1. Go to the Analytics page.
2. Set the **date range** using the from/to date pickers at the top.
3. Optionally filter by jetty.
4. The charts and summary cards update automatically.

### Truck history tab

Shows all trips ever recorded for a specific truck.

1. Go to Analytics → Truck History tab.
2. Enter the truck's **No. Lambung** in the search field.
3. Tap Search. All historical trips for that truck are listed with dates, weights, deviations, and statuses.
4. To export: click **Export Excel** to download the truck's history as an Excel file.

### Barge loading tab

Shows all barge loading records.

1. Go to Analytics → Barge tab.
2. Filter by jetty and/or date range.
3. The table shows all barge loadings with barge name, tug boat, quantity, and stockpile code.
4. The **Barge Balance** section compares total netto jetty tonnage (from truck trips) against total barge loading tonnage for the same period. A large gap may indicate unrecorded barge loadings or data entry errors.

### Deviation monitoring tab

Shows trips where the weight deviation between site and jetty was unusual.

1. Go to Analytics → Monitoring tab.
2. The table highlights trips with deviations that exceed the threshold.
3. Use this to identify systemic issues (e.g., a specific truck consistently losing weight) or one-off anomalies.

### Exporting trip data (Excel export)

Available to supervisor, admin, analytics.

1. On the Stockpile or Jetty page, tap the **Ekspor** (Export) tab.
2. Set the **date range** (from / to).
3. Select the **jetty** (Hasnur, Talenta, or All).
4. Tap **Download Excel**.
5. The file downloads with bilingual headers (Indonesian and Chinese). Each row is one trip.

---

## 12. Error Handling & Escalation

### What to do if the system shows an error message

| Error message situation | Action |
|------------------------|--------|
| "Session not active" or no session visible | Stop data entry. Contact admin to verify/create today's session. |
| "Truck not found" when searching for CP2/CP3 | Verify the No. Lambung spelling. Check the Today list to confirm the truck was recorded at the previous checkpoint. If not found, the previous checkpoint was not recorded — escalate to supervisor. |
| "Site is locked" | The admin has locked site data. CP1/CP2 entries are no longer accepted. Contact admin if you have a legitimate late entry. |
| "Jetty is locked" | Same as above — contact admin for a late CP3 entry. |
| Form won't submit / button stays disabled | Check that all required fields are filled and values are valid (tare > 0, gross > tare for netto preview to show positive). |
| Page shows a spinner indefinitely | Check your internet connection. Refresh the page. If the problem persists, contact the system admin. |
| Login fails with correct credentials | Contact admin to verify your account exists and your role is correctly assigned. |

### Deviation thresholds and escalation

| Deviation range | Action |
|----------------|--------|
| 0 to −500 kg | Normal. No action needed. |
| −500 to −1,000 kg | Note it. Monitor for recurrence on the same truck. |
| Below −1,000 kg or any positive deviation | Flag to supervisor immediately before or after recording. Supervisor will review and note in the audit log. |

### Duplicate trip prevention

- If a truck arrives at CP2 or CP3 and you cannot find it in the system, **do not create a new CP1 entry** as a workaround. Escalate to supervisor.
- If a truck appears twice in the today list, contact the supervisor — one may be a duplicate from a previous data entry error.

### Data corrections after the session is locked

1. Operator contacts supervisor with the specific trip details and the correct values.
2. Supervisor reviews and edits the trip via the Admin page (double-click cell to edit).
3. Supervisor verifies the corrected data in the Changelog.
4. If the session has been ended (not just locked), only admin can unlock individual trips.

### Emergency: wrong data submitted at CP1

If the wrong truck ID, jetty, or tare weight was submitted at CP1 and you notice before CP2:

1. Do **not** submit a second CP1 for the same or corrected truck.
2. Contact the supervisor immediately.
3. Supervisor will edit the existing trip to correct the fields via the Admin page.
4. Once corrected, the site operator can proceed to record CP2 normally.

---

---

## 13. System Maintenance Break

**Who**: System admin only.  
**When**: Before deploying updates, running database migrations, or restarting any server component.  
**Estimated downtime**: 10–15 minutes (users see a maintenance page, not an error).

> For the full technical runbook including setup instructions and rollback commands, see [MAINTENANCE.md](../MAINTENANCE.md).

---

### Pre-maintenance checklist

Before starting, confirm all of the following:

- [ ] Maintenance is scheduled at an **off-peak time** — between shifts or overnight, when no trucks are actively in transit.
- [ ] All trucks for the day have status `Completed` — no trips showing `Pending` or `In Transit`.
- [ ] The admin has **locked today's session** (Site Lock and Jetty Lock both set to `Locked`) to prevent new entries during the window.
- [ ] Operators and drivers have been notified at least **30 minutes in advance** via WhatsApp or radio.

To verify no in-transit trips remain, run on the VPS:

```bash
sudo -u postgres psql -d hauling_tracker -c "SELECT count(*) FROM trips WHERE status IN ('pending', 'in_transit');"
```

The result must be `0` before proceeding.

---

### Step 1 — Enable maintenance mode

Run on the VPS. This shows a "Under Maintenance" page to all users instead of the live app:

```bash
# Frontend: show maintenance page immediately
touch /var/www/hauling/maintenance.flag
nginx -t && systemctl reload nginx

# Backend: return 503 on all API requests
sed -i '/^MAINTENANCE_MODE/d' /var/www/hauling/backend/.env
echo "MAINTENANCE_MODE=true" >> /var/www/hauling/backend/.env
pm2 restart hauling-api
```

**Verify**: Open the app URL in a browser. You should see the maintenance page, not the login screen.

---

### Step 2 — Back up the database

Always take a backup before any maintenance, regardless of how small the change is:

```bash
mkdir -p /var/backups/hauling
sudo -u postgres pg_dump hauling_tracker > /var/backups/hauling/hauling_$(date +%Y%m%d_%H%M).sql
echo "Backup saved: $(ls -lh /var/backups/hauling/ | tail -1)"
```

---

### Step 3 — Perform the maintenance work

```bash
# Pull latest code
cd /var/www/hauling && git pull origin main

# Run any new database migrations
cd backend && npm run migrate

# Fix permissions after migrations (safe to run every time)
sudo -u postgres psql -d hauling_tracker -c \
  "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hauling_user;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hauling_user;"

# Rebuild frontend (if frontend files changed)
cd /var/www/hauling
docker compose build frontend && docker compose up -d frontend

# Restart backend (if backend files changed)
pm2 restart hauling-api
```

---

### Step 4 — Verify before going live

Before disabling maintenance mode, confirm everything is healthy:

```bash
# Backend health check — must return {"ok":true}
curl http://localhost:3002/health

# Check PM2 status — hauling-api must show "online"
pm2 status

# Check Docker — frontend must show "Up"
docker compose ps

# Check for errors in logs
pm2 logs hauling-api --lines 20
```

If any check fails, **do not disable maintenance mode**. Diagnose and fix the issue first. If you cannot recover, see the Rollback section in [MAINTENANCE.md](../MAINTENANCE.md).

---

### Step 5 — Disable maintenance mode

Once all checks pass:

```bash
# Remove maintenance mode from backend
sed -i '/^MAINTENANCE_MODE/d' /var/www/hauling/backend/.env
pm2 restart hauling-api

# Remove maintenance flag (frontend goes live immediately)
rm /var/www/hauling/maintenance.flag
nginx -t && systemctl reload nginx
```

**Verify**: Refresh the app URL. You should see the login page, not the maintenance page.

---

### Step 6 — Post-maintenance checks

- [ ] App loads and login works
- [ ] Admin can view sessions and the trip list with correct data
- [ ] `pm2 logs hauling-api` shows no crash or error lines
- [ ] Notify operators (WhatsApp/radio) that the system is back online
- [ ] Unlock today's session (Site Lock and Jetty Lock) if operators need to resume work

---

### Rollback procedure

If the app is broken after disabling maintenance mode:

1. **Immediately re-enable maintenance mode** (repeat Step 1).
2. Restore the database from the backup taken in Step 2:
   ```bash
   sudo -u postgres psql hauling_tracker < /var/backups/hauling/hauling_YYYYMMDD_HHMM.sql
   ```
3. Revert the code to the last working commit:
   ```bash
   cd /var/www/hauling
   git log --oneline -5     # identify the last good commit
   git checkout <hash>
   ```
4. Rebuild and restart (repeat Step 3), then verify (Step 4).
5. Disable maintenance mode again (Step 5).

---

*This SOP reflects the current version of the Hauling Tracker application. Any changes to the application workflow that affect these procedures should be reflected in an updated version of this document.*

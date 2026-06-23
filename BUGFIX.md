# Bug Fix Log

---

## BUG-001 — Overnight in_transit trips not showing in jetty incoming queue

**Date:** 2026-06-24
**Severity:** High — jetty operators could not see trucks that departed site the previous day

### Description
The "Antrian Timbang" (incoming queue) on the jetty operator page showed 0 trucks whenever in_transit trips crossed midnight. Trucks that departed the stockpile site late at night and arrived at the jetty the following day were invisible to jetty operators.

### Root Cause
Two separate issues:

1. **Backend** — `GET /trips/incoming` filtered by `date = today`, excluding any in_transit trip created on a previous date.
2. **Frontend** — `JettyOperatorPage` did not call `/trips/incoming` at all. It called `/trips/today` (also date-filtered) and derived the incoming queue by filtering client-side for `status = 'in_transit'`.

### Fix

**Backend** (`backend/src/routes/trips.js`):
Removed the `date = today` condition from `GET /trips/incoming` so it returns all in_transit trips regardless of date.

**Frontend** (`frontend/src/pages/JettyOperatorPage.jsx`):
Changed `fetchTrips` to call both `getTodayTrips` and `getIncomingTrips` in parallel, then merge the results — deduplicating by `trip_id` so overnight in_transit trips appear in `allTrips` and therefore in the incoming queue.

```js
const [today, incoming] = await Promise.all([
  api.getTodayTrips(jettyFilter),
  api.getIncomingTrips(jettyFilter),
]);
const seen = new Set(today.map((t) => t.trip_id));
const overnight = incoming.filter((t) => !seen.has(t.trip_id));
setAllTrips([...overnight, ...today]);
```

**Commits:** `e21513d`, `060dc79`

---

## BUG-002 — Truck search fails for overnight in_transit trips

**Date:** 2026-06-24
**Severity:** High — jetty operators could not weigh in trucks that arrived from the previous day

### Description
Searching for a truck by no. lambung (e.g. "HJI 069") on the jetty page returned "No matching trip found for this truck today" even though the truck was visible in the incoming queue with PERJALANAN status. Tapping the truck from the queue worked, but manual search did not.

### Root Cause
`GET /trips/search` filtered strictly by `date = today`. Any truck that departed the stockpile on a previous date had its trip record dated yesterday, so the search returned a 404.

### Fix

**Backend** (`backend/src/routes/trips.js`):
Added a fallback query: if no trip is found for today, search for the most recent `in_transit` trip for that truck across all dates (only when no explicit `status` filter is passed, to avoid breaking other callers).

```js
// Fall back to any in_transit trip for this truck (overnight trips)
if (!trip && !status) {
  trip = await queryOne(
    `select * from trips where no_lambung = $1 and status = 'in_transit' order by date desc limit 1`,
    [lambung]
  );
}
```

**Commit:** `b51a323`

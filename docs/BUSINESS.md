# Hauling Tracker — Business Documentation

## What the System Does

Hauling Tracker is a digital operations log for coal truck hauling. It replaces manual paper-based weighing records by capturing every truck's weight at two points — the stockpile site and the jetty — and automatically calculating how much coal was lost or gained in transit (deviation).

The system gives operations supervisors and management real-time visibility into:
- How many trucks hauled coal today and how much total tonnage
- The weight deviation for each trip (coal lost between site and jetty)
- Which barge received how much coal
- A complete, tamper-evident audit trail of who entered or changed any data

---

## Business Context

Coal trucks depart from a mine stockpile and deliver to one of two jetties:

- **Hasnur Jetty**
- **Talenta Jetty**

Each truck is weighed twice — once at the stockpile and once at the jetty. The difference in net weight (netto site vs. netto jetty) is the **deviation**, which is a critical operational metric: large deviations indicate spillage, measurement errors, or other issues that affect coal inventory accuracy.

At the jetty, coal from multiple trucks is loaded onto barges for shipping. The system tracks each barge loading separately to reconcile truck-delivered tonnage against barge-dispatched tonnage.

---

## Operational Workflow

### Daily Cycle

```
Admin creates / confirms today's session
         │
         ▼
Site Operator (CP1): Truck arrives at stockpile
   → Record truck ID, jetty destination, coal quality, empty weight (tare)
         │
         ▼
Site Operator (CP2): Truck departs stockpile (loaded)
   → Record gross weight → system computes net site weight
         │
         ▼
         [Truck drives to jetty]
         │
         ▼
Jetty Operator (CP3): Truck arrives at jetty
   → Record gross weight at jetty → system computes net jetty weight + deviation
         │
         ▼
Jetty Operator: Record barge loading
   → Log which barge, from which stockpile, how many kg loaded
         │
         ▼
Admin / Supervisor: End of day
   → Lock site and jetty data → close session
```

---

## Checkpoint Definitions

| Checkpoint | Location | What is Recorded |
|-----------|----------|-----------------|
| **CP1** | Stockpile entrance | Truck ID, destination, coal quality, empty (tare) weight |
| **CP2** | Stockpile exit | Gross (loaded) weight; net site weight calculated automatically |
| **CP3** | Jetty | Gross jetty weight; net jetty weight and deviation calculated automatically |

---

## Key Metrics

| Metric | Definition |
|--------|-----------|
| **Netto Site (kg)** | Gross site − Tare site = net coal weight loaded at site |
| **Netto Jetty (kg)** | Gross jetty − Tare jetty (or gross jetty if no jetty tare) = net weight at jetty |
| **Deviasi (kg)** | Netto jetty − Netto site = weight gained (+) or lost (−) in transit |
| **Compare Gross (kg)** | Gross jetty − Gross site = change in total truck weight |
| **Total Hauled** | Sum of all netto site weights for a date/jetty |
| **Barge Balance** | Total barge loadings vs. total netto jetty weights for a period |

A negative deviation means coal was lost in transit. A positive deviation may indicate a measurement discrepancy. Supervisors review deviations exceeding an acceptable threshold.

---

## User Roles

### Site Operator (`stockpile_operator`)
Records truck arrivals and departures at the stockpile (CP1 and CP2). Cannot see or edit jetty data. Cannot modify records after entry.

**Users**: Sela (site001), Admin Site shared (site002)

### Jetty Operator (`jetty_operator`)
Records truck arrivals at the jetty (CP3) and logs barge loadings. Can see the list of trucks in transit from the site. Cannot see or edit stockpile data.

**Users**: Hervin (jetty001), Fahmi (jetty002), Josua (jetty003), jetty004–007 (shared)

### Site & Jetty Operator (`site_jetty_operator`)
Has access to both site and jetty entry screens. Can enter data at either location but cannot edit or delete existing records.

**Users**: Sun Zhenbo (both001)

### Supervisor (`supervisor`)
Full operational access: can view all data for both jetties, edit or delete trip records, view the complete audit log of all changes, and access analytics and reports.

**Users**: Maya (super001), Lihao (super002)

### Analytics (`analytics`)
Read-only access to reports: trip summaries, truck history, barge loading records, and data exports. Cannot enter or modify any operational data.

**Users**: Vero (analytics001), Syella (analytics002)

### Admin (`admin`)
Full system control: all operator and supervisor permissions, plus user account management, session locking, and individual trip locking. The admin role is reserved for system administrators.

---

## Data Exports

The system can export data to Excel (.xlsx) with bilingual headers (Indonesian and Chinese):

| Export | Who can run it | Contents |
|--------|---------------|----------|
| **Daily trips export** | Supervisor, Admin, Analytics | All trips for a date range + jetty, with all weight columns |
| **Truck history export** | Supervisor, Admin, Analytics | All-time trip history for a specific truck ID |

---

## Session Management

Each operational day is grouped into a **session**. Sessions allow management to:

- **Lock site data** — prevents any further changes to CP1/CP2 records once the stockpile has closed for the day
- **Lock jetty data** — prevents any further changes to CP3 records
- **End a jetty session** — close out Hasnur or Talenta independently (if one jetty finishes earlier)
- **End the full session** — formally closes the day's records

Once a session is ended, all data for that day is read-only. Individual trips can also be locked by an admin to prevent targeted edits.

---

## Audit Trail

Every data entry and modification is permanently recorded in the audit log:

- **Who** made the change (user account)
- **What** was changed (field-level before and after values)
- **When** the change was made (timestamp)
- **What action** was taken (CP1 entry, CP2 entry, CP3 entry, edit, delete)

Supervisors and admins can view the full audit log from the Changelog screen. Records cannot be deleted from the audit log.

---

## Jetty Coal Balance (Barge Page)

On the barge loading page, when a jetty is selected, the system displays a live **remaining coal** summary for that jetty:

| Line | Value |
|------|-------|
| **Tiba di Jetty** (Arrived at Jetty) | Cumulative netto jetty weight of all completed truck trips to this jetty |
| **Dimuat ke Tongkang** (Loaded onto Barges) | Cumulative total of all recorded barge loadings at this jetty |
| **Sisa** (Remaining) | Arrived − Loaded = coal currently stockpiled at the jetty |

This gives jetty operators and supervisors an at-a-glance view of how much coal is available to load, without navigating to the Analytics screen. The figure updates automatically each time a new barge loading is recorded.

A negative remaining balance indicates that barge loadings exceed recorded truck arrivals, which signals either missing truck trip records or a data entry error in barge quantities.

---

## Analytics & Monitoring

The Analytics screen provides:

- **Overview** — total trips and tonnage by day and by jetty for a selected date range
- **Truck history** — complete hauling history for any truck by truck ID
- **Barge loading records** — all barge loadings with tonnage, searchable by jetty and date
- **Barge balance** — comparison of total netto jetty tonnage vs. total barge loaded tonnage to detect discrepancies
- **Deviation monitoring** — flags trips where deviation exceeds acceptable thresholds

---

## Languages

The application interface supports two languages, switchable at any time:

- **Indonesian (Bahasa Indonesia)** — default
- **Chinese (Mandarin)** — for operators and management who prefer it

Excel exports include bilingual column headers.

---

## System Availability

The application runs as a Progressive Web App (PWA), which means:

- It can be installed on mobile devices and desktops from the browser
- It is designed to work on site in field conditions
- It is accessible from any device with a browser and internet connection to the server

---

## Data Retention

All operational data is stored indefinitely in the database. There is currently no automated archival or deletion policy. Historical data can be queried through the Truck History feature or via direct analytics exports.

"""
Extracts trip data from Talenta Bumi invoice PDFs and generates SQL UPDATE
statements to correct netto_jetty_kg values in the hauling_tracker database.

Usage:
    python reconcile.py 26060010-TB-MMI-JT.pdf 26060011-TB-MMI-JT.pdf

Output:
    reconcile.sql  — apply this on the server
"""

import sys
import re
import pdfplumber
from collections import defaultdict
from datetime import datetime


def parse_date(date_str):
    """Convert DD/MM/YYYY or DD-MM-YY or DD-MM-YYYY to YYYY-MM-DD."""
    date_str = date_str.strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%y", "%d-%m-%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def parse_number(val):
    """Parse a number that may use dots as thousand separators."""
    if val is None:
        return None
    cleaned = str(val).strip().replace(".", "").replace(",", "")
    try:
        return int(cleaned)
    except ValueError:
        return None


def extract_trips_from_pdf(pdf_path):
    """Return list of dicts: {date, truck, netto} from a rekapitulasi PDF."""
    trips = []
    ticket_re = re.compile(r"^TB\d+", re.IGNORECASE)

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    if not row or len(row) < 8:
                        continue
                    ticket = str(row[1]).strip() if row[1] else ""
                    if not ticket_re.match(ticket):
                        continue

                    unit_id = str(row[2]).strip().replace(" ", "") if row[2] else ""
                    date_raw = str(row[3]).strip() if row[3] else ""
                    netto_raw = row[8] if len(row) > 8 else row[-1]

                    parsed_date = parse_date(date_raw)
                    parsed_netto = parse_number(netto_raw)

                    if not parsed_date or not parsed_netto or not unit_id:
                        continue
                    if not re.match(r"PJM\d+", unit_id):
                        continue

                    trips.append({
                        "date": parsed_date,
                        "truck": unit_id,
                        "netto": parsed_netto,
                        "ticket": ticket,
                    })

    return trips


def generate_sql(invoice_trips, discrepant_dates):
    """
    Generate UPDATE statements matching invoice trips to system trips.

    Matching strategy:
      - Group by (date, truck)
      - For unique (date, truck): direct match
      - For duplicates: match by sorted no_tiket order vs sorted ticket order
    """
    lines = []
    lines.append("-- Reconciliation SQL generated from Talenta Bumi invoices")
    lines.append("-- Review carefully before applying!\n")
    lines.append("BEGIN;\n")

    # Group invoice trips by (date, truck)
    by_key = defaultdict(list)
    for t in invoice_trips:
        if t["date"] in discrepant_dates:
            by_key[(t["date"], t["truck"])].append(t)

    # Sort within each group by ticket number for consistent ordering
    for key in by_key:
        by_key[key].sort(key=lambda x: x["ticket"])

    # Generate UPDATE for each group
    for (date, truck), inv_trips in sorted(by_key.items()):
        n = len(inv_trips)
        if n == 1:
            netto = inv_trips[0]["netto"]
            lines.append(
                f"UPDATE trips SET netto_jetty_kg = {netto}"
                f" WHERE date = '{date}'"
                f" AND REPLACE(no_lambung, ' ', '') = '{truck}'"
                f" AND jetty_destination = 'talenta';"
            )
        else:
            # Multiple trips for same truck on same day — use CTEs with row ordering
            lines.append(f"-- {truck} on {date}: {n} trips — matching by ticket order vs no_tiket order")
            for i, inv_trip in enumerate(inv_trips):
                netto = inv_trip["netto"]
                lines.append(
                    f"UPDATE trips SET netto_jetty_kg = {netto}"
                    f" WHERE trip_id = ("
                    f"SELECT trip_id FROM trips"
                    f" WHERE date = '{date}'"
                    f" AND REPLACE(no_lambung, ' ', '') = '{truck}'"
                    f" AND jetty_destination = 'talenta'"
                    f" ORDER BY no_tiket"
                    f" LIMIT 1 OFFSET {i}"
                    f");"
                )

    lines.append("\n-- Verify day totals match invoice before committing:")
    lines.append("SELECT date, COUNT(*) ritase, SUM(netto_jetty_kg) system_total")
    lines.append("FROM trips")
    lines.append("WHERE jetty_destination = 'talenta'")
    lines.append(f"  AND date IN ({', '.join(repr(d) for d in sorted(discrepant_dates))})")
    lines.append("GROUP BY date ORDER BY date;\n")
    lines.append("-- If totals match invoice, run COMMIT; otherwise ROLLBACK;")
    lines.append("-- COMMIT;")
    lines.append("-- ROLLBACK;")

    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python reconcile.py <pdf1> [pdf2 ...]")
        sys.exit(1)

    # Known discrepant dates (system total != invoice total)
    discrepant_dates = {
        "2026-05-22",
        "2026-05-24",
        "2026-05-25",
        "2026-05-29",
        "2026-05-30",
        "2026-06-02",
        "2026-06-03",
        "2026-06-04",
    }

    all_trips = []
    for pdf_path in sys.argv[1:]:
        print(f"Extracting from {pdf_path}...")
        trips = extract_trips_from_pdf(pdf_path)
        print(f"  Found {len(trips)} trips")
        all_trips.extend(trips)

    print(f"Total trips extracted: {len(all_trips)}")

    sql = generate_sql(all_trips, discrepant_dates)

    out_path = "reconcile.sql"
    with open(out_path, "w") as f:
        f.write(sql)

    print(f"SQL written to {out_path}")
    print("Review it, then apply on server with:")
    print("  sudo -u postgres psql hauling_tracker -f reconcile.sql")


if __name__ == "__main__":
    main()

"""Debug: show what pdfplumber actually sees in the first few pages."""
import sys
import pdfplumber

pdf_path = sys.argv[1] if len(sys.argv) > 1 else "26060010-TB-MMI-JT.pdf"

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages[:6]):
        print(f"\n{'='*60}")
        print(f"PAGE {i+1}")
        print(f"{'='*60}")

        tables = page.extract_tables()
        print(f"  Tables found: {len(tables)}")
        for j, table in enumerate(tables):
            print(f"  Table {j+1}: {len(table)} rows x {len(table[0]) if table else 0} cols")
            for row in table[:5]:
                print(f"    {row}")

        # Also try raw words
        words = page.extract_words()
        if not tables:
            print(f"  Raw words sample (first 30):")
            for w in words[:30]:
                print(f"    {w['text']!r}")

        # Try extracting text
        text = page.extract_text()
        if text:
            lines = text.strip().split("\n")
            print(f"  Text lines (first 10):")
            for line in lines[:10]:
                print(f"    {line!r}")

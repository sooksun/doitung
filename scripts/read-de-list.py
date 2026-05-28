"""Read the DE workshop attendee list and dump to JSON (UTF-8 safe)."""
import json
import sys
from pathlib import Path
import pandas as pd

XLSX_PATH = r"C:\Users\ASUS\Downloads\รายชื่อผู้เข้าร่วมประชุมเชิงปฏิบัติการ DE แยกตามโรงเรียน.xlsx"
OUT_PATH = Path(__file__).parent / "de-list.json"

xl = pd.ExcelFile(XLSX_PATH)
result = {"sheets": []}

for name in xl.sheet_names:
    df = pd.read_excel(XLSX_PATH, sheet_name=name, header=None)
    # Find header row (the row containing คำว่า "โรงเรียน")
    header_row_idx = None
    for i, row in df.iterrows():
        vals = [str(v) for v in row if not pd.isna(v)]
        if any("โรงเรียน" in v for v in vals):
            header_row_idx = i
            break
    if header_row_idx is None:
        header_row_idx = 0

    headers = [str(v).strip() if not pd.isna(v) else f"col_{i}" for i, v in enumerate(df.iloc[header_row_idx])]
    body = df.iloc[header_row_idx + 1:].reset_index(drop=True)
    body.columns = headers

    rows = []
    for _, r in body.iterrows():
        rec = {}
        for h in headers:
            v = r[h]
            if pd.isna(v):
                rec[h] = None
            else:
                rec[h] = str(v).strip() if isinstance(v, str) else v
        rows.append(rec)

    result["sheets"].append({"name": name, "headers": headers, "rows": rows})

OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {OUT_PATH} ({len(result['sheets'])} sheets)")
for s in result["sheets"]:
    print(f"  - {s['name']}: {len(s['rows'])} rows, headers={s['headers']}")

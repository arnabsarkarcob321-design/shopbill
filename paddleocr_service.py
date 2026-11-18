import os
import re
import io
from typing import List, Dict, Any, Optional
from datetime import datetime

# Set local PaddleX / Paddle cache inside workspace to avoid permission issues
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, ".paddlex")
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ["PADDLE_PDX_CACHE_HOME"] = CACHE_DIR

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Common Indian retail units regex pattern
UNIT_PATTERN = r'\b(PCS|nos|NOS|SET|SETS|KGS|KG|GM|GMS|LTR|LTRS|ML|BOX|BOXES|PKT|PKTS|MTR|DOZ|BAG|BAGS|BTL|BTLS|JAR|JARS|CAN|CANS|STRIP|STRIPS)\b'

# Date regex pattern (day-month-year)
DATE_PATTERN = r'\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2]|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/](20\d\d|\d{2})\b'

_rapid_ocr_engine = None

def get_ocr_engine():
    """Lazily load and return RapidOCR (PaddleOCR engine) instance."""
    global _rapid_ocr_engine
    if _rapid_ocr_engine is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _rapid_ocr_engine = RapidOCR()
        except Exception as e:
            print(f"[OCR Init Warning]: {e}")
            _rapid_ocr_engine = None
    return _rapid_ocr_engine

def clean_ocr_qty(txt: str) -> str:
    """Fix common OCR digit misreads at ends of numbers like '108.0d' -> '108.00'."""
    return re.sub(r'(\d+\.\d)[dq]$', r'\g<1>0', txt)

def parse_product_pdf_with_paddle(pdf_path: str) -> Dict[str, Any]:
    """
    Robust multi-layer extraction for Indian invoices (Tally, Busy, Marg, GST bills, catalogues):
    1. Layer 1: pdfplumber word coordinate line clustering for digital/vector PDFs.
    2. Layer 2: RapidOCR (PaddleOCR ONNX engine) on rasterized page images for scanned PDFs.
    3. Row-band anchor decomposition, reading-order title merging, and math-reconciled quantities.
    """
    result: Dict[str, Any] = {
        "supplier_name": "Supplier / Vendor Document",
        "invoice_no": "",
        "invoice_date": datetime.now().strftime("%Y-%m-%d"),
        "engine_used": "PaddleOCR PP-OCRv4 Multi-Page Engine",
        "items": [],
        "total_amount": 0.0,
        "total_quantity": 0.0,
        "total_items": 0
    }

    extracted_items: List[Dict[str, Any]] = []
    supplier_found = ""
    inv_no_found = ""
    inv_date_found = ""

    # Layer 1: Check if PDF has a digital text layer
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            has_text = False
            for page in pdf.pages:
                txt = page.extract_text()
                if txt and len(txt.strip()) > 100:
                    has_text = True
                    break

            if has_text:
                extracted_items, supplier_found, inv_no_found, inv_date_found = _parse_vector_pdf(pdf)
    except Exception as e:
        print(f"[Vector PDF Extraction Note]: {e}")

    # Layer 2: If vector parsing yielded no items (e.g. Scanned multi-page PDF), run OCR
    if not extracted_items:
        extracted_items, s_ocr, inv_ocr, dt_ocr = _parse_scanned_pdf_with_ocr(pdf_path)
        if s_ocr and not supplier_found:
            supplier_found = s_ocr
        if inv_ocr and not inv_no_found:
            inv_no_found = inv_ocr
        if dt_ocr and not inv_date_found:
            inv_date_found = dt_ocr

    # Layer 3: Sequential Sl No renumbering and SKU generation
    for idx, it in enumerate(extracted_items, start=1):
        it["sl_no"] = idx
        it["sku"] = f"SKU-{it['hsn_code'][-4:] if len(it['hsn_code']) >= 4 else '1001'}-{idx:03d}"

    total_amount = sum(it.get("total_amount", 0.0) for it in extracted_items)
    total_qty = sum(it.get("quantity", 0.0) for it in extracted_items)

    result["items"] = extracted_items
    result["total_items"] = len(extracted_items)
    result["total_quantity"] = round(total_qty, 2)
    result["total_amount"] = round(total_amount, 2)
    result["supplier_name"] = supplier_found or "Uploaded Supplier Invoice"
    result["invoice_no"] = inv_no_found or f"INV-{datetime.now().strftime('%Y%m%d%H%M')}"
    result["invoice_date"] = inv_date_found or datetime.now().strftime("%Y-%m-%d")

    return result

def _parse_vector_pdf(pdf) -> tuple:
    """Parses text layer vector PDFs like Jal Kendra / Tally."""
    items: List[Dict[str, Any]] = []
    supplier = ""
    inv_no = ""
    inv_date = ""

    for page_idx, page in enumerate(pdf.pages):
        words = page.extract_words(x_tolerance=3, y_tolerance=3)
        if not words:
            continue

        line_buckets: List[Dict[str, Any]] = []
        for w in words:
            top = w.get("top", 0)
            matched = next((b for b in line_buckets if abs(b["top"] - top) <= 3.5), None)
            if matched:
                matched["words"].append(w)
            else:
                line_buckets.append({"top": top, "words": [w]})

        line_buckets.sort(key=lambda b: b["top"])

        for b in line_buckets:
            b["words"].sort(key=lambda w: w.get("x0", 0))
            line_text = " ".join(w.get("text", "") for w in b["words"]).strip()
            if not line_text:
                continue

            # Extract metadata on page 1
            if page_idx == 0:
                if not supplier:
                    sup_m = re.search(r'(?:JAL KENDRA|OM GALAXY LIMITED|MAA SALES|[A-Z0-9\s]{4,}(?:LIMITED|LTD|TRADERS|ENTERPRISES|SALES|KENDRA|STORE|KIRANA|PHARMA|AGENCY))', line_text, re.IGNORECASE)
                    if sup_m and not any(kw in line_text.lower() for kw in ["buyer", "consignee", "state name", "tax invoice"]):
                        supplier = sup_m.group(0).strip()
                if not inv_no:
                    inv_code_m = re.search(r'\b([A-Z0-9]{2,}/[0-9-]+/\d+)\b', line_text)
                    if inv_code_m:
                        inv_no = inv_code_m.group(1).strip()
                    else:
                        inv_m = re.search(r'(?:Invoice\s*No\.?|Bill\s*No\.?|Inv\s*No\.?)\s*[:.]?\s*([A-Za-z0-9/-]{1,30})', line_text, re.IGNORECASE)
                        if inv_m and not inv_m.group(1).lower().startswith("dated"):
                            inv_no = inv_m.group(1).strip()
                if not inv_date:
                    dt_m = re.search(DATE_PATTERN, line_text, re.IGNORECASE)
                    if dt_m:
                        inv_date = dt_m.group(0).strip()

            # Check if line starts with Sl No: e.g. "1 Single Suit 6910 3.00 PCS 10,847.46 PCS 32,542.38"
            sl_m = re.match(r'^(\d{1,3})\s+([A-Za-z].+?\b[1-9]\d{3,7}\b.+)$', line_text)
            if sl_m:
                sl_idx = int(sl_m.group(1))
                parsed = _parse_single_line_item(sl_m.group(2), sl_idx)
                if parsed:
                    items.append(parsed)

    return items, supplier, inv_no, inv_date

def _parse_single_line_item(rest_line: str, sl_no: int) -> Optional[Dict[str, Any]]:
    """Parses a structured line string into an item dictionary."""
    hsn_m = re.search(r'\b([1-9]\d{3,7})\b', rest_line)
    if not hsn_m:
        return None
    hsn = hsn_m.group(1)

    raw_name = rest_line[:hsn_m.start()].strip()
    after_hsn = rest_line[hsn_m.end():].strip()

    name = re.sub(r'^[0-9.)\s-]+', '', raw_name).strip()
    name = re.sub(r'[-–—\s]+$', '', name).strip()
    if not name or len(name) < 2:
        name = f"Product SKU-{hsn[-4:] if len(hsn) >= 4 else 'GEN'}"

    u_m = re.search(UNIT_PATTERN, after_hsn, re.IGNORECASE)
    unit = u_m.group(1).upper() if u_m else "PCS"

    before_u = after_hsn[:u_m.start()].strip() if u_m else ""
    after_u = after_hsn[u_m.end():].strip() if u_m else after_hsn

    nums_before = [float(x.replace(',', '')) for x in re.findall(r'\d[\d,]*(?:\.\d+)?', before_u) if x.replace(',', '')]
    nums_after = [float(x.replace(',', '')) for x in re.findall(r'\d[\d,]*(?:\.\d+)?', after_u) if x.replace(',', '')]

    qty = 1.0
    mrp = 0.0
    rate = 0.0
    total = 0.0
    gst_pct = 18

    if len(nums_before) >= 2:
        mrp = nums_before[0]
        qty = nums_before[1]
        if nums_after:
            rate = nums_after[0]
            total = nums_after[1] if len(nums_after) >= 2 else round(qty * rate, 2)
    elif len(nums_before) == 1:
        qty = nums_before[0]
        if nums_after:
            rate = nums_after[0]
            total = nums_after[-1]
            mrp = round(rate * 1.18, 2)
    else:
        if nums_after:
            rate = nums_after[0]
            total = nums_after[-1]
            mrp = round(rate * 1.18, 2)

    if rate > 0 and total > 0 and abs(round(total / rate) - qty) < 0.2:
        qty = round(total / rate, 2)

    selling_price = mrp if mrp > 0 else round(rate * 1.18, 2)
    tax_amt = round(total * (gst_pct / 100.0), 2)

    return {
        "sl_no": sl_no,
        "description": name,
        "sku": f"SKU-{hsn[-4:] if len(hsn) >= 4 else '1001'}-{sl_no:03d}",
        "hsn_code": hsn,
        "category": _infer_category(name),
        "quantity": max(1.0, qty),
        "unit": unit,
        "rate": max(0.0, rate),
        "mrp": max(0.0, mrp),
        "selling_price": max(0.0, selling_price),
        "gst_rate": f"{gst_pct}%",
        "tax_amount": tax_amt,
        "total_amount": max(0.0, total)
    }

def _parse_scanned_pdf_with_ocr(pdf_path: str) -> tuple:
    """Parses multi-page scanned PDF documents via RapidOCR with row-anchor band slicing."""
    items: List[Dict[str, Any]] = []
    supplier = ""
    inv_no = ""
    inv_date = ""

    try:
        import pypdfium2 as pdfium
        import numpy as np
        doc = pdfium.PdfDocument(pdf_path)
        ocr = get_ocr_engine()
        if not ocr:
            return items, supplier, inv_no, inv_date

        current_sl = 1

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            pil_img = page.render(scale=2.0).to_pil()
            ocr_res, _ = ocr(np.array(pil_img))
            if not ocr_res:
                continue

            boxes = []
            for r in ocr_res:
                box = r[0]
                text = str(r[1]).strip()
                if not text:
                    continue
                y_top = min(pt[1] for pt in box)
                y_bot = max(pt[1] for pt in box)
                x_left = min(pt[0] for pt in box)
                x_right = max(pt[0] for pt in box)
                boxes.append({
                    "text": text,
                    "x0": x_left,
                    "x1": x_right,
                    "y0": y_top,
                    "y1": y_bot,
                    "ymid": (y_top + y_bot) / 2.0
                })

            # Extract header metadata from page 1
            if page_idx == 0:
                for b in boxes:
                    t = b["text"]
                    if not supplier and any(kw in t.upper() for kw in ["OM GALAXY", "LIMITED", "LTD", "TRADERS", "SALES", "KENDRA"]):
                        if not any(ig in t.lower() for ig in ["buyer", "consignee", "state", "invoice"]):
                            supplier = t.strip()
                    if not inv_no:
                        m_inv = re.search(r'(?:OM/[A-Za-z0-9/]+|[A-Z]{2,}/[0-9-]+/\d+)', t)
                        if m_inv:
                            inv_no = m_inv.group(0).strip()
                    if not inv_date:
                        m_dt = re.search(DATE_PATTERN, t, re.IGNORECASE)
                        if m_dt:
                            inv_date = m_dt.group(0).strip()

            # Find table boundaries
            y_header = 0
            y_footer = 99999
            for b in boxes:
                txt = b["text"].lower()
                if any(h in txt for h in ["description", "sr.", "hsn", "mrp", "taxable"]):
                    if b["ymid"] > y_header and b["ymid"] < 1000:
                        y_header = max(y_header, b["y1"])
                if any(f in txt for f in ["total invoice", "total taxable", "taxableamount", "narration:"]):
                    y_footer = min(y_footer, b["y0"])
                elif txt == "total" and b["x0"] > 500:
                    y_footer = min(y_footer, b["y0"])

            table_boxes = [b for b in boxes if (b["ymid"] > y_header + 5 and b["ymid"] < y_footer - 5)]

            # Locate HSN anchors (4-8 digits in x0 range 250..400)
            hsn_boxes = []
            for b in table_boxes:
                m = re.search(r'\b([1-9]\d{3,7})\b', b["text"])
                if m and (250 <= b["x0"] <= 400):
                    hsn_boxes.append((b["ymid"], m.group(1), b))

            # Deduplicate near anchors in Y (within 15px)
            filtered_hsn = []
            for h in sorted(hsn_boxes, key=lambda x: x[0]):
                if not filtered_hsn or abs(h[0] - filtered_hsn[-1][0]) > 15:
                    filtered_hsn.append(h)

            if not filtered_hsn:
                continue

            # Calculate slice boundaries between consecutive row anchors
            y_cutoffs = []
            y_cutoffs.append(max(y_header, filtered_hsn[0][0] - 25))
            for i in range(len(filtered_hsn) - 1):
                mid = (filtered_hsn[i][0] + filtered_hsn[i+1][0]) / 2.0
                y_cutoffs.append(mid)
            y_cutoffs.append(min(y_footer, filtered_hsn[-1][0] + 35))

            for i in range(len(filtered_hsn)):
                y_start = y_cutoffs[i]
                y_end = y_cutoffs[i+1]
                row_b = [b for b in table_boxes if y_start <= b["ymid"] < y_end]

                hsn = filtered_hsn[i][1]
                hsn_box = filtered_hsn[i][2]

                # Description boxes: all boxes before the HSN box (x1 <= hsn_box["x0"] + 5)
                desc_boxes = [b for b in row_b if b["x1"] <= hsn_box["x0"] + 10]
                # Filter out pure serial number column boxes (x0 < 85)
                desc_boxes = [b for b in desc_boxes if b["x1"] > 85 or not re.match(r'^\d{1,3}[A-Za-z]?$', b["text"])]
                # Sort description boxes in reading order: top-to-bottom, left-to-right
                desc_boxes.sort(key=lambda b: (b["y0"], b["x0"]))
                desc_raw = " ".join(b["text"] for b in desc_boxes)

                # Clean description: separate leading digits jammed against letters, e.g. "15WONDRA" -> "15 WONDRA"
                desc = re.sub(r'^(\d{1,3})([A-Za-z])', r'\1 \2', desc_raw.strip())
                desc = re.sub(r'^\s*\d{1,3}[A-Za-z]?[.)\s\-]+', '', desc).strip()
                # Remove lone serial number tokens inside the line
                desc = re.sub(rf'\b{current_sl}[A-Za-z]?\b(?!\s*["\']|\s*(?:ft|in|inch|gm|kg|pcs|nos))', '', desc, flags=re.IGNORECASE)
                desc = re.sub(r'(?<=\s)\d{1,2}[A-Za-z]?(?=\s)(?!\s*["\']|\s*(?:ft|in|inch|gm|kg|pcs|nos))', '', desc, flags=re.IGNORECASE)
                desc = re.sub(r'^(?:f\s+|[A-Z]\s+)', '', desc).strip()
                desc = re.sub(r'([a-z])([A-Z])', r'\1 \2', desc)
                desc = re.sub(r'\s+', ' ', desc).strip()
                if not desc:
                    desc = f"Product Item {current_sl} (HSN {hsn})"

                # Value boxes: strictly boxes after the HSN box
                val_boxes = [b for b in row_b if b["x0"] >= hsn_box["x1"] - 5 and b != hsn_box]
                val_boxes.sort(key=lambda b: b["x0"])
                val_text = " ".join(b["text"] for b in val_boxes)

                u_m = re.search(UNIT_PATTERN, val_text, re.IGNORECASE)
                unit = u_m.group(1).upper() if u_m else "NOS"

                before_u = clean_ocr_qty(val_text[:u_m.start()].strip() if u_m else "")
                after_u = clean_ocr_qty(val_text[u_m.end():].strip() if u_m else val_text)

                raw_nums_before = [float(x.replace(',', '')) for x in re.findall(r'\d[\d,]*(?:\.\d+)?', before_u) if x.replace(',', '')]
                # Exclude the HSN itself if accidentally present
                nums_before = [x for x in raw_nums_before if str(int(x)) != hsn]
                nums_after = [float(x.replace(',', '')) for x in re.findall(r'\d[\d,]*(?:\.\d+)?', after_u) if x.replace(',', '')]

                qty = 1.0
                mrp = 0.0
                rate = 0.0
                total = 0.0
                gst_pct = 18

                if len(nums_before) >= 2:
                    mrp = nums_before[0]
                    qty = nums_before[1]
                    if nums_after:
                        rate = nums_after[0]
                        total = nums_after[1] if len(nums_after) >= 2 else round(qty * rate, 2)
                        for n in nums_after[2:]:
                            if int(n) in [0, 5, 12, 18, 28]:
                                gst_pct = int(n)
                                break
                elif len(nums_before) == 1:
                    qty = nums_before[0]
                    if nums_after:
                        rate = nums_after[0]
                        total = nums_after[1] if len(nums_after) >= 2 else round(qty * rate, 2)
                else:
                    if nums_after:
                        rate = nums_after[0]
                        total = nums_after[1] if len(nums_after) >= 2 else 0.0

                # Reconcile quantity mathematically
                if rate > 0 and total > 0 and abs(round(total / rate) - qty) < 0.2:
                    qty = round(total / rate, 2)

                selling_price = mrp if mrp > 0 else round(rate * 1.18, 2)
                tax_amt = round(total * (gst_pct / 100.0), 2)

                items.append({
                    "sl_no": current_sl,
                    "description": desc,
                    "sku": f"SKU-{hsn[-4:] if len(hsn) >= 4 else '1001'}-{current_sl:03d}",
                    "hsn_code": hsn,
                    "category": _infer_category(desc),
                    "quantity": max(1.0, qty),
                    "unit": unit,
                    "rate": max(0.0, rate),
                    "mrp": max(0.0, mrp),
                    "selling_price": max(0.0, selling_price),
                    "gst_rate": f"{gst_pct}%",
                    "tax_amount": tax_amt,
                    "total_amount": max(0.0, total)
                })
                current_sl += 1

    except Exception as e:
        print(f"[OCR Processing Error]: {e}")

    return items, supplier, inv_no, inv_date

def _infer_category(name: str) -> str:
    """Classifies products into Indian retail categories."""
    lower = name.lower()
    if any(k in lower for k in ['oil', 'ghee', 'atta', 'flour', 'salt', 'sugar', 'rice', 'dal', 'pulse', 'biscuit', 'tea', 'coffee', 'masala', 'spice']):
        return 'Groceries / Kirana'
    if any(k in lower for k in ['soap', 'shampoo', 'paste', 'brush', 'cream', 'lotion', 'wash', 'deo', 'perfume', 'sanitizer']):
        return 'Personal Care'
    if any(k in lower for k in ['mouse', 'keyboard', 'speaker', 'cable', 'adapter', 'charger', 'usb', 'headphone', 'battery', 'led']):
        return 'Electronics & Accessories'
    if any(k in lower for k in ['wiper', 'mop', 'scrubber', 'broom', 'cleaner', 'dustbin', 'foil', 'harpic', 'detergent', 'stand', 'bucket']):
        return 'Cleaning & Household'
    if any(k in lower for k in ['tap', 'cock', 'valve', 'pipe', 'fitting', 'sanitary', 'faucet', 'ply', 'screw', 'urinal', 'suit']):
        return 'Sanitary & Hardware'
    return 'General Merchandise'

def generate_product_excel_report(data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
    """
    Creates a production-grade Indian retail stock & product Excel (.xlsx) report.
    Includes full metadata, Sl No sequencing, HSN, Taxable Rates, MRP, GST, and totals.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Products_Stock_Report"
    ws.views.sheetView[0].showGridLines = True

    NAVY = "0F172A"
    BLUE = "2563EB"
    HEADER_FILL = "1E293B"
    ZEBRA_FILL = "F8FAFC"
    TOTAL_FILL = "E2E8F0"
    BORDER_COLOR = "CBD5E1"
    GREEN = "059669"

    thin_border = Border(
        left=Side(style='thin', color=BORDER_COLOR),
        right=Side(style='thin', color=BORDER_COLOR),
        top=Side(style='thin', color=BORDER_COLOR),
        bottom=Side(style='thin', color=BORDER_COLOR)
    )

    # 1. Header Banner
    ws.merge_cells("A1:K1")
    title_cell = ws["A1"]
    title_cell.value = "ShopBill - Product Catalogue & Stock Inventory Report"
    title_cell.font = Font(name="Calibri", size=15, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color=HEADER_FILL, end_color=HEADER_FILL, fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    # 2. Metadata Block
    supplier = data.get("supplier_name", "Supplier Document")
    inv_no = data.get("invoice_no", "N/A")
    inv_date = data.get("invoice_date", datetime.now().strftime("%Y-%m-%d"))
    engine = data.get("engine_used", "PaddleOCR PP-OCRv4 Multi-Page Engine")
    items = data.get("items", [])
    total_qty = sum(item.get("quantity", 0) for item in items)
    total_val = sum(item.get("total_amount", 0.0) for item in items)

    ws["A3"] = "Vendor / Source:"
    ws["B3"] = supplier
    ws["E3"] = "Invoice / Ref No:"
    ws["F3"] = inv_no
    ws["I3"] = "Invoice Date:"
    ws["J3"] = inv_date

    ws["A4"] = "Extraction Engine:"
    ws["B4"] = engine
    ws["E4"] = "Total Listed Items:"
    ws["F4"] = len(items)
    ws["I4"] = "Total Stock Qty:"
    ws["J4"] = total_qty

    for r in range(3, 5):
        ws.row_dimensions[r].height = 20
        for col in ["A", "E", "I"]:
            c = ws[f"{col}{r}"]
            c.font = Font(name="Calibri", size=9, bold=True, color="64748B")
        for col in ["B", "F", "J"]:
            c = ws[f"{col}{r}"]
            c.font = Font(name="Calibri", size=10, bold=True, color=NAVY)

    # 3. Table Column Headers (Row 6)
    headers = [
        ("Sl No.", 8, "center"),
        ("Product Name / Description", 38, "left"),
        ("SKU Code", 16, "center"),
        ("HSN / SAC", 12, "center"),
        ("Category", 22, "left"),
        ("Quantity", 12, "right"),
        ("Unit", 10, "center"),
        ("Purchase Rate (Rs)", 18, "right"),
        ("Retail MRP (Rs)", 16, "right"),
        ("GST Rate", 10, "center"),
        ("Total Amount (Rs)", 18, "right"),
    ]

    header_row = 6
    ws.row_dimensions[header_row].height = 26

    for col_idx, (htext, col_w, align) in enumerate(headers, start=1):
        cell = ws.cell(row=header_row, column=col_idx)
        cell.value = htext
        cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color=BLUE, end_color=BLUE, fill_type="solid")
        cell.alignment = Alignment(horizontal=align, vertical="center", wrap_text=True)
        cell.border = thin_border
        ws.column_dimensions[get_column_letter(col_idx)].width = col_w

    # 4. Data Rows
    current_row = 7
    for idx, item in enumerate(items):
        ws.row_dimensions[current_row].height = 22
        fill_color = ZEBRA_FILL if idx % 2 == 1 else "FFFFFF"
        row_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")

        vals = [
            (idx + 1, "center", "@"),
            (item.get("description", "-"), "left", None),
            (item.get("sku", f"SKU-{idx+1:03d}"), "center", "@"),
            (item.get("hsn_code", "1001"), "center", "@"),
            (item.get("category", "General Retail"), "left", None),
            (item.get("quantity", 1.0), "right", "#,##0.00"),
            (item.get("unit", "PCS"), "center", "@"),
            (item.get("rate", 0.0), "right", "Rs #,##0.00"),
            (item.get("mrp", 0.0), "right", "Rs #,##0.00"),
            (item.get("gst_rate", "18%"), "center", "@"),
            (item.get("total_amount", 0.0), "right", "Rs #,##0.00"),
        ]

        for col_idx, (val, align, num_fmt) in enumerate(vals, start=1):
            cell = ws.cell(row=current_row, column=col_idx)
            cell.value = val
            cell.font = Font(name="Calibri", size=10, color="0F172A")
            cell.fill = row_fill
            cell.alignment = Alignment(horizontal=align, vertical="center")
            cell.border = thin_border
            if num_fmt:
                cell.number_format = num_fmt

        current_row += 1

    # 5. Summary / Grand Total Row
    ws.row_dimensions[current_row].height = 26
    total_fill = PatternFill(start_color=TOTAL_FILL, end_color=TOTAL_FILL, fill_type="solid")

    ws.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=5)
    t_label = ws.cell(row=current_row, column=1)
    t_label.value = f"GRAND TOTAL ({len(items)} Items Listed)"
    t_label.font = Font(name="Calibri", size=10, bold=True, color=NAVY)
    t_label.alignment = Alignment(horizontal="center", vertical="center")

    for c in range(1, 6):
        ws.cell(row=current_row, column=c).fill = total_fill
        ws.cell(row=current_row, column=c).border = thin_border

    # Quantity total
    q_cell = ws.cell(row=current_row, column=6)
    q_cell.value = total_qty
    q_cell.font = Font(name="Calibri", size=10, bold=True, color=NAVY)
    q_cell.fill = total_fill
    q_cell.alignment = Alignment(horizontal="right", vertical="center")
    q_cell.number_format = "#,##0.00"
    q_cell.border = thin_border

    # Unit, Rates, GST empty fillers
    for c in range(7, 11):
        c_cell = ws.cell(row=current_row, column=c)
        c_cell.fill = total_fill
        c_cell.border = thin_border

    # Amount Total
    tot_cell = ws.cell(row=current_row, column=11)
    tot_cell.value = total_val
    tot_cell.font = Font(name="Calibri", size=11, bold=True, color=GREEN)
    tot_cell.fill = total_fill
    tot_cell.alignment = Alignment(horizontal="right", vertical="center")
    tot_cell.number_format = "Rs #,##0.00"
    tot_cell.border = thin_border

    if output_path:
        wb.save(output_path)
        with open(output_path, "rb") as f:
            return f.read()
    else:
        out_stream = io.BytesIO()
        wb.save(out_stream)
        return out_stream.getvalue()

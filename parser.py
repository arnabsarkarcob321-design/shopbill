import pdfplumber
import re
from typing import List, Dict, Any

def parse_invoice_pdf(pdf_path: str) -> Dict[str, Any]:
    extracted_data = {
        "supplier_name": "",
        "invoice_no": "",
        "items": []
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        first_page = pdf.pages[0]
        text = first_page.extract_text() or ""
        
        # استخراج اسم المورد ورقم الفاتورة
        if "OM GALAXY" in text.upper():
            extracted_data["supplier_name"] = "OM GALAXY LIMITED"
        elif "MAA SALES" in text.upper():
            extracted_data["supplier_name"] = "MAA SALES"
            
        inv_match = re.search(r'Invoice\s*No[.:\s]*([A-Za-z0-9/-]+)', text, re.IGNORECASE)
        if inv_match:
            extracted_data["invoice_no"] = inv_match.group(1)
            
        # استخراج الجداول
        tables = first_page.extract_tables()
        for table in tables:
            for row in table:
                # تجاوز أعمدة الهيدر
                if not row or any("description" in str(cell).lower() for cell in row if cell):
                    continue
                
                # تجميع البيانات حسب المكونات الأساسية (HSN, Qty, Rate, Tax)
                if len(row) >= 5 and row[0] and str(row[0]).strip().isdigit():
                    try:
                        item = {
                            "hsnCode": str(row[1]).strip() if len(row) > 1 else "",
                            "description": str(row[2]).replace('\n', ' ').strip() if len(row) > 2 else "",
                            "quantity": float(re.sub(r'[^\d.]', '', str(row[3]))) if len(row) > 3 else 0,
                            "rateTaxable": float(re.sub(r'[^\d.]', '', str(row[4]))) if len(row) > 4 else 0,
                            "totalAmount": float(re.sub(r'[^\d.]', '', str(row[-1]))) if len(row) > 0 else 0
                        }
                        extracted_data["items"].append(item)
                    except ValueError:
                        continue

    return extracted_data

if __name__ == "__main__":
    # تجربة التشغيل على فاتورة نموذجية
    import sys
    if len(sys.argv) > 1:
        res = parse_invoice_pdf(sys.argv[1])
        print("Extracted Data:", res)
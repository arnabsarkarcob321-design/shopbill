import os
import shutil
from datetime import datetime
from typing import Dict, Any, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure local PaddleX cache inside workspace
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, ".paddlex")
os.makedirs(CACHE_DIR, exist_ok=True)
os.environ["PADDLE_PDX_CACHE_HOME"] = CACHE_DIR

from paddleocr_service import parse_product_pdf_with_paddle, generate_product_excel_report

app = FastAPI(
    title="ShopBill PaddleOCR Product Engine",
    description="Extracts products, prices, and stock data from PDFs via PaddleOCR and produces Excel reports.",
    version="2.0.0"
)

# Enable CORS for Vite frontend (http://localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(BASE_DIR, "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ExcelExportRequest(BaseModel):
    supplier_name: str = "Vendor Document"
    invoice_no: str = ""
    invoice_date: str = ""
    items: List[Dict[str, Any]]

@app.get("/")
def read_root():
    return {
        "status": "ShopBill PaddleOCR Product Engine Active",
        "endpoints": [
            "/api/products/pdf-to-excel",
            "/api/products/ocr-preview",
            "/api/products/download-excel"
        ]
    }

@app.post("/api/products/pdf-to-excel", summary="Upload Product PDF & Directly Download Excel Report")
async def upload_pdf_to_excel(file: UploadFile = File(...)):
    """Upload product/invoice PDF and receive a professionally styled Excel spreadsheet report."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")

    file_path = os.path.join(UPLOAD_DIR, f"upload_{Date_str()}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process with PaddleOCR service
        data = parse_product_pdf_with_paddle(file_path)
        excel_bytes = generate_product_excel_report(data)

        clean_name = os.path.splitext(file.filename)[0].replace(" ", "_")
        today = datetime.now().strftime("%Y%m%d")
        download_filename = f"Product_Report_{clean_name}_{today}.xlsx"

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{download_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        print(f"[Error in pdf-to-excel]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

@app.post("/api/products/ocr-preview", summary="Upload Product PDF & Preview Extracted Items")
async def preview_extracted_products(file: UploadFile = File(...)):
    """Upload product PDF and return structured JSON preview with all extracted line items."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")

    file_path = os.path.join(UPLOAD_DIR, f"preview_{Date_str()}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        data = parse_product_pdf_with_paddle(file_path)
        return {
            "success": True,
            "filename": file.filename,
            **data
        }
    except Exception as e:
        print(f"[Error in ocr-preview]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

@app.post("/api/products/download-excel", summary="Generate Excel Report from Items JSON")
async def download_excel_from_items(payload: ExcelExportRequest):
    """Generates an Excel spreadsheet from JSON items."""
    try:
        data = {
            "supplier_name": payload.supplier_name,
            "invoice_no": payload.invoice_no,
            "invoice_date": payload.invoice_date or datetime.now().strftime("%Y-%m-%d"),
            "engine_used": "PaddlePaddle/PaddleOCR",
            "items": payload.items,
            "total_amount": sum(item.get("total_amount", 0.0) for item in payload.items)
        }
        excel_bytes = generate_product_excel_report(data)
        today = datetime.now().strftime("%Y%m%d")
        download_filename = f"Product_Stock_Report_{today}.xlsx"

        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{download_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def Date_str():
    return datetime.now().strftime("%Y%m%d_%H%M%S")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

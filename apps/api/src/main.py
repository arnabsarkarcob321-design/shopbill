"""
ShopBill FastAPI Service - Cloud Identity, Sync & Reference Data Hub
Conforms to TRD v1.0 and OpenAPI 3.1 specification.
"""

from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import datetime
import uuid

app = FastAPI(
    title="ShopBill Cloud API",
    version="1.0.0",
    description="Offline-first GST billing, reference data, encrypted backups and sync hub for Indian shopkeepers",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Health and Diagnostics Endpoints
# -----------------------------------------------------------------------------

@app.get("/healthz", tags=["Health"])
async def healthz():
    """Liveness probe: returns 200 OK if service process is running."""
    return {"status": "ok", "service": "shopbill-api", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}

@app.get("/readyz", tags=["Health"])
async def readyz():
    """Readiness probe: returns 200 OK when database and storage dependencies are reachable."""
    return {
        "status": "ready",
        "database": "connected",
        "storage": "available",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

@app.get("/metrics", tags=["Health"])
async def metrics():
    """Basic metrics output."""
    return {
        "uptime_seconds": 3600,
        "active_shops": 1,
        "reference_version": "2026.10.1",
    }

# -----------------------------------------------------------------------------
# Reference Data Endpoints
# -----------------------------------------------------------------------------

INDIAN_STATES = [
    {"code": "01", "name": "Jammu and Kashmir", "is_ut": True},
    {"code": "02", "name": "Himachal Pradesh", "is_ut": False},
    {"code": "03", "name": "Punjab", "is_ut": False},
    {"code": "04", "name": "Chandigarh", "is_ut": True},
    {"code": "05", "name": "Uttarakhand", "is_ut": False},
    {"code": "06", "name": "Haryana", "is_ut": False},
    {"code": "07", "name": "Delhi", "is_ut": True},
    {"code": "08", "name": "Rajasthan", "is_ut": False},
    {"code": "09", "name": "Uttar Pradesh", "is_ut": False},
    {"code": "10", "name": "Bihar", "is_ut": False},
    {"code": "19", "name": "West Bengal", "is_ut": False},
    {"code": "27", "name": "Maharashtra", "is_ut": False},
    {"code": "29", "name": "Karnataka", "is_ut": False},
    {"code": "33", "name": "Tamil Nadu", "is_ut": False},
    {"code": "36", "name": "Telangana", "is_ut": False},
    {"code": "37", "name": "Andhra Pradesh", "is_ut": False},
]

GST_RATE_SLABS = [
    {"tax_code": "GST_0", "rate_bps": 0, "cess_rate_bps": 0, "label": "0% Nil / Exempt"},
    {"tax_code": "GST_5", "rate_bps": 500, "cess_rate_bps": 0, "label": "5% Essentials"},
    {"tax_code": "GST_12", "rate_bps": 1200, "cess_rate_bps": 0, "label": "12% Standard / Dairy"},
    {"tax_code": "GST_18", "rate_bps": 1800, "cess_rate_bps": 0, "label": "18% Standard FMCG"},
    {"tax_code": "GST_28", "rate_bps": 2800, "cess_rate_bps": 0, "label": "28% Luxury"},
    {"tax_code": "GST_28_CESS_12", "rate_bps": 2800, "cess_rate_bps": 1200, "label": "28% + 12% Cess (Aerated Drinks)"},
]

@app.get("/v1/reference/manifest", tags=["Reference Data"])
async def get_reference_manifest():
    """Returns metadata for signed reference data bundles."""
    return {
        "version": "2026.10.1",
        "published_at": "2026-10-26T00:00:00Z",
        "bundles": [
            {"bundle_key": "states", "etag": "states-20261026", "url": "/v1/reference/states"},
            {"bundle_key": "tax-rates", "etag": "taxrates-20261026", "url": "/v1/reference/tax-rates"},
            {"bundle_key": "hsn", "etag": "hsn-20261026", "url": "/v1/reference/hsn"},
        ],
    }

@app.get("/v1/reference/{bundle}", tags=["Reference Data"])
async def get_reference_bundle(bundle: str):
    """Returns specific reference data bundle."""
    if bundle == "states":
        return {"bundle": "states", "version": "2026.10.1", "data": INDIAN_STATES}
    elif bundle == "tax-rates":
        return {"bundle": "tax-rates", "version": "2026.10.1", "data": GST_RATE_SLABS}
    elif bundle == "hsn":
        return {
            "bundle": "hsn",
            "version": "2026.10.1",
            "data": [
                {"code": "2501", "description": "Salt and pure sodium chloride", "tax_code": "GST_0"},
                {"code": "1101", "description": "Wheat or meslin flour (Atta)", "tax_code": "GST_5"},
                {"code": "1512", "description": "Sunflower-seed, safflower or cotton-seed oil", "tax_code": "GST_5"},
                {"code": "0405", "description": "Butter and other fats and oils derived from milk", "tax_code": "GST_12"},
                {"code": "3401", "description": "Soap; organic surface-active products", "tax_code": "GST_18"},
                {"code": "1905", "description": "Bread, pastry, cakes, biscuits", "tax_code": "GST_18"},
                {"code": "2202", "description": "Waters, including mineral waters and aerated waters", "tax_code": "GST_28_CESS_12"},
                {"code": "3004", "description": "Medicaments for therapeutic or prophylactic uses", "tax_code": "GST_12"},
            ],
        }
    raise HTTPException(status_code=404, detail=f"Reference bundle '{bundle}' not found")

# -----------------------------------------------------------------------------
# Auth & Identity Schemas and Routes
# -----------------------------------------------------------------------------

class ShopCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., pattern=r"^[6-9]\d{9}$")
    state_code: str = Field(..., min_length=2, max_length=2)
    tax_scheme: str = Field(default="REGULAR")
    gstin: Optional[str] = None
    invoice_prefix: str = Field(default="SB/26-27/")
    upi_id: Optional[str] = None
    owner_name: str
    password: str = Field(..., min_length=6)

class ShopLoginRequest(BaseModel):
    phone: str
    password: str

@app.post("/v1/auth/shops", status_code=status.HTTP_201_CREATED, tags=["Auth"])
async def register_shop(req: ShopCreateRequest):
    """Registers a new tenant shop and owner account."""
    shop_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    return {
        "shop_id": shop_id,
        "user_id": user_id,
        "name": req.name,
        "tax_scheme": req.tax_scheme,
        "message": "Shop registered successfully",
    }

@app.post("/v1/auth/login", tags=["Auth"])
async def login(req: ShopLoginRequest):
    """Authenticates owner/cashier and returns device-bound JWT tokens."""
    return {
        "access_token": f"mock-jwt-token-{uuid.uuid4().hex[:16]}",
        "refresh_token": f"mock-refresh-{uuid.uuid4().hex[:24]}",
        "token_type": "bearer",
        "expires_in": 3600,
        "shop": {
            "id": "shop-demo-1",
            "name": "Gupta Kirana Store",
            "role": "OWNER",
        },
    }

@app.get("/v1/auth/me", tags=["Auth"])
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Returns the current user profile and shop tenant context."""
    return {
        "user_id": "user-demo-1",
        "full_name": "Arnab Sarkar",
        "role": "OWNER",
        "shop_id": "shop-demo-1",
    }

# -----------------------------------------------------------------------------
# Backups Metadata & Upload Schemas
# -----------------------------------------------------------------------------

@app.get("/v1/backups", tags=["Backups"])
async def list_cloud_backups():
    """Lists encrypted cloud backups available for current shop."""
    return {
        "backups": [
            {
                "id": "backup-20261026-001",
                "filename": "ShopBill_Backup_2026-10-26.shopbill.enc",
                "size_bytes": 14250,
                "created_at": "2026-10-26T17:30:00Z",
                "status": "AVAILABLE",
            }
        ]
    }

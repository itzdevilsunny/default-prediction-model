import os
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client

# ─── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Default Prediction Model API",
    description="Credit risk prediction backend — powered by FastAPI + Supabase.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Supabase Client ──────────────────────────────────────────────────────────

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "https://bjnljcijynrweunmvkow.supabase.co")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "sb_publishable_pGMsUsYA55MlI3yEc29xtg_uvPUGfuT")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    loan_id: str
    analyst_name: str
    risk_override: str  # Low | Medium | High
    notes: str
    action: str         # "approve" | "escalate" | "review"

class AuditResponse(BaseModel):
    success: bool
    audit_id: str
    message: str
    timestamp: str

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "Default Prediction Model API",
        "version": "2.0.0",
        "database": "Supabase",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@app.get("/api/portfolio/summary")
def get_portfolio_summary():
    """Returns portfolio-level KPIs computed from Supabase loans table."""
    try:
        result = supabase.table("loans").select("amount,default_probability_12m,risk_tier").execute()
        rows = result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")

    if not rows:
        return {"total_exposure": 0, "total_loans": 0, "average_default_probability": 0,
                "high_risk_count": 0, "medium_risk_count": 0, "low_risk_count": 0,
                "model_accuracy": 0.912, "model_auc": 0.942, "model_f1": 0.885,
                "structured_records": 25840, "unstructured_records": 19420}

    total_exposure = sum(r["amount"] for r in rows)
    avg_pd = sum(r["default_probability_12m"] for r in rows) / len(rows)

    return {
        "total_exposure": total_exposure,
        "total_loans": len(rows),
        "average_default_probability": round(avg_pd, 4),
        "high_risk_count": sum(1 for r in rows if r["risk_tier"] == "High"),
        "medium_risk_count": sum(1 for r in rows if r["risk_tier"] == "Medium"),
        "low_risk_count": sum(1 for r in rows if r["risk_tier"] == "Low"),
        "model_accuracy": 0.912,
        "model_auc": 0.942,
        "model_f1": 0.885,
        "structured_records": 25840,
        "unstructured_records": 19420,
    }

@app.get("/api/loans")
def get_loans(
    risk_tier: Optional[str] = None,
    loan_type: Optional[str] = None,
    borrower_segment: Optional[str] = None,
    search: Optional[str] = None,
):
    """Returns filtered list of all loans from Supabase."""
    try:
        query = supabase.table("loans").select("*").order("default_probability_12m", desc=True)

        if risk_tier and risk_tier != "ALL":
            query = query.eq("risk_tier", risk_tier)
        if loan_type and loan_type != "ALL":
            query = query.eq("loan_type", loan_type)
        if borrower_segment and borrower_segment != "ALL":
            query = query.eq("borrower_segment", borrower_segment)

        result = query.execute()
        loans = result.data or []

        # Client-side search filter (Supabase free tier has limited ilike chaining)
        if search:
            q = search.lower()
            loans = [l for l in loans if q in l.get("borrower_name", "").lower()
                                      or q in l.get("id", "").lower()]

        return {"loans": loans, "total": len(loans)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")

@app.get("/api/loans/{loan_id}")
def get_loan(loan_id: str):
    """Returns full details for a specific loan from Supabase."""
    try:
        result = supabase.table("loans").select("*").eq("id", loan_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found.")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")

@app.post("/api/loans/{loan_id}/audit", response_model=AuditResponse)
def submit_audit(loan_id: str, entry: AuditEntry):
    """
    Submit an underwriter audit override.
    1. Updates risk_tier in loans table.
    2. Inserts an audit_logs record.
    Both are persisted in Supabase.
    """
    try:
        # 1. Update risk tier
        supabase.table("loans").update({
            "risk_tier": entry.risk_override,
            "last_updated": datetime.date.today().isoformat()
        }).eq("id", loan_id).execute()

        # 2. Insert audit log
        audit_record = {
            "loan_id": loan_id,
            "analyst_name": entry.analyst_name,
            "risk_override": entry.risk_override,
            "notes": entry.notes,
            "action": entry.action,
        }
        result = supabase.table("audit_logs").insert(audit_record).execute()
        inserted = result.data[0] if result.data else {}
        audit_id = str(inserted.get("id", "AUDIT-" + str(datetime.datetime.utcnow().timestamp())))
        timestamp = inserted.get("created_at", datetime.datetime.utcnow().isoformat())

        return AuditResponse(
            success=True,
            audit_id=audit_id,
            message=f"Audit logged for Loan {loan_id}. Risk overridden to {entry.risk_override}.",
            timestamp=timestamp,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")

@app.get("/api/audits")
def get_audit_logs(loan_id: Optional[str] = None):
    """Returns audit logs from Supabase, optionally filtered by loan."""
    try:
        query = supabase.table("audit_logs").select("*").order("created_at", desc=True)
        if loan_id:
            query = query.eq("loan_id", loan_id)
        result = query.execute()
        logs = result.data or []
        return {"audits": logs, "total": len(logs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase error: {str(e)}")

@app.get("/api/model/metrics")
def get_model_metrics():
    """Returns model performance metrics (static for now, will be dynamic post-training)."""
    return {
        "accuracy": 0.912,
        "auc_roc": 0.942,
        "f1_score": 0.885,
        "precision": 0.891,
        "recall": 0.879,
        "accuracy_by_stage": [
            {"stage": "Baseline (Structured Only)", "accuracy": 18.0},
            {"stage": "+ Sentiment from Notes", "accuracy": 42.0},
            {"stage": "+ Call Transcripts", "accuracy": 68.0},
            {"stage": "+ Macro News Index", "accuracy": 79.0},
            {"stage": "Hybrid Fusion Model", "accuracy": 91.2},
        ],
        "feature_importance": [
            {"feature": "Loan Officer Notes Sentiment", "importance": 24},
            {"feature": "Missed Payments (12M)", "importance": 19},
            {"feature": "FICO Credit Score", "importance": 15},
            {"feature": "DTI Ratio", "importance": 14},
            {"feature": "Sector News Sentiment Index", "importance": 12},
            {"feature": "Call Transcripts NLP", "importance": 10},
            {"feature": "Loan Term & Amount", "importance": 6},
        ],
        "confusion_matrix": {
            "true_negative": 24110,
            "false_positive": 1130,
            "false_negative": 690,
            "true_positive": 4180,
        },
    }

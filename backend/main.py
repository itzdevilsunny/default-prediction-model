from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import datetime

app = FastAPI(
    title="Default Prediction Model API",
    description="Credit risk prediction backend for the Default Prediction Model dashboard.",
    version="1.0.0"
)

# Allow CORS from all origins (update with your Vercel frontend URL once deployed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Mock Loan Data ──────────────────────────────────────────────────────────

LOANS_DB = [
    {
        "id": "LN-2026-041", "borrower_name": "Zeta Manufacturing LLC",
        "loan_type": "SME", "borrower_segment": "SME", "amount": 650000,
        "interest_rate": 8.5, "term_months": 60, "start_date": "2024-03-15",
        "fico_score": 590, "dti": 48.5, "missed_payments_12m": 3,
        "officer_notes_sentiment": "Negative",
        "officer_notes_summary": "Borrower missed meetings. Declining operating cash flow. Inventory turnover slowed 40%. Partnership disputes.",
        "sector_news_sentiment": "Negative",
        "sector_news_summary": "Industrial supply chains face 15% tariff increases; manufacturing sector contracts third consecutive quarter.",
        "communication_sentiment": "Negative",
        "default_probability_12m": 0.912, "risk_tier": "High",
        "last_updated": "2026-07-01",
        "ai_risk_summary": "High default risk driven by acute operating cash flow compression, supply chain headwinds, and high debt service."
    },
    {
        "id": "LN-2026-078", "borrower_name": "Sarah Jenkins",
        "loan_type": "Mortgage", "borrower_segment": "Retail", "amount": 420000,
        "interest_rate": 6.2, "term_months": 360, "start_date": "2022-11-10",
        "fico_score": 785, "dti": 28.0, "missed_payments_12m": 0, "ltv": 72.0,
        "officer_notes_sentiment": "Positive",
        "officer_notes_summary": "Excellent communication. Stable employment as senior software engineer at Tier 1 tech firm.",
        "sector_news_sentiment": "Positive",
        "sector_news_summary": "Local real estate market shows steady 4.5% annual appreciation.",
        "communication_sentiment": "Positive",
        "default_probability_12m": 0.018, "risk_tier": "Low",
        "last_updated": "2026-07-02",
        "ai_risk_summary": "Extremely low credit risk. Strong repayment history and highly stable primary income source."
    },
    {
        "id": "LN-2026-102", "borrower_name": "Apex Tech Solutions Inc.",
        "loan_type": "Business", "borrower_segment": "Corporate", "amount": 1200000,
        "interest_rate": 7.8, "term_months": 48, "start_date": "2025-01-05",
        "fico_score": 680, "dti": 44.2, "missed_payments_12m": 1,
        "officer_notes_sentiment": "Neutral",
        "officer_notes_summary": "Revenue grew 15% y-o-y, but margin compressed from 18% to 12%. Series B expected in 90 days.",
        "sector_news_sentiment": "Positive",
        "sector_news_summary": "Enterprise SaaS sector spending projects 18% growth over next 12 months.",
        "communication_sentiment": "Positive",
        "default_probability_12m": 0.425, "risk_tier": "Medium",
        "last_updated": "2026-06-28",
        "ai_risk_summary": "Moderate risk. High leverage balanced by growing customer base and strong sector tailwinds."
    },
    {
        "id": "LN-2026-119", "borrower_name": "Marcus Vance",
        "loan_type": "Personal", "borrower_segment": "Retail", "amount": 35000,
        "interest_rate": 14.5, "term_months": 36, "start_date": "2025-06-20",
        "fico_score": 605, "dti": 52.0, "missed_payments_12m": 2,
        "officer_notes_sentiment": "Negative",
        "officer_notes_summary": "Temporary job loss followed by contract work. Credit card utilization increased from 35% to 88% in 6 months.",
        "sector_news_sentiment": "Neutral",
        "sector_news_summary": "Retail sales index flat. Gig economy employment index shows 4% growth.",
        "communication_sentiment": "Negative",
        "default_probability_12m": 0.741, "risk_tier": "High",
        "last_updated": "2026-07-02",
        "ai_risk_summary": "High default risk driven by high debt utilization and employment transition."
    },
    {
        "id": "LN-2026-003", "borrower_name": "Global Logistics Corp",
        "loan_type": "Business", "borrower_segment": "Corporate", "amount": 1500000,
        "interest_rate": 6.9, "term_months": 120, "start_date": "2021-05-10",
        "fico_score": 740, "dti": 31.5, "missed_payments_12m": 0,
        "officer_notes_sentiment": "Positive",
        "officer_notes_summary": "Solid balance sheet. 2.1x current ratio. Successfully renewed long-term contracts.",
        "sector_news_sentiment": "Neutral",
        "sector_news_summary": "Global freight index fluctuates within normal bounds.",
        "communication_sentiment": "Positive",
        "default_probability_12m": 0.068, "risk_tier": "Low",
        "last_updated": "2026-06-30",
        "ai_risk_summary": "Very low risk. Strong corporate liquidity and locked-in contract revenues."
    },
    {
        "id": "LN-2026-204", "borrower_name": "Green Horizon Agriculture",
        "loan_type": "SME", "borrower_segment": "SME", "amount": 450000,
        "interest_rate": 8.9, "term_months": 72, "start_date": "2023-10-12",
        "fico_score": 630, "dti": 47.0, "missed_payments_12m": 2,
        "officer_notes_sentiment": "Negative",
        "officer_notes_summary": "Crop yields fell 25% below forecast. Insurance payout covers only half of operating losses.",
        "sector_news_sentiment": "Negative",
        "sector_news_summary": "Extreme weather patterns trigger agricultural yield warnings.",
        "communication_sentiment": "Neutral",
        "default_probability_12m": 0.814, "risk_tier": "High",
        "last_updated": "2026-07-01",
        "ai_risk_summary": "High default risk. Crop losses drained cash reserves amid adverse weather forecasts."
    },
    {
        "id": "LN-2026-056", "borrower_name": "Dr. Arthur Pendelton",
        "loan_type": "Personal", "borrower_segment": "HNW", "amount": 150000,
        "interest_rate": 7.2, "term_months": 60, "start_date": "2025-02-18",
        "fico_score": 760, "dti": 22.5, "missed_payments_12m": 0,
        "officer_notes_sentiment": "Positive",
        "officer_notes_summary": "Lead surgeon at County General. Stable, high salary. Excellent debt management.",
        "sector_news_sentiment": "Positive",
        "sector_news_summary": "Medical services sector showing strong pricing power.",
        "communication_sentiment": "Positive",
        "default_probability_12m": 0.024, "risk_tier": "Low",
        "last_updated": "2026-06-25",
        "ai_risk_summary": "Minimal risk. High, stable, non-cyclical professional income with low debt load."
    },
    {
        "id": "LN-2026-099", "borrower_name": "Nova Restaurant Group",
        "loan_type": "SME", "borrower_segment": "SME", "amount": 320000,
        "interest_rate": 9.4, "term_months": 48, "start_date": "2024-07-22",
        "fico_score": 660, "dti": 41.0, "missed_payments_12m": 1,
        "officer_notes_sentiment": "Neutral",
        "officer_notes_summary": "3rd location delayed by permitting issues, creating 3-month cash flow lag.",
        "sector_news_sentiment": "Negative",
        "sector_news_summary": "Hospitality sector reports 8% increase in labor costs.",
        "communication_sentiment": "Positive",
        "default_probability_12m": 0.380, "risk_tier": "Medium",
        "last_updated": "2026-07-02",
        "ai_risk_summary": "Moderate risk. Expansion friction caused temporary cash depletion, but core operations viable."
    },
    {
        "id": "LN-2026-112", "borrower_name": "Elite Freight Logistics",
        "loan_type": "SME", "borrower_segment": "SME", "amount": 280000,
        "interest_rate": 8.2, "term_months": 36, "start_date": "2025-09-01",
        "fico_score": 620, "dti": 49.0, "missed_payments_12m": 2,
        "officer_notes_sentiment": "Negative",
        "officer_notes_summary": "Major corporate client representing 35% of revenue announced contract termination.",
        "sector_news_sentiment": "Neutral",
        "sector_news_summary": "Regional trucking volume steady, but fleet insurance rates increased 12%.",
        "communication_sentiment": "Neutral",
        "default_probability_12m": 0.785, "risk_tier": "High",
        "last_updated": "2026-07-01",
        "ai_risk_summary": "High credit risk. Imminent 35% revenue drop will severely stress cash flows."
    },
    {
        "id": "LN-2026-150", "borrower_name": "Diana Prince",
        "loan_type": "Mortgage", "borrower_segment": "HNW", "amount": 850000,
        "interest_rate": 5.8, "term_months": 360, "start_date": "2023-08-01",
        "fico_score": 710, "dti": 36.5, "missed_payments_12m": 0, "ltv": 65.0,
        "officer_notes_sentiment": "Neutral",
        "officer_notes_summary": "Income from real estate commissions and dividends. Seasonal variance but high net worth.",
        "sector_news_sentiment": "Neutral",
        "sector_news_summary": "Luxury residential market volume decreased 8%, median prices resilient.",
        "communication_sentiment": "Positive",
        "default_probability_12m": 0.152, "risk_tier": "Low",
        "last_updated": "2026-07-02",
        "ai_risk_summary": "Low credit risk. Variable income fully backed by conservative LTV ratio and liquid assets."
    },
]

# In-memory audit logs store (in production, this goes to Supabase)
AUDIT_LOGS = []

# ─── Pydantic Models ─────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    loan_id: str
    analyst_name: str
    risk_override: str  # Low | Medium | High
    notes: str
    action: str  # "approve" | "escalate" | "review"

class AuditResponse(BaseModel):
    success: bool
    audit_id: str
    message: str
    timestamp: str

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "Default Prediction Model API",
        "version": "1.0.0",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@app.get("/api/portfolio/summary")
def get_portfolio_summary():
    """Returns high-level KPIs for the entire loan portfolio."""
    total_exposure = sum(l["amount"] for l in LOANS_DB)
    avg_pd = sum(l["default_probability_12m"] for l in LOANS_DB) / len(LOANS_DB)
    high = sum(1 for l in LOANS_DB if l["risk_tier"] == "High")
    medium = sum(1 for l in LOANS_DB if l["risk_tier"] == "Medium")
    low = sum(1 for l in LOANS_DB if l["risk_tier"] == "Low")
    return {
        "total_exposure": total_exposure,
        "total_loans": len(LOANS_DB),
        "average_default_probability": round(avg_pd, 4),
        "high_risk_count": high,
        "medium_risk_count": medium,
        "low_risk_count": low,
        "model_accuracy": 0.912,
        "model_auc": 0.942,
        "model_f1": 0.885,
        "structured_records": 25840,
        "unstructured_records": 19420
    }

@app.get("/api/loans")
def get_loans(
    risk_tier: Optional[str] = None,
    loan_type: Optional[str] = None,
    borrower_segment: Optional[str] = None,
    search: Optional[str] = None
):
    """Returns filtered list of all loans in the portfolio."""
    results = LOANS_DB.copy()

    if risk_tier and risk_tier != "ALL":
        results = [l for l in results if l["risk_tier"] == risk_tier]

    if loan_type and loan_type != "ALL":
        results = [l for l in results if l["loan_type"] == loan_type]

    if borrower_segment and borrower_segment != "ALL":
        results = [l for l in results if l["borrower_segment"] == borrower_segment]

    if search:
        q = search.lower()
        results = [l for l in results if q in l["borrower_name"].lower() or q in l["id"].lower()]

    return {"loans": results, "total": len(results)}

@app.get("/api/loans/{loan_id}")
def get_loan(loan_id: str):
    """Returns full details for a specific loan including AI risk summary."""
    loan = next((l for l in LOANS_DB if l["id"] == loan_id), None)
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found.")
    return loan

@app.post("/api/loans/{loan_id}/audit", response_model=AuditResponse)
def submit_audit(loan_id: str, entry: AuditEntry):
    """
    Submit an underwriter audit override for a loan.
    In production this will write to Supabase.
    """
    loan = next((l for l in LOANS_DB if l["id"] == loan_id), None)
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found.")

    # Update risk tier in memory
    loan["risk_tier"] = entry.risk_override

    audit_id = f"AUDIT-{loan_id}-{int(datetime.datetime.utcnow().timestamp())}"
    audit_record = {
        "audit_id": audit_id,
        "loan_id": loan_id,
        "analyst_name": entry.analyst_name,
        "risk_override": entry.risk_override,
        "notes": entry.notes,
        "action": entry.action,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    AUDIT_LOGS.append(audit_record)

    return AuditResponse(
        success=True,
        audit_id=audit_id,
        message=f"Audit logged successfully for {loan['borrower_name']}. Risk overridden to {entry.risk_override}.",
        timestamp=audit_record["timestamp"]
    )

@app.get("/api/audits")
def get_audit_logs(loan_id: Optional[str] = None):
    """Returns all underwriter audit logs, optionally filtered by loan."""
    logs = AUDIT_LOGS.copy()
    if loan_id:
        logs = [l for l in logs if l["loan_id"] == loan_id]
    return {"audits": logs, "total": len(logs)}

@app.get("/api/model/metrics")
def get_model_metrics():
    """Returns model performance metrics for the monitoring dashboard."""
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
            {"stage": "Hybrid Fusion Model", "accuracy": 91.2}
        ],
        "feature_importance": [
            {"feature": "Loan Officer Notes Sentiment", "importance": 24},
            {"feature": "Missed Payments (12M)", "importance": 19},
            {"feature": "FICO Credit Score", "importance": 15},
            {"feature": "DTI Ratio", "importance": 14},
            {"feature": "Sector News Sentiment Index", "importance": 12},
            {"feature": "Call Transcripts NLP", "importance": 10},
            {"feature": "Loan Term & Amount", "importance": 6}
        ],
        "confusion_matrix": {
            "true_negative": 24110,
            "false_positive": 1130,
            "false_negative": 690,
            "true_positive": 4180
        }
    }

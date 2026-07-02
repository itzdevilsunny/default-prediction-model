# Default Prediction Model — FastAPI Backend

A credit risk prediction API built with **FastAPI** that powers the Default Prediction Model dashboard.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/portfolio/summary` | Portfolio-level KPIs |
| GET | `/api/loans` | List all loans (supports filtering) |
| GET | `/api/loans/{loan_id}` | Get specific loan details |
| POST | `/api/loans/{loan_id}/audit` | Submit underwriter audit override |
| GET | `/api/audits` | Get all audit logs |
| GET | `/api/model/metrics` | Model performance metrics |

## Local Development

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

## Deployment (Render)

- **Root Directory**: `backend`
- **Runtime**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

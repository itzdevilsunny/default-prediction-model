import os
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bjnljcijynrweunmvkow.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_pGMsUsYA55MlI3yEc29xtg_uvPUGfuT")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")

# Feature columns used for model
FEATURES = [
    "fico_score", "dti", "missed_payments_12m", "amount", "term_months", "interest_rate",
    "notes_sentiment_val", "news_sentiment_val", "comm_sentiment_val"
]

SENTIMENT_MAP = {
    "Positive": 1,
    "Neutral": 0,
    "Negative": -1
}

class DefaultPredictionEngine:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.feature_means = None
        self.feature_stds = None

    def preprocess_df(self, df: pd.DataFrame) -> pd.DataFrame:
        """Converts raw database fields to numerical features."""
        processed = df.copy()
        
        # Map categorical sentiments to numeric values
        processed["notes_sentiment_val"] = processed["officer_notes_sentiment"].map(SENTIMENT_MAP).fillna(0)
        processed["news_sentiment_val"] = processed["sector_news_sentiment"].map(SENTIMENT_MAP).fillna(0)
        processed["comm_sentiment_val"] = processed["communication_sentiment"].map(SENTIMENT_MAP).fillna(0)
        
        # Select numeric values for ML
        processed["fico_score"] = pd.to_numeric(processed["fico_score"])
        processed["dti"] = pd.to_numeric(processed["dti"])
        processed["missed_payments_12m"] = pd.to_numeric(processed["missed_payments_12m"])
        processed["amount"] = pd.to_numeric(processed["amount"])
        processed["term_months"] = pd.to_numeric(processed["term_months"])
        processed["interest_rate"] = pd.to_numeric(processed["interest_rate"])
        
        return processed[FEATURES]

    def train(self, loans_data: list):
        """Trains the model on historical resolved loans and saves the weights."""
        if not loans_data:
            print("[ML Engine] No training data available.")
            return False

        df = pd.DataFrame(loans_data)
        
        # Filter only resolved loans (actual_default must be 0 or 1)
        train_df = df[df["actual_default"].notnull()].copy()
        if len(train_df) < 5:
            print("[ML Engine] Insufficient resolved loans to train model (< 5).")
            return False

        X = self.preprocess_df(train_df)
        y = train_df["actual_default"].astype(int).values

        # Standardize features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train Logistic Regression
        self.model = LogisticRegression(C=1.0, max_iter=1000)
        self.model.fit(X_scaled, y)

        # Store feature stats for SHAP calculation
        self.feature_means = self.scaler.mean_
        self.feature_stds = self.scaler.scale_

        # Save model checkpoint
        joblib.dump({
            "model": self.model,
            "scaler": self.scaler,
            "feature_means": self.feature_means,
            "feature_stds": self.feature_stds
        }, MODEL_PATH)

        print(f"[ML Engine] Model trained successfully on {len(train_df)} samples. Features: {FEATURES}")
        return True

    def load(self):
        """Loads model checkpoint from disk."""
        if os.path.exists(MODEL_PATH):
            try:
                data = joblib.load(MODEL_PATH)
                self.model = data["model"]
                self.scaler = data["scaler"]
                self.feature_means = data["feature_means"]
                self.feature_stds = data["feature_stds"]
                print("[ML Engine] Model loaded successfully from checkpoint.")
                return True
            except Exception as e:
                print(f"[ML Engine] Error loading model checkpoint: {str(e)}")
        return False

    def predict(self, loan: dict) -> dict:
        """
        Runs model prediction on a single loan.
        Calculates default probability, risk tier, and SHAP explanations.
        """
        if self.model is None:
            # Fallback score if model is not trained/loaded
            prob = 0.35
            shap_explanations = []
            risk_tier = "Medium"
        else:
            # Format single sample as df
            df = pd.DataFrame([loan])
            X = self.preprocess_df(df)
            X_scaled = self.scaler.transform(X)

            # Predict probability
            prob = self.model.predict_proba(X_scaled)[0][1]
            prob = round(float(prob), 4)

            # Map to risk tier
            if prob < 0.15:
                risk_tier = "Low"
            elif prob < 0.60:
                risk_tier = "Medium"
            else:
                risk_tier = "High"

            # Compute SHAP-like contributions:
            # contribution_i = coef_i * scaled_value_i
            coefs = self.model.coef_[0]
            scaled_vals = X_scaled[0]
            
            raw_contributions = coefs * scaled_vals
            
            # Translate technical features to readable names
            name_map = {
                "fico_score": "FICO Credit Score",
                "dti": "DTI Ratio",
                "missed_payments_12m": "Missed Payments (12M)",
                "amount": "Loan Amount",
                "term_months": "Loan Term",
                "interest_rate": "Interest Rate",
                "notes_sentiment_val": "Loan Officer Notes Sentiment",
                "news_sentiment_val": "Sector News Sentiment Index",
                "comm_sentiment_val": "Communication Sentiment Index"
            }

            shap_explanations = []
            for i, feat in enumerate(FEATURES):
                val = raw_contributions[i]
                
                # Muted scale for visual bar sizing
                scaled_val = round(float(val), 3)
                
                # Format sign indicator
                sign = "+" if scaled_val >= 0 else "-"
                display_val = f"{sign}{abs(scaled_val) * 100:.1f}%"

                shap_explanations.append({
                    "feature": name_map.get(feat, feat),
                    "value": scaled_val,
                    "displayValue": display_val
                })

            # Sort explanations so largest magnitude drivers show at top
            shap_explanations.sort(key=lambda x: abs(x["value"]), reverse=True)

        return {
            "default_probability_12m": prob,
            "risk_tier": risk_tier,
            "shap_explanations": shap_explanations
        }

    def calculate_drift(self, loans_data: list) -> dict:
        """
        Calculates Population Stability Index (PSI) and Kolmogorov-Smirnov test
        on FICO scores to detect data drift between active loans and historical baselines.
        """
        if not loans_data or len(loans_data) < 5:
            return {"psi": 0.0, "p_value": 1.0, "status": "Low", "baseline": [0, 0, 0], "active": [0, 0, 0]}

        df = pd.DataFrame(loans_data)
        
        # 1. Split into baseline (resolved outcomes) and active (pending review)
        baseline_df = df[df["actual_default"].notnull()].copy()
        active_df = df[df["actual_default"].isnull()].copy()

        # If we don't have enough active or baseline records, return empty drift
        if len(baseline_df) < 3 or len(active_df) < 1:
            return {
                "psi": 0.0,
                "p_value": 1.0,
                "status": "Low",
                "baseline": [33.3, 33.3, 33.3],
                "active": [33.3, 33.3, 33.3]
            }

        # Select FICO scores
        b_fico = baseline_df["fico_score"].astype(float).values
        a_fico = active_df["fico_score"].astype(float).values

        # 2. Run KS test (Kolmogorov-Smirnov) from scipy
        from scipy.stats import ks_2samp
        ks_res = ks_2samp(b_fico, a_fico)
        p_value = round(float(ks_res.pvalue), 4)

        # 3. Calculate PSI (Population Stability Index)
        # Define FICO buckets: < 600, 600 - 720, > 720
        def get_bucket_counts(values):
            c1 = sum(1 for v in values if v < 600)
            c2 = sum(1 for v in values if 600 <= v <= 720)
            c3 = sum(1 for v in values if v > 720)
            return np.array([c1, c2, c3], dtype=float)

        b_counts = get_bucket_counts(b_fico)
        a_counts = get_bucket_counts(a_fico)

        # Normalize to fractions
        b_frac = b_counts / len(b_fico)
        a_frac = a_counts / len(a_fico)

        # Handle zero divisions with epsilon smoothing
        eps = 0.0001
        b_frac = np.where(b_frac == 0, eps, b_frac)
        a_frac = np.where(a_frac == 0, eps, a_frac)

        # Calculate PSI = sum((actual - expected) * ln(actual / expected))
        psi_val = sum((a_frac - b_frac) * np.log(a_frac / b_frac))
        psi_val = max(0.0, round(float(psi_val), 4))

        # Classify drift severity
        if psi_val < 0.10:
            status = "Low"
        elif psi_val < 0.25:
            status = "Moderate"
        else:
            status = "High"

        # Return percentages for ECharts rendering
        return {
            "psi": psi_val,
            "p_value": p_value,
            "status": status,
            "baseline": [round(float(f) * 100, 1) for f in b_frac],
            "active": [round(float(f) * 100, 1) for f in a_frac]
        }


# Global singleton engine
ml_engine = DefaultPredictionEngine()

def init_ml_engine(supabase_client: Client):
    """Initializes the ML engine by loading or training the model."""
    if ml_engine.load():
        return
    
    # If no model exists, train one using historical data in Supabase
    try:
        res = supabase_client.table("loans").select("*").execute()
        if res.data:
            ml_engine.train(res.data)
    except Exception as e:
        print(f"[ML Engine] Failed to train on startup: {str(e)}")

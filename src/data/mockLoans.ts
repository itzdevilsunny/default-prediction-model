export interface ShapValue {
  feature: string;
  value: number; // positive means increases default risk, negative means decreases default risk
  displayValue: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  loanType: 'SME' | 'Mortgage' | 'Personal' | 'Business' | 'Auto';
  borrowerSegment: 'SME' | 'Retail' | 'Corporate' | 'HNW';
  amount: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  ficoScore: number;
  dti: number; // Debt-to-income ratio (percentage)
  missedPayments12M: number;
  ltv?: number; // Loan-to-value (for mortgages)
  
  // Unstructured data features
  officerNotesSentiment: 'Positive' | 'Neutral' | 'Negative';
  officerNotesSummary: string;
  sectorNewsSentiment: 'Positive' | 'Neutral' | 'Negative';
  sectorNewsSummary: string;
  communicationSentiment: 'Positive' | 'Neutral' | 'Negative';
  
  // Model Output
  defaultProbability12M: number; // 0 to 1
  riskTier: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
  
  // Explanation
  shapExplanations: ShapValue[];
  aiRiskSummary: string;

  // Decisioning & Pricing Engine
  decisionStatus?: 'APPROVED' | 'REJECTED' | 'REFER';
  recommendedApr?: number;
  recommendedLimit?: number;
  baseRate?: number;
  riskPremium?: number;
}

export const mockLoans: Loan[] = [
  {
    id: "LN-2026-041",
    borrowerName: "Zeta Manufacturing LLC",
    loanType: "SME",
    borrowerSegment: "SME",
    amount: 650000,
    interestRate: 8.5,
    termMonths: 60,
    startDate: "2024-03-15",
    ficoScore: 590,
    dti: 48.5,
    missedPayments12M: 3,
    officerNotesSentiment: "Negative",
    officerNotesSummary: "Borrower missed meetings. Financial statements show declining operating cash flow. Inventory turnover slowed by 40%. Management appears distracted by partnership disputes.",
    sectorNewsSentiment: "Negative",
    sectorNewsSummary: "Industrial supply chains face 15% tariff increases; domestic manufacturing sector contracts for the third consecutive quarter.",
    communicationSentiment: "Negative",
    defaultProbability12M: 0.912,
    riskTier: "High",
    lastUpdated: "2026-07-01",
    aiRiskSummary: "High default risk driven by acute operating cash flow compression, supply chain headwind exposure, and high debt service relative to shrinking EBITDA.",
    shapExplanations: [
      { feature: "Missed Payments (12M)", value: 0.32, displayValue: "3 Missed Payments" },
      { feature: "Debt Service Coverage (DTI)", value: 0.21, displayValue: "48.5% DTI" },
      { feature: "Officer Notes Sentiment", value: 0.15, displayValue: "Negative Sentiment" },
      { feature: "Sector Economic Headwinds", value: 0.12, displayValue: "Manufacturing Contraction" },
      { feature: "FICO Credit Score", value: 0.11, displayValue: "FICO 590" },
      { feature: "Loan Amount & Term", value: -0.05, displayValue: "Secured Term Loan" }
    ]
  },
  {
    id: "LN-2026-078",
    borrowerName: "Sarah Jenkins",
    loanType: "Mortgage",
    borrowerSegment: "Retail",
    amount: 420000,
    interestRate: 6.2,
    termMonths: 360,
    startDate: "2022-11-10",
    ficoScore: 785,
    dti: 28.0,
    missedPayments12M: 0,
    ltv: 72.0,
    officerNotesSentiment: "Positive",
    officerNotesSummary: "Excellent communication. Provided audited income statements and tax returns promptly. Stable employment as senior software engineer at Tier 1 tech firm.",
    sectorNewsSentiment: "Positive",
    sectorNewsSummary: "Local real estate market shows steady 4.5% annual appreciation. Tech employment index remains robust.",
    communicationSentiment: "Positive",
    defaultProbability12M: 0.018,
    riskTier: "Low",
    lastUpdated: "2026-07-02",
    aiRiskSummary: "Extremely low credit risk. Strong repayment history, substantial home equity buffer, and highly stable primary income source.",
    shapExplanations: [
      { feature: "FICO Credit Score", value: -0.28, displayValue: "FICO 785" },
      { feature: "Repayment History", value: -0.22, displayValue: "0 Missed Payments" },
      { feature: "Debt Service (DTI)", value: -0.15, displayValue: "28% DTI" },
      { feature: "LTV Equity Buffer", value: -0.12, displayValue: "72% LTV" },
      { feature: "Employment Stability", value: -0.08, displayValue: "Software Engineer" },
      { feature: "Sector Outlook", value: 0.01, displayValue: "Housing Market Trends" }
    ]
  },
  {
    id: "LN-2026-102",
    borrowerName: "Apex Tech Solutions Inc.",
    loanType: "Business",
    borrowerSegment: "Corporate",
    amount: 1200000,
    interestRate: 7.8,
    termMonths: 48,
    startDate: "2025-01-05",
    ficoScore: 680,
    dti: 44.2,
    missedPayments12M: 1,
    officerNotesSentiment: "Neutral",
    officerNotesSummary: "Revenue grew 15% y-o-y, but margin compressed from 18% to 12% due to talent acquisition costs. Currently raising Series B round, capital injection expected in 90 days.",
    sectorNewsSentiment: "Positive",
    sectorNewsSummary: "Enterprise SaaS sector spending projects 18% growth over the next 12 months, though late-stage venture funding is tightening.",
    communicationSentiment: "Positive",
    defaultProbability12M: 0.425,
    riskTier: "Medium",
    lastUpdated: "2026-06-28",
    aiRiskSummary: "Moderate risk. High leverage and margin compression are balanced by a growing customer base and strong sector tailwinds, pending capital raising completion.",
    shapExplanations: [
      { feature: "Operating Leverage (DTI)", value: 0.18, displayValue: "44.2% DTI" },
      { feature: "Margin Compression", value: 0.12, displayValue: "EBITDA down 6%" },
      { feature: "Missed Payments (12M)", value: 0.08, displayValue: "1 Missed Payment" },
      { feature: "Sector Growth Trends", value: -0.11, displayValue: "Tech Spend Up 18%" },
      { feature: "Communication Transparency", value: -0.07, displayValue: "Prompt Disclosures" },
      { feature: "Historical Relationship", value: -0.05, displayValue: "3-Year Client" }
    ]
  },
  {
    id: "LN-2026-119",
    borrowerName: "Marcus Vance",
    loanType: "Personal",
    borrowerSegment: "Retail",
    amount: 35000,
    interestRate: 14.5,
    termMonths: 36,
    startDate: "2025-06-20",
    ficoScore: 605,
    dti: 52.0,
    missedPayments12M: 2,
    officerNotesSentiment: "Negative",
    officerNotesSummary: "Customer indicated temporary job loss followed by contract work. Inconsistent monthly deposits. Credit card utilization increased from 35% to 88% in 6 months.",
    sectorNewsSentiment: "Neutral",
    sectorNewsSummary: "Retail sales index flat. Gig economy employment index shows 4% growth, but hourly compensation rates are softening.",
    communicationSentiment: "Negative",
    defaultProbability12M: 0.741,
    riskTier: "High",
    lastUpdated: "2026-07-02",
    aiRiskSummary: "High default risk driven by high debt utilization, personal employment transition, and significant erosion of credit scoring buffer.",
    shapExplanations: [
      { feature: "Credit Utilization", value: 0.28, displayValue: "88% Card Utilization" },
      { feature: "FICO Credit Score", value: 0.22, displayValue: "FICO 605" },
      { feature: "Debt Service Ratio", value: 0.18, displayValue: "52% DTI" },
      { feature: "Missed Payments (12M)", value: 0.14, displayValue: "2 Missed Payments" },
      { feature: "Deposit Transaction Volume", value: 0.08, displayValue: "Highly Variable Deposits" },
      { feature: "Loan Interest Rate", value: 0.03, displayValue: "14.5% APR" }
    ]
  },
  {
    id: "LN-2026-003",
    borrowerName: "Global Logistics Corp",
    loanType: "Business",
    borrowerSegment: "Corporate",
    amount: 1500000,
    interestRate: 6.9,
    termMonths: 120,
    startDate: "2021-05-10",
    ficoScore: 740,
    dti: 31.5,
    missedPayments12M: 0,
    officerNotesSentiment: "Positive",
    officerNotesSummary: "Solid balance sheet. 2.1x current ratio. Successfully renewed long-term contracts with three major e-commerce distributors. Fuel hedging strategy fully mitigates energy spikes.",
    sectorNewsSentiment: "Neutral",
    sectorNewsSummary: "Global freight index fluctuates within normal bounds. Port congestion fully resolved, but warehousing costs rising slightly.",
    communicationSentiment: "Positive",
    defaultProbability12M: 0.068,
    riskTier: "Low",
    lastUpdated: "2026-06-30",
    aiRiskSummary: "Very low risk. Strong corporate liquidity, locked-in contract revenues, and excellent operational hedging against macro fluctuations.",
    shapExplanations: [
      { feature: "Contract Stability", value: -0.19, displayValue: "E-Commerce Contracts" },
      { feature: "Liquidity Ratio", value: -0.15, displayValue: "2.1x Current Ratio" },
      { feature: "Repayment History", value: -0.14, displayValue: "5 Years No Default" },
      { feature: "FICO Credit Score", value: -0.12, displayValue: "FICO 740" },
      { feature: "Energy Cost Hedging", value: -0.06, displayValue: "Fuel Hedges Active" },
      { feature: "Sector Inflation", value: 0.04, displayValue: "Warehouse Costs Up" }
    ]
  },
  {
    id: "LN-2026-150",
    borrowerName: "Diana Prince",
    loanType: "Mortgage",
    borrowerSegment: "HNW",
    amount: 850000,
    interestRate: 5.8,
    termMonths: 360,
    startDate: "2023-08-01",
    ficoScore: 710,
    dti: 36.5,
    missedPayments12M: 0,
    ltv: 65.0,
    officerNotesSentiment: "Neutral",
    officerNotesSummary: "Client derives income from real estate broker commissions and investment dividends. High net worth in liquid stock portfolio, but monthly income shows seasonal variance.",
    sectorNewsSentiment: "Neutral",
    sectorNewsSummary: "Luxury residential market volume decreased by 8%, though median sales prices remain resilient. High-end rent yields stable.",
    communicationSentiment: "Positive",
    defaultProbability12M: 0.152,
    riskTier: "Low",
    lastUpdated: "2026-07-02",
    aiRiskSummary: "Low credit risk. The variable nature of commission income is fully backed by a conservative loan-to-value ratio and substantial liquid assets.",
    shapExplanations: [
      { feature: "LTV Equity Buffer", value: -0.18, displayValue: "65% LTV" },
      { feature: "Liquid Reserves", value: -0.14, displayValue: "HNW Brokerage Account" },
      { feature: "Repayment History", value: -0.11, displayValue: "0 Missed Payments" },
      { feature: "Income Volatility", value: 0.10, displayValue: "Commission-Based Income" },
      { feature: "FICO Credit Score", value: -0.05, displayValue: "FICO 710" },
      { feature: "Luxury Sector Trends", value: 0.03, displayValue: "Market Volume Down" }
    ]
  },
  {
    id: "LN-2026-204",
    borrowerName: "Green Horizon Agriculture",
    loanType: "SME",
    borrowerSegment: "SME",
    amount: 450000,
    interestRate: 8.9,
    termMonths: 72,
    startDate: "2023-10-12",
    ficoScore: 630,
    dti: 47.0,
    missedPayments12M: 2,
    officerNotesSentiment: "Negative",
    officerNotesSummary: "Crop yields fell 25% below forecast due to unseasonal dry spell. Insurance payout covers only half of the operating losses. High reliance on short-term revolving credit lines.",
    sectorNewsSentiment: "Negative",
    sectorNewsSummary: "Extreme weather patterns trigger agricultural yield warnings. Grain export markets highly volatile due to regional shipping disruption.",
    communicationSentiment: "Neutral",
    defaultProbability12M: 0.814,
    riskTier: "High",
    lastUpdated: "2026-07-01",
    aiRiskSummary: "High default risk. Crop losses have drained cash reserves, leaving the borrower dependent on revolving credit lines amid adverse weather forecasts.",
    shapExplanations: [
      { feature: "Operating Loss (Dry Spell)", value: 0.26, displayValue: "-25% Crop Yield" },
      { feature: "Short-term Debt Reliance", value: 0.20, displayValue: "Revolving Lines Maxed" },
      { feature: "FICO Credit Score", value: 0.15, displayValue: "FICO 630" },
      { feature: "Missed Payments (12M)", value: 0.12, displayValue: "2 Missed Payments" },
      { feature: "Agricultural Macro Sector", value: 0.10, displayValue: "Yield Warnings" },
      { feature: "Insurance Payouts", value: -0.09, displayValue: "50% Recovery" }
    ]
  },
  {
    id: "LN-2026-056",
    borrowerName: "Dr. Arthur Pendelton",
    loanType: "Personal",
    borrowerSegment: "HNW",
    amount: 150000,
    interestRate: 7.2,
    termMonths: 60,
    startDate: "2025-02-18",
    ficoScore: 760,
    dti: 22.5,
    missedPayments12M: 0,
    officerNotesSentiment: "Positive",
    officerNotesSummary: "Borrower is lead surgeon at County General. Stable, high salary. Excellent debt management and substantial retirement savings.",
    sectorNewsSentiment: "Positive",
    sectorNewsSummary: "Medical services sector showing strong pricing power and low unemployment rates.",
    communicationSentiment: "Positive",
    defaultProbability12M: 0.024,
    riskTier: "Low",
    lastUpdated: "2026-06-25",
    aiRiskSummary: "Minimal risk. High, stable, non-cyclical professional income with low debt load.",
    shapExplanations: [
      { feature: "FICO Credit Score", value: -0.24, displayValue: "FICO 760" },
      { feature: "Debt Service Ratio", value: -0.20, displayValue: "22.5% DTI" },
      { feature: "Professional Sector Stability", value: -0.16, displayValue: "Healthcare Surgeon" },
      { feature: "Repayment History", value: -0.15, displayValue: "0 Missed Payments" },
      { feature: "Cash Reserves", value: -0.08, displayValue: "High Liquid Assets" },
      { feature: "Loan Amount", value: 0.02, displayValue: "$150k Personal Loan" }
    ]
  },
  {
    id: "LN-2026-099",
    borrowerName: "Nova Restaurant Group",
    loanType: "SME",
    borrowerSegment: "SME",
    amount: 320000,
    interestRate: 9.4,
    termMonths: 48,
    startDate: "2024-07-22",
    ficoScore: 660,
    dti: 41.0,
    missedPayments12M: 1,
    officerNotesSentiment: "Neutral",
    officerNotesSummary: "Opening of 3rd location delayed by permitting issues, creating a 3-month cash flow lag. Primary location remains highly profitable and margins stable.",
    sectorNewsSentiment: "Negative",
    sectorNewsSummary: "Hospitality sector reports 8% increase in labor costs and a cooling consumer spending index on dining out.",
    communicationSentiment: "Positive",
    defaultProbability12M: 0.380,
    riskTier: "Medium",
    lastUpdated: "2026-07-02",
    aiRiskSummary: "Moderate risk. Expansion friction caused temporary cash depletion, but core operations are viable. Elevated industry labor costs require active monitoring.",
    shapExplanations: [
      { feature: "Hospitality Labor Inflation", value: 0.15, displayValue: "+8% Labor Costs" },
      { feature: "Permitting Cash Lag", value: 0.12, displayValue: "3-Month Launch Delay" },
      { feature: "Debt Service Coverage", value: 0.08, displayValue: "41% DTI" },
      { feature: "Core Location Cashflow", value: -0.16, displayValue: "Profitable Flagship" },
      { feature: "Management Competency", value: -0.09, displayValue: "Experienced Operator" },
      { feature: "Missed Payments (12M)", value: 0.05, displayValue: "1 Missed Payment" }
    ]
  },
  {
    id: "LN-2026-112",
    borrowerName: "Elite Freight Logistics",
    loanType: "SME",
    borrowerSegment: "SME",
    amount: 280000,
    interestRate: 8.2,
    termMonths: 36,
    startDate: "2025-09-01",
    ficoScore: 620,
    dti: 49.0,
    missedPayments12M: 2,
    officerNotesSentiment: "Negative",
    officerNotesSummary: "Major corporate client representing 35% of revenue announced contract termination effective end of next month. No immediate replacement pipeline identified.",
    sectorNewsSentiment: "Neutral",
    sectorNewsSummary: "Regional trucking volume steady, but fleet insurance rates increased by an average of 12%.",
    communicationSentiment: "Neutral",
    defaultProbability12M: 0.785,
    riskTier: "High",
    lastUpdated: "2026-07-01",
    aiRiskSummary: "High credit risk. Imminent 35% revenue drop due to client loss will severely stress cash flows, given high fixed leasing expenses and pre-existing debt burden.",
    shapExplanations: [
      { feature: "Client Retention Risk", value: 0.35, displayValue: "-35% Revenue Contract" },
      { feature: "Debt Service (DTI)", value: 0.16, displayValue: "49% DTI" },
      { feature: "Missed Payments (12M)", value: 0.11, displayValue: "2 Missed Payments" },
      { feature: "FICO Credit Score", value: 0.09, displayValue: "FICO 620" },
      { feature: "Fleet Insurance Inflation", value: 0.04, displayValue: "+12% Premium Cost" },
      { feature: "Short Term Loan", value: -0.03, displayValue: "36 Month Term" }
    ]
  }
];

export interface PortfolioSummary {
  totalExposure: number;
  averageDefaultProbability: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  accuracyMetric: number;
  structuredRecordsCount: number;
  unstructuredRecordsCount: number;
  modelAUC: number;
  modelF1Score: number;
}

export const mockPortfolioSummary: PortfolioSummary = {
  totalExposure: 4760000,
  averageDefaultProbability: 0.334,
  highRiskCount: 5,
  mediumRiskCount: 2,
  lowRiskCount: 3,
  accuracyMetric: 0.912, // 91.2% (Target is 90%)
  structuredRecordsCount: 25840,
  unstructuredRecordsCount: 19420, // OCR documents, officer notes, transcripts
  modelAUC: 0.942,
  modelF1Score: 0.885
};

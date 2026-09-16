/**
 * data.js
 * ---------------------------------------------------------------------------
 * Every value in this file was computed by the Python pipeline in
 * scripts/01_build_features.py and scripts/02_train_model.py, run against
 * the real clients.csv (2,000 rows) and properties.csv (10,000 rows)
 * supplied for the Parcl Co. Limited project. Nothing here is placeholder
 * or illustrative data - see reports/evaluation_report.md for the source
 * numbers and how to reproduce them (fixed random_seed: 42).
 *
 * This file only holds data. Rendering logic lives in charts.js / main.js.
 * ---------------------------------------------------------------------------
 */

window.DASHBOARD_DATA = {
  meta: {
    modelVersion: "20260914_041335",
    trainedAt: "2026-09-14T04:13:35Z",
    chosenK: 3,
    nTrainingRows: 2000,
    nProperties: 10000,
    nSoldTransactions: 7305,
    nAvailableListings: 2695,
    ariKmeansVsWard: 0.587,
    bootstrapStability: 0.834,
    kSelectionReasoning:
      "k=3 selected: highest silhouette score (0.143) among k=2..8, and the smallest resulting cluster (2.65% of clients) was judged business-actionable rather than statistical noise.",
  },

  // Elbow + silhouette evidence across every k that was evaluated.
  kEvaluations: [
    { k: 2, inertia: 17799.13, silhouette: 0.136 },
    { k: 3, inertia: 16340.91, silhouette: 0.143 },
    { k: 4, inertia: 15413.61, silhouette: 0.112 },
    { k: 5, inertia: 14693.79, silhouette: 0.093 },
    { k: 6, inertia: 14122.62, silhouette: 0.09 },
    { k: 7, inertia: 13666.17, silhouette: 0.085 },
    { k: 8, inertia: 13265.09, silhouette: 0.081 },
  ],

  // Feature ranges across the full 2,000-client training population.
  // Used by predictor.js to normalize a new buyer's values the same way
  // the training features were scaled.
  featureRanges: {
    age: { min: 25.0, max: 94.9 },
    satisfaction_score: { min: 1, max: 5 },
    recency_months: { min: 1, max: 23 },
    frequency_transactions: { min: 3, max: 13 },
    monetary_total_spend: { min: 463611.95, max: 3653385.38 },
    monetary_avg_price_per_sqft: { min: 247.98, max: 362.25 },
    engagement_score: { min: 0, max: 100 },
  },

  clusters: [
    {
      id: 0,
      name: "High-Frequency Repeat Buyers",
      color: "var(--c-cluster-0)",
      share: 0.0265,
      n: 53,
      means: {
        age: 64.91,
        satisfaction_score: 3.57,
        recency_months: 4.23,
        frequency_transactions: 7.19,
        monetary_total_spend: 2396012.65,
        monetary_avg_price_per_sqft: 301.54,
        engagement_score: 55.25,
      },
      demographic:
        "Average age ~65 (oldest of the three groups); 96% individual clients; 87% USA-based; 66% acquired via the website channel.",
      financial:
        "Highest average total spend ($2.40M) and highest transaction frequency (7.2 sold properties on average) - roughly double the other groups on both counts.",
      behavioral:
        "Most recently active group (4.2 months since last transaction) and highest engagement-proxy score (55.2/100).",
      propertyPreference: "98% apartments.",
      riskProfile:
        "Not independently observable from this dataset. The repeat-purchase pattern is consistent with an investment-oriented buyer, but that is not confirmed by any field actually present in the data.",
      actions: [
        "Route to a dedicated relationship manager rather than mass-market campaigns - this group is 2.65% of clients but a disproportionate share of transaction volume.",
        "Prioritize retention and referral programs given high engagement and recent activity.",
        "Validate the investment hypothesis with real acquisition/portfolio data before building automated offers around it.",
      ],
      limitations:
        "Small sample (n=53) - centroid estimates are less stable than the two larger clusters. Treat as directional until re-validated on more data.",
    },
    {
      id: 1,
      name: "Standard Buyers - Lower Recorded Satisfaction",
      color: "var(--c-cluster-1)",
      share: 0.473,
      n: 946,
      means: {
        age: 55.34,
        satisfaction_score: 1.79,
        recency_months: 7.3,
        frequency_transactions: 3.43,
        monetary_total_spend: 1193598.11,
        monetary_avg_price_per_sqft: 302.64,
        engagement_score: 13.51,
      },
      demographic:
        "Average age ~55; demographic mix (country, gender, client type) is statistically indistinguishable from Cluster 2.",
      financial:
        "Average spend $1.19M, average frequency 3.4 transactions - both close to Cluster 2 and the overall population.",
      behavioral:
        "Lower satisfaction (1.8/5) and lower engagement proxy (13.5/100) than Cluster 2. Longest average recency (7.3 months).",
      propertyPreference: "95% apartments, matching the base population.",
      riskProfile: "No distinguishing signal beyond satisfaction/engagement was found.",
      actions: [
        "Investigate root causes of lower satisfaction before running acquisition-style campaigns (a service-quality review, not just marketing).",
        "Do not assume this group is lower-value financially - spend and frequency are comparable to Cluster 2.",
      ],
      limitations:
        "This cluster is separated from Cluster 2 almost entirely by satisfaction_score and the engagement-proxy score (which is itself partly derived from satisfaction). Treat as a satisfaction-based split, not a distinct buyer archetype.",
    },
    {
      id: 2,
      name: "Standard Buyers - Higher Recorded Satisfaction",
      color: "var(--c-cluster-2)",
      share: 0.5005,
      n: 1001,
      means: {
        age: 55.36,
        satisfaction_score: 4.18,
        recency_months: 6.86,
        frequency_transactions: 3.67,
        monetary_total_spend: 1263355.12,
        monetary_avg_price_per_sqft: 302.33,
        engagement_score: 50.33,
      },
      demographic: "Average age ~55; demographic mix is statistically indistinguishable from Cluster 1.",
      financial:
        "Average spend $1.26M, average frequency 3.7 transactions - both close to Cluster 1 and the overall population.",
      behavioral: "Higher satisfaction (4.2/5) and higher engagement proxy (50.3/100) than Cluster 1.",
      propertyPreference: "95% apartments, matching the base population.",
      riskProfile: "No distinguishing signal beyond satisfaction/engagement was found.",
      actions: [
        "Strong candidate for referral and testimonial programs given high recorded satisfaction.",
        "Do not assume this is a distinct market segment for targeting purposes beyond satisfaction-driven messaging.",
      ],
      limitations: "Same redundancy caveat as Cluster 1 - other fields do not differ meaningfully between clusters 1 and 2.",
    },
  ],

  // Real transaction volume by month, parsed from properties.csv (Sold listings only).
  monthlyTransactions: [
    { month: "2024-01", transactions: 375, revenue: 129933595.25 },
    { month: "2024-02", transactions: 364, revenue: 125371231.82 },
    { month: "2024-03", transactions: 370, revenue: 127777630.67 },
    { month: "2024-04", transactions: 373, revenue: 128963891.17 },
    { month: "2024-05", transactions: 374, revenue: 129481815.56 },
    { month: "2024-06", transactions: 408, revenue: 143270284.18 },
    { month: "2024-07", transactions: 365, revenue: 123927191.7 },
    { month: "2024-08", transactions: 347, revenue: 117814464.8 },
    { month: "2024-09", transactions: 340, revenue: 115529227.25 },
    { month: "2024-10", transactions: 363, revenue: 123552470.78 },
    { month: "2024-11", transactions: 374, revenue: 129066036.38 },
    { month: "2024-12", transactions: 361, revenue: 126294825.46 },
    { month: "2025-01", transactions: 251, revenue: 85790742.11 },
    { month: "2025-02", transactions: 244, revenue: 78884219.41 },
    { month: "2025-03", transactions: 216, revenue: 76012379.56 },
    { month: "2025-04", transactions: 248, revenue: 89798084.5 },
    { month: "2025-05", transactions: 243, revenue: 81833864.31 },
    { month: "2025-06", transactions: 220, revenue: 75174980.09 },
    { month: "2025-07", transactions: 290, revenue: 99357540.08 },
    { month: "2025-08", transactions: 250, revenue: 88512662.11 },
    { month: "2025-09", transactions: 221, revenue: 80644309.8 },
    { month: "2025-10", transactions: 248, revenue: 82750358.18 },
    { month: "2025-11", transactions: 224, revenue: 80653850.7 },
    { month: "2025-12", transactions: 236, revenue: 80355304.97 },
  ],

  countryCounts: {
    USA: 1538, UK: 95, Canada: 85, Germany: 56, France: 53,
    Belgium: 43, Mexico: 40, Australia: 39, Russia: 36, Denmark: 15,
  },

  // clients per country, split by assigned cluster - used for the stacked bar.
  clusterByCountry: {
    USA: [46, 725, 767], UK: [3, 44, 48], Canada: [1, 40, 44],
    Germany: [1, 27, 28], France: [1, 22, 30], Belgium: [1, 23, 19],
    Mexico: [0, 14, 26], Australia: [0, 21, 18], Russia: [0, 20, 16], Denmark: [0, 10, 5],
  },

  satisfactionDistribution: { 1: 395, 2: 379, 3: 404, 4: 417, 5: 405 },
  unitCategoryCounts: { Apartment: 1901, Office: 99 },
  acquisitionPurposeCounts: { Home: 1385, Investment: 615 },
  loanAppliedCounts: { Yes: 736, No: 1264 },
  referralChannelCounts: { Website: 1103, Agency: 705, Client: 192 },
};

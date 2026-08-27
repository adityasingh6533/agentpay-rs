use serde::{Deserialize, Serialize};

use super::client::RazorpayClient;

#[derive(Debug, Serialize)]
pub struct CreateRazorpayOrder {
    pub amount: i64,
    pub currency: String,
    pub receipt: String,
    pub notes: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct RazorpayOrder {
    pub id: String,
    pub entity: String,
    pub amount: i64,
    pub amount_paid: i64,
    pub amount_due: i64,
    pub currency: String,
    pub status: String,
    pub receipt: Option<String>,
}

pub async fn create_order(
    client: &RazorpayClient,
    amount: i64,
    currency: &str,
    receipt: &str,
    notes: Option<serde_json::Value>,
) -> Result<RazorpayOrder, String> {
    if amount <= 0 {
        return Err("Razorpay amount must be positive".to_string());
    }

    let request = CreateRazorpayOrder {
        amount,
        currency: currency.to_string(),
        receipt: receipt.to_string(),
        notes,
    };

    let response = client
        .http_client()
        .post("https://api.razorpay.com/v1/orders")
        .headers(client.headers()?)
        .json(&request)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();

        return Err(format!(
            "Razorpay order creation failed: {} {}",
            status, body
        ));
    }

    response
        .json::<RazorpayOrder>()
        .await
        .map_err(|e| e.to_string())
}

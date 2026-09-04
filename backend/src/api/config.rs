use axum::{Json, extract::State};
use serde::Serialize;

use crate::AppState;

#[derive(Debug, Serialize)]
pub struct PublicConfigResponse {
    pub razorpay_key_id: String,
}

pub async fn public_config(State(state): State<AppState>) -> Json<PublicConfigResponse> {
    Json(PublicConfigResponse {
        razorpay_key_id: state.config.razorpay_key_id.clone(),
    })
}

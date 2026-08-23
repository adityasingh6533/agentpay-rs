use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("configuration error: {0}")]
    Config(String),

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("validation error: {0}")]
    Validation(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("forbidden")]
    Forbidden,

    #[error("not found: {0}")]
    NotFound(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("internal server error")]
    Internal,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
    error: ErrorPayload,
}

#[derive(Debug, Serialize)]
struct ErrorPayload {
    code: &'static str,
    message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            Self::Config(message) => (StatusCode::INTERNAL_SERVER_ERROR, "CONFIG_ERROR", message),

            Self::Database(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "DATABASE_ERROR",
                "Database operation failed".into(),
            ),

            Self::Validation(message) => (StatusCode::BAD_REQUEST, "VALIDATION_ERROR", message),

            Self::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                "UNAUTHORIZED",
                "Authentication required".into(),
            ),

            Self::Forbidden => (
                StatusCode::FORBIDDEN,
                "FORBIDDEN",
                "Action is not permitted".into(),
            ),

            Self::NotFound(message) => (StatusCode::NOT_FOUND, "NOT_FOUND", message),

            Self::Conflict(message) => (StatusCode::CONFLICT, "CONFLICT", message),

            Self::Internal => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Internal server error".into(),
            ),
        };

        (
            status,
            Json(ErrorBody {
                error: ErrorPayload { code, message },
            }),
        )
            .into_response()
    }
}

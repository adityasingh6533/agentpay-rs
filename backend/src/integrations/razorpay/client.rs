use base64::{Engine as _, engine::general_purpose};
use reqwest::{
    Client,
    header::{AUTHORIZATION, HeaderMap, HeaderValue},
};

#[derive(Clone)]
pub struct RazorpayClient {
    client: Client,
    key_id: String,
    key_secret: String,
}

impl RazorpayClient {
    pub fn new(key_id: String, key_secret: String) -> Self {
        Self {
            client: Client::new(),
            key_id,
            key_secret,
        }
    }

    fn auth_headers(&self) -> Result<HeaderMap, String> {
        let credentials = format!("{}:{}", self.key_id, self.key_secret);

        let encoded = general_purpose::STANDARD.encode(credentials);

        let value =
            HeaderValue::from_str(&format!("Basic {}", encoded)).map_err(|e| e.to_string())?;

        let mut headers = HeaderMap::new();

        headers.insert(AUTHORIZATION, value);

        Ok(headers)
    }

    pub fn http_client(&self) -> &Client {
        &self.client
    }

    pub fn headers(&self) -> Result<HeaderMap, String> {
        self.auth_headers()
    }
}

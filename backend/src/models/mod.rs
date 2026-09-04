pub mod agent_catalog;
pub mod audit;
pub mod checkout;
pub mod confirmation;
pub mod customer;
pub mod policy;
pub mod product;
pub mod signed_intent;

pub use agent_catalog::{AgentCapabilities, AgentCatalog, AgentProduct};
pub use audit::AuditEvent;
pub use checkout::{
    CheckoutAuthorization, CheckoutRequest, CheckoutResponse, ExecuteCheckoutRequest,
    VerifyPaymentRequest, VerifyPaymentResponse,
};
pub use confirmation::{ConfirmationRequest, ConfirmationResponse};
pub use customer::{CreateCustomer, Customer};
pub use policy::SpendingPolicy;
pub use product::{Product, ProductRelationship};
pub use signed_intent::SignedAgentIntentRecord;

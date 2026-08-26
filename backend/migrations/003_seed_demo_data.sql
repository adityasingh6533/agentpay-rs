-- =========================================================
-- AGENTPAY DEMO DATA
-- =========================================================

-- ---------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------

INSERT INTO customers (
    id,
    name,
    email
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Rahul Sharma',
    'rahul@example.com'
)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------

INSERT INTO products (
    id,
    name,
    description,
    category,
    price,
    currency,
    stock,
    rating,
    review_count,
    active,
    metadata
)
VALUES

(
    '20000000-0000-0000-0000-000000000001',
    'Velocity Running Shoes',
    'Lightweight daily running shoes',
    'Running',
    1299,
    'INR',
    42,
    4.8,
    2340,
    TRUE,
    '{"tags":["running","shoes","sports"],"brand":"Velocity"}'
),

(
    '20000000-0000-0000-0000-000000000002',
    'ProFit Running Socks',
    'Breathable performance running socks',
    'Accessories',
    199,
    'INR',
    86,
    4.7,
    1820,
    TRUE,
    '{"tags":["running","socks","accessory"],"brand":"ProFit"}'
),

(
    '20000000-0000-0000-0000-000000000003',
    'Aero Sports Jacket',
    'Breathable performance sports jacket',
    'Sportswear',
    1899,
    'INR',
    18,
    4.7,
    840,
    TRUE,
    '{"tags":["sports","jacket","training"],"brand":"Aero"}'
),

(
    '20000000-0000-0000-0000-000000000004',
    'FlexRun Sports Shorts',
    'Flexible training shorts',
    'Sportswear',
    899,
    'INR',
    31,
    4.6,
    1120,
    TRUE,
    '{"tags":["running","shorts","training"],"brand":"FlexRun"}'
),

(
    '20000000-0000-0000-0000-000000000005',
    'Sprint Performance Tee',
    'Lightweight performance running tee',
    'Sportswear',
    699,
    'INR',
    7,
    4.5,
    670,
    TRUE,
    '{"tags":["running","tee","training"],"brand":"Sprint"}'
)

ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------
-- PRODUCT RELATIONSHIPS
-- ---------------------------------------------------------

INSERT INTO product_relationships (
    product_id,
    related_product_id,
    relationship_type,
    confidence,
    support_count
)
VALUES

(
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'CROSS_SELL',
    0.68,
    842
),

(
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000005',
    'CROSS_SELL',
    0.41,
    317
),

(
    '20000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000005',
    'CROSS_SELL',
    0.53,
    421
)

ON CONFLICT (
    product_id,
    related_product_id,
    relationship_type
)
DO NOTHING;


-- ---------------------------------------------------------
-- SPENDING POLICY
-- ---------------------------------------------------------

INSERT INTO spending_policies (
    id,
    merchant_id,
    max_transaction_amount,
    daily_transaction_limit,
    requires_confirmation_above,
    allowed_categories,
    currency,
    active
)
VALUES (
    '30000000-0000-0000-0000-000000000001',

    '40000000-0000-0000-0000-000000000001',

    5000,
    20000,
    1500,

    ARRAY[
        'Running',
        'Accessories',
        'Sportswear'
    ],

    'INR',
    TRUE
)
ON CONFLICT (id) DO NOTHING;
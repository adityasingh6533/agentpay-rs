CREATE TABLE product_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    related_product_id UUID NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

    relationship_type TEXT NOT NULL
        CHECK (
            relationship_type IN (
                'CROSS_SELL',
                'UPSELL',
                'ALTERNATIVE'
            )
        ),

    confidence NUMERIC(5,4) NOT NULL
        CHECK (confidence >= 0 AND confidence <= 1),

    support_count BIGINT NOT NULL DEFAULT 0
        CHECK (support_count >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        product_id,
        related_product_id,
        relationship_type
    ),

    CHECK (product_id <> related_product_id)
);

CREATE INDEX idx_product_relationships_product
    ON product_relationships(product_id);

CREATE INDEX idx_product_relationships_confidence
    ON product_relationships(
        product_id,
        confidence DESC
    );


CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    customer_id UUID NOT NULL
        REFERENCES customers(id),

    session_id UUID
        REFERENCES agent_sessions(id),

    amount BIGINT NOT NULL
        CHECK (amount >= 0),

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    status TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer
    ON orders(customer_id);

CREATE INDEX idx_orders_created
    ON orders(created_at DESC);


CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    order_id UUID NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES products(id),

    quantity BIGINT NOT NULL
        CHECK (quantity > 0),

    unit_price BIGINT NOT NULL
        CHECK (unit_price >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order
    ON order_items(order_id);

CREATE INDEX idx_order_items_product
    ON order_items(product_id);
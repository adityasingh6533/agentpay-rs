-- =========================================================
-- WINNING DEMO CATALOG EXPANSION
-- =========================================================

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
    '20000000-0000-0000-0000-000000000006',
    'Enduro Trail Running Shoes',
    'Stable running shoes for road and light trail training',
    'Running',
    1799,
    'INR',
    24,
    4.6,
    980,
    TRUE,
    '{"tags":["running","trail","shoes","training"],"brand":"Enduro"}'
),
(
    '20000000-0000-0000-0000-000000000007',
    'PaceLite Running Cap',
    'Sweat-wicking cap for sunny outdoor runs',
    'Accessories',
    349,
    'INR',
    64,
    4.5,
    640,
    TRUE,
    '{"tags":["running","cap","sun","accessory"],"brand":"PaceLite"}'
),
(
    '20000000-0000-0000-0000-000000000008',
    'HydroGrip Sports Bottle',
    'Leak-proof hydration bottle for gym and running sessions',
    'Accessories',
    299,
    'INR',
    120,
    4.7,
    2100,
    TRUE,
    '{"tags":["hydration","bottle","gym","running"],"brand":"HydroGrip"}'
),
(
    '20000000-0000-0000-0000-000000000009',
    'CoreBalance Yoga Mat',
    'Anti-slip yoga and mobility mat for daily training',
    'Training',
    999,
    'INR',
    38,
    4.8,
    1760,
    TRUE,
    '{"tags":["yoga","mat","mobility","training"],"brand":"CoreBalance"}'
),
(
    '20000000-0000-0000-0000-000000000010',
    'Balance Yoga Block',
    'Support block for stretching, yoga and mobility drills',
    'Training',
    249,
    'INR',
    75,
    4.4,
    510,
    TRUE,
    '{"tags":["yoga","block","stretching","mobility"],"brand":"Balance"}'
),
(
    '20000000-0000-0000-0000-000000000011',
    'GripPro Training Gloves',
    'Breathable gym gloves for strength training and lifting',
    'Training',
    449,
    'INR',
    52,
    4.5,
    860,
    TRUE,
    '{"tags":["gym","training","gloves","lifting"],"brand":"GripPro"}'
),
(
    '20000000-0000-0000-0000-000000000012',
    'Tempo Gym Duffel',
    'Compact gym duffel with shoe pocket and wet compartment',
    'Accessories',
    1199,
    'INR',
    21,
    4.6,
    730,
    TRUE,
    '{"tags":["gym","bag","duffel","training"],"brand":"Tempo"}'
),
(
    '20000000-0000-0000-0000-000000000013',
    'CoolDry Gym Towel',
    'Quick-dry microfiber towel for gym and training',
    'Accessories',
    299,
    'INR',
    95,
    4.6,
    1290,
    TRUE,
    '{"tags":["gym","towel","training","quick-dry"],"brand":"CoolDry"}'
),
(
    '20000000-0000-0000-0000-000000000014',
    'RecoverPro Foam Roller',
    'Dense foam roller for recovery and muscle release',
    'Recovery',
    799,
    'INR',
    33,
    4.7,
    940,
    TRUE,
    '{"tags":["recovery","foam","roller","mobility"],"brand":"RecoverPro"}'
),
(
    '20000000-0000-0000-0000-000000000015',
    'Flex Massage Ball',
    'Targeted recovery massage ball for foot and shoulder release',
    'Recovery',
    249,
    'INR',
    68,
    4.4,
    480,
    TRUE,
    '{"tags":["recovery","massage","mobility"],"brand":"Flex"}'
),
(
    '20000000-0000-0000-0000-000000000016',
    'Compression Recovery Sleeves',
    'Light compression sleeves for post-run recovery',
    'Recovery',
    599,
    'INR',
    47,
    4.5,
    690,
    TRUE,
    '{"tags":["recovery","compression","running"],"brand":"CompressFit"}'
),
(
    '20000000-0000-0000-0000-000000000017',
    'Thermal Training Tee',
    'Warm base layer tee for winter running and training',
    'Sportswear',
    999,
    'INR',
    29,
    4.5,
    620,
    TRUE,
    '{"tags":["tee","thermal","training","winter"],"brand":"ThermalRun"}'
),
(
    '20000000-0000-0000-0000-000000000018',
    'StormShield Running Jacket',
    'Light rain-resistant jacket for outdoor runners',
    'Sportswear',
    2499,
    'INR',
    14,
    4.8,
    820,
    TRUE,
    '{"tags":["running","jacket","rain","sportswear"],"brand":"StormShield"}'
),
(
    '20000000-0000-0000-0000-000000000019',
    'AirFlow Training Tank',
    'Sleeveless breathable training tank for gym sessions',
    'Sportswear',
    599,
    'INR',
    41,
    4.3,
    440,
    TRUE,
    '{"tags":["gym","tank","training","sportswear"],"brand":"AirFlow"}'
),
(
    '20000000-0000-0000-0000-000000000020',
    'PowerLift Training Shorts',
    'Durable gym shorts for strength training',
    'Sportswear',
    1099,
    'INR',
    27,
    4.6,
    780,
    TRUE,
    '{"tags":["gym","shorts","training","sportswear"],"brand":"PowerLift"}'
),
(
    '20000000-0000-0000-0000-000000000021',
    'Resistance Band Set',
    'Five-level resistance band kit for home training',
    'Training',
    699,
    'INR',
    54,
    4.7,
    1510,
    TRUE,
    '{"tags":["resistance","bands","home","training"],"brand":"BandCore"}'
),
(
    '20000000-0000-0000-0000-000000000022',
    'SpeedPro Skipping Rope',
    'Adjustable speed rope for cardio and boxing workouts',
    'Training',
    399,
    'INR',
    88,
    4.6,
    1180,
    TRUE,
    '{"tags":["rope","cardio","boxing","training"],"brand":"SpeedPro"}'
),
(
    '20000000-0000-0000-0000-000000000023',
    'Reflective Running Belt',
    'Lightweight belt for phone, keys and night-run visibility',
    'Accessories',
    499,
    'INR',
    44,
    4.5,
    730,
    TRUE,
    '{"tags":["running","belt","reflective","accessory"],"brand":"NightRun"}'
),
(
    '20000000-0000-0000-0000-000000000024',
    'Cushion Ankle Socks',
    'Soft ankle socks for training and everyday runs',
    'Accessories',
    149,
    'INR',
    110,
    4.4,
    950,
    TRUE,
    '{"tags":["socks","running","training","accessory"],"brand":"Cushion"}'
),
(
    '20000000-0000-0000-0000-000000000025',
    'Marathon Hydration Vest',
    'Lightweight vest for long runs with bottle pockets',
    'Running',
    1499,
    'INR',
    16,
    4.7,
    540,
    TRUE,
    '{"tags":["running","hydration","vest","marathon"],"brand":"Marathon"}'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    stock = EXCLUDED.stock,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    active = EXCLUDED.active,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();


INSERT INTO product_relationships (
    product_id,
    related_product_id,
    relationship_type,
    confidence,
    support_count
)
VALUES
('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', 'CROSS_SELL', 0.61, 520),
('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', 'CROSS_SELL', 0.64, 610),
('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000023', 'CROSS_SELL', 0.57, 430),
('20000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000016', 'CROSS_SELL', 0.62, 390),
('20000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000025', 'CROSS_SELL', 0.59, 250),
('20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000010', 'CROSS_SELL', 0.78, 690),
('20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000008', 'CROSS_SELL', 0.53, 420),
('20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000013', 'CROSS_SELL', 0.49, 360),
('20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000012', 'CROSS_SELL', 0.55, 330),
('20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000013', 'CROSS_SELL', 0.52, 310),
('20000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000015', 'CROSS_SELL', 0.76, 470),
('20000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000016', 'CROSS_SELL', 0.58, 280),
('20000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000017', 'CROSS_SELL', 0.72, 410),
('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000019', 'CROSS_SELL', 0.63, 390),
('20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000013', 'CROSS_SELL', 0.51, 260),
('20000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000013', 'CROSS_SELL', 0.46, 210),
('20000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000008', 'CROSS_SELL', 0.57, 330)
ON CONFLICT (
    product_id,
    related_product_id,
    relationship_type
)
DO UPDATE SET
    confidence = EXCLUDED.confidence,
    support_count = EXCLUDED.support_count,
    updated_at = NOW();


UPDATE spending_policies
SET
    allowed_categories = ARRAY[
        'Running',
        'Accessories',
        'Sportswear',
        'Training',
        'Recovery'
    ],
    updated_at = NOW()
WHERE merchant_id = '40000000-0000-0000-0000-000000000001'
  AND active = TRUE;

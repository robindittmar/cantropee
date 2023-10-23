use cantropee;

INSERT INTO cantropee.organizations (id, name, currency)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'cantropee', 'EUR');

INSERT INTO cantropee.users (id, email, password)
VALUES (UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'), 'affe@dittmar.dev',
        '$2b$04$PuzS/bnPZNWjlqqLQ4kPeuNU/I/leh.zm9/GB2kHMX0aWuOVMjF4e');
INSERT INTO cantropee.user_settings (user_id, default_organization)
VALUES (UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'));


INSERT INTO cantropee.organization_users (organization_id, user_id, role)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'),
        1);


INSERT INTO cantropee.categories (id, organization_id, name)
VALUES (1, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Nicht spezifiziert');
INSERT INTO cantropee.categories (id, organization_id, name)
VALUES (2, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Einkauf');
INSERT INTO cantropee.categories (id, organization_id, name)
VALUES (3, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Kassenabschöpfung');
INSERT INTO cantropee.categories (id, organization_id, name)
VALUES (4, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Lohnzahlung');

INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id,
                                    category_id, value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-09 14:35:57', 1, null, 3,
        100000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-09 17:23:31', 1, null, 2,
        -3000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 15:35:57', 1, null, 2,
        -5000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 18:35:57', 1, null, 4,
        -30000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 22:30:57', 1, null, 2,
        -5233, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 22:33:57', 0, null, 2,
        -3000000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 22:35:57', 1, null, 2,
        -42069, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2040-01-01 00:00:00', 1, null, 2,
        -42069, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-12 14:35:57', 1, null, 3,
        30000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-12 15:35:57', 1, null, 4,
        -15000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-13 09:35:57', 1, null, 4,
        -7000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-13 15:35:57', 1, null, 3,
        40000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-13 18:35:57', 1, null, 3,
        80000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-15 18:35:57', 1, null, 2,
        -38000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-20 22:35:57', '2023-09-20 22:35:57', 1, null, 3,
        2069, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-21 22:35:57', '2023-09-21 22:35:57', 1, null, 3,
        7895, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-21 22:36:57', 1, null, 2,
        -890, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-21 22:40:57', 1, null, 2,
        -65, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-21 22:42:57', 1, null, 2,
        -87, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-22 22:57:57', 1, null, 3,
        112, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-23 22:35:57', 1, null, 3,
        9606, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-23 22:41:57', 1, null, 3,
        6890, null, null, null, null);
INSERT INTO cantropee.transactions (organization_id, insert_timestamp, effective_timestamp, active, ref_id, category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-23 22:42:57', 1, null, 4,
        -8890, null, null, null, null);
use cantropee;

set autocommit = false;
start transaction;

# 1st org
INSERT INTO cantropee.organizations (uuid, name, currency, uses_taxes)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'cantropee', 'EUR', true);

INSERT INTO cantropee.roles (uuid, organization_uuid, name, privileges)
VALUES (UUID_TO_BIN('90f0ec06-72b5-11ee-b507-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'),
        'admin', '[
    "read",
    "write",
    "admin"
  ]');
INSERT INTO cantropee.roles (uuid, organization_uuid, name, privileges)
VALUES (UUID_TO_BIN('6a530821-72b8-11ee-b507-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'),
        'user', '[
    "read",
    "write"
  ]');
INSERT INTO cantropee.roles (uuid, organization_uuid, name, privileges)
VALUES (UUID_TO_BIN('a9b3e697-72b8-11ee-b507-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'),
        'read-only', '[
    "read"
  ]');


# affe@dittmar.dev
INSERT INTO cantropee.users (uuid, email, password, require_password_change)
VALUES (UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'), 'affe@dittmar.dev',
        '$2b$04$PuzS/bnPZNWjlqqLQ4kPeuNU/I/leh.zm9/GB2kHMX0aWuOVMjF4e', false);
INSERT INTO cantropee.user_settings (user_uuid, default_organization_uuid)
VALUES (UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'));

# affe3@dittmar.dev
INSERT INTO cantropee.users (uuid, email, password)
VALUES (UUID_TO_BIN('59a4accc-72b6-11ee-b507-0242ac110002'), 'affe3@dittmar.dev',
        '$2b$04$PuzS/bnPZNWjlqqLQ4kPeuNU/I/leh.zm9/GB2kHMX0aWuOVMjF4e');
INSERT INTO cantropee.user_settings (user_uuid, default_organization_uuid)
VALUES (UUID_TO_BIN('59a4accc-72b6-11ee-b507-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'));

# affe4@dittmar.dev
INSERT INTO cantropee.users (uuid, email, password)
VALUES (UUID_TO_BIN('8891a6d1-72b6-11ee-b507-0242ac110002'), 'affe4@dittmar.dev',
        '$2b$04$PuzS/bnPZNWjlqqLQ4kPeuNU/I/leh.zm9/GB2kHMX0aWuOVMjF4e');
INSERT INTO cantropee.user_settings (user_uuid, default_organization_uuid)
VALUES (UUID_TO_BIN('8891a6d1-72b6-11ee-b507-0242ac110002'), UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'));


# affe@dittmar.dev: admin@cantropee
INSERT INTO cantropee.organization_users (organization_uuid, user_uuid, role_uuid)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'),
        UUID_TO_BIN('90f0ec06-72b5-11ee-b507-0242ac110002'));
# affe3@dittmar.dev: user@cantropee
INSERT INTO cantropee.organization_users (organization_uuid, user_uuid, role_uuid)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('59a4accc-72b6-11ee-b507-0242ac110002'),
        UUID_TO_BIN('6a530821-72b8-11ee-b507-0242ac110002'));
# affe4@dittmar.dev: read-only@cantropee
INSERT INTO cantropee.organization_users (organization_uuid, user_uuid, role_uuid)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('8891a6d1-72b6-11ee-b507-0242ac110002'),
        UUID_TO_BIN('a9b3e697-72b8-11ee-b507-0242ac110002'));


INSERT INTO cantropee.categories (id, organization_uuid, name)
VALUES (1, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Nicht spezifiziert');
INSERT INTO cantropee.categories (id, organization_uuid, name)
VALUES (2, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Einkauf');
INSERT INTO cantropee.categories (id, organization_uuid, name)
VALUES (3, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Kassenabschöpfung');
INSERT INTO cantropee.categories (id, organization_uuid, name)
VALUES (4, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Lohnzahlung');

# 2nd org
INSERT INTO cantropee.organizations (uuid, name, currency, uses_taxes)
VALUES (UUID_TO_BIN('3781e1e4-72b7-11ee-b507-0242ac110002'), 'affen kiste', 'EUR', false);

INSERT INTO cantropee.roles (uuid, organization_uuid, name, privileges)
VALUES (UUID_TO_BIN('51f9af4b-72b9-11ee-b507-0242ac110002'), UUID_TO_BIN('3781e1e4-72b7-11ee-b507-0242ac110002'),
        'admin', '[
    "read",
    "write",
    "admin"
  ]');

# affe2@dittmar.dev
INSERT INTO cantropee.users (uuid, email, password)
VALUES (UUID_TO_BIN('303884b5-72b6-11ee-b507-0242ac110002'), 'affe2@dittmar.dev',
        '$2b$04$PuzS/bnPZNWjlqqLQ4kPeuNU/I/leh.zm9/GB2kHMX0aWuOVMjF4e');
INSERT INTO cantropee.user_settings (user_uuid, default_organization_uuid)
VALUES (UUID_TO_BIN('303884b5-72b6-11ee-b507-0242ac110002'), UUID_TO_BIN('3781e1e4-72b7-11ee-b507-0242ac110002'));

# affe@dittmar.dev: admin@affen kiste
INSERT INTO cantropee.organization_users (organization_uuid, user_uuid, role_uuid)
VALUES (UUID_TO_BIN('3781e1e4-72b7-11ee-b507-0242ac110002'), UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'),
        UUID_TO_BIN('51f9af4b-72b9-11ee-b507-0242ac110002'));
# affe2@dittmar.dev: admin@affen kiste
INSERT INTO cantropee.organization_users (organization_uuid, user_uuid, role_uuid)
VALUES (UUID_TO_BIN('3781e1e4-72b7-11ee-b507-0242ac110002'), UUID_TO_BIN('303884b5-72b6-11ee-b507-0242ac110002'),
        UUID_TO_BIN('51f9af4b-72b9-11ee-b507-0242ac110002'));


INSERT INTO cantropee.categories (id, organization_uuid, name)
VALUES (5, UUID_TO_BIN('3781e1e4-72b7-11ee-b507-0242ac110002'), 'Nicht spezifiziert');


# 1st org: transactions
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id, value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-09 14:35:57', 1, null, 3,
        100000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-09 17:23:31', 1, null, 2,
        -3000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 15:35:57', 1, null, 2,
        -5000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 18:35:57', 1, null, 4,
        -30000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 22:30:57', 1, null, 2,
        -5233, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 22:33:57', 0, null, 2,
        -3000000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-11 22:35:57', 1, null, 2,
        -42069, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2040-01-01 00:00:00', 1, null, 2,
        -42069, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-12 14:35:57', 1, null, 3,
        30000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-12 15:35:57', 1, null, 4,
        -15000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-13 09:35:57', 1, null, 4,
        -7000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-13 15:35:57', 1, null, 3,
        40000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-13 18:35:57', 1, null, 3,
        80000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-10-11 22:35:57', '2023-09-15 18:35:57', 1, null, 2,
        -38000, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-20 22:35:57', '2023-09-20 22:35:57', 1, null, 3,
        2069, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-21 22:35:57', '2023-09-21 22:35:57', 1, null, 3,
        7895, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-21 22:36:57', 1, null, 2,
        -890, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-21 22:40:57', 1, null, 2,
        -65, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-21 22:42:57', 1, null, 2,
        -87, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-22 22:57:57', 1, null, 3,
        112, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-23 22:35:57', 1, null, 3,
        9606, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-23 22:41:57', 1, null, 3,
        6890, null, null, null, null);
INSERT INTO cantropee.transactions (organization_uuid, insert_timestamp, effective_timestamp, active, ref_uuid,
                                    category_id,
                                    value,
                                    value19, value7,
                                    vat19, vat7)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), '2023-09-12 22:35:57', '2023-09-23 22:42:57', 1, null, 4,
        -8890, null, null, null, null);

# recurring
INSERT INTO recurring_transactions (organization_uuid, timezone, execution_policy, first_execution, next_execution,
                                    category_id, value, note)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Europe/Berlin', 0, '2022-12-31 23:00:00',
        '2022-12-31 23:00:00', 1, 100000, 'recurring every 1st of the month');

commit;

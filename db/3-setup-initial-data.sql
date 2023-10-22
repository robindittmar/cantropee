use cantropee;

INSERT INTO cantropee.organizations (id, name, currency)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'cantropee', 'EUR');

INSERT INTO cantropee.users (id, email, password)
VALUES (UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'), 'cantropee@dittmar.dev',
        '$2b$04$PuzS/bnPZNWjlqqLQ4kPeuNU/I/leh.zm9/GB2kHMX0aWuOVMjF4e');

INSERT INTO cantropee.organization_users (organization_id, user_id, role)
VALUES (UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), UUID_TO_BIN('712d61c4-7026-11ee-bc40-0242ac110002'),
        1);

INSERT INTO cantropee.categories (id, organization_id, name)
VALUES (1, UUID_TO_BIN('6ba780d2-7026-11ee-bc40-0242ac110002'), 'Nicht spezifiziert');

create schema if not exists cantropee;

use cantropee;

set autocommit = false;
start transaction;

create table organizations
(
    id               BIGINT auto_increment                    not null,
    uuid             binary(16) default (UUID_TO_BIN(UUID())) not null,
    insert_timestamp datetime   default NOW()                 not null,
    name             varchar(256)                             not null,
    currency         varchar(16)                              not null,

    constraint organizations_pk
        primary key (id)
);
create unique index organizations_uuid_idx
    on organizations (uuid);

create table users
(
    id                      BIGINT auto_increment                    not null,
    uuid                    binary(16) default (UUID_TO_BIN(UUID())) not null,
    insert_timestamp        datetime   default NOW()                 not null,
    email                   varchar(256)                             not null,
    password                varchar(256)                             not null,
    require_password_change boolean    default true                  not null,

    constraint accounts_pk
        primary key (id)
);
create unique index users_uuid_idx
    on users (uuid);
create unique index users_email_idx
    on users (email);

create table organization_users
(
    organization_uuid binary(16)             not null,
    user_uuid         binary(16)             not null,
    insert_timestamp  datetime default NOW() not null,
    role_uuid         binary(16)             not null,

    constraint organization_users_pk
        primary key (organization_uuid, user_uuid)
);

create table user_settings
(
    id                        BIGINT auto_increment,
    user_uuid                 binary(16)            not null,
    default_organization_uuid binary(16)            not null,
    private_mode              boolean default false not null,
    default_preview_pending   boolean default false not null,
    default_sorting_order_asc boolean default false not null,
    extra                     json                  null,

    constraint user_settings_pk
        primary key (id),
    constraint user_settings_user_fk
        foreign key (user_uuid)
            references users (uuid)
            on delete cascade
);

create table roles
(
    id                BIGINT auto_increment                    not null,
    uuid              binary(16) default (UUID_TO_BIN(UUID())) not null,
    organization_uuid binary(16)                               not null,
    insert_timestamp  datetime   default NOW()                 not null,
    name              varchar(256)                             not null,
    privileges        json                                     not null,

    constraint roles_pk
        primary key (id),
    constraint roles_organization_fk
        foreign key (organization_uuid)
            references organizations (uuid)
            on delete cascade
);
create unique index roles_uuid_idx
    on roles (uuid);

create table sessions
(
    id                BIGINT auto_increment,
    insert_timestamp  datetime default NOW() not null,
    valid_until       datetime               not null,
    session_id        varchar(1024)          not null,
    user_uuid         binary(16)             not null,
    organization_uuid binary(16)             not null,

    constraint sessions_pk
        primary key (id)
);
create index sessions_valid_until_idx
    on sessions (valid_until);

create table categories
(
    id                BIGINT auto_increment,
    organization_uuid binary(16)             not null,
    name              varchar(256)           not null,
    insert_timestamp  datetime default NOW() not null,

    constraint transactions_categories_pk
        primary key (id)
);

create table transactions
(
    id                   BIGINT auto_increment                    not null,
    uuid                 binary(16) default (UUID_TO_BIN(UUID())) not null,
    organization_uuid    binary(16)                               not null,
    insert_timestamp     datetime   default NOW()                 not null,
    effective_timestamp  datetime   default NOW()                 not null,
    active               boolean    default true                  not null,
    ref_uuid             binary(16)                               null,
    current_version_uuid binary(16)                               null,
    category_id          BIGINT                                   not null,
    value                BIGINT                                   not null,
    value19              BIGINT                                   null,
    value7               BIGINT                                   null,
    vat19                BIGINT                                   null,
    vat7                 BIGINT                                   null,
    note                 varchar(128)                             null,

    constraint transactions_pk
        primary key (id)
);
create unique index transactions_uuid_idx
    on transactions (uuid);
create index transactions_effective_timestamp_active_idx
    on transactions (organization_uuid, effective_timestamp, active);
create index transactions_ref_uuid_idx
    on transactions (organization_uuid, ref_uuid);
create index transactions_current_version_uuid_idx
    on transactions (organization_uuid, current_version_uuid);


create table balance
(
    id                BIGINT auto_increment,
    organization_uuid binary(16)             not null,
    insert_timestamp  datetime default NOW() not null,
    effective_from    datetime               not null,
    effective_to      datetime               not null,
    value             BIGINT                 not null,
    vat19             BIGINT                 not null,
    vat7              BIGINT                 not null,
    pending_value     BIGINT                 not null,
    pending_vat19     BIGINT                 not null,
    pending_vat7      BIGINT                 not null,
    valid_until       datetime               not null,
    dirty             boolean  default false not null,

    constraint transactions_pk
        primary key (id)
);

create table recurring_transactions
(
    id                    BIGINT auto_increment                    not null,
    uuid                  binary(16) default (UUID_TO_BIN(UUID())) not null,
    organization_uuid     binary(16)                               not null,
    insert_timestamp      datetime   default NOW()                 not null,
    active                boolean    default true                  not null,
    timezone              varchar(64)                              not null,
    execution_policy      integer                                  not null,
    execution_policy_data json                                     null,
    first_execution       datetime                                 not null,
    next_execution        datetime                                 not null,
    last_execution        datetime                                 null,
    category_id           BIGINT                                   not null,
    value                 BIGINT                                   not null,
    value19               BIGINT                                   null,
    value7                BIGINT                                   null,
    vat19                 BIGINT                                   null,
    vat7                  BIGINT                                   null,
    note                  varchar(128)                             null,

    constraint recurring_transactions_pk
        primary key (id)
);
create index recurring_transactions_uuid_organization_uuid_idx
    on recurring_transactions (uuid, organization_uuid);
create index recurring_transactions_next_execution_active_idx
    on recurring_transactions (organization_uuid, next_execution, active);

create table recurring_booked
(
    id               BIGINT auto_increment  not null,
    recurring_uuid   binary(16)             not null,
    transaction_uuid binary(16)             not null,
    insert_timestamp datetime default NOW() not null,

    constraint recurring_booked_pk
        primary key (id)
);
create unique index recurring_booked_recurring_uuid_transaction_uuid_idx
    on recurring_booked (recurring_uuid, transaction_uuid);

commit;

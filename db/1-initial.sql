create schema if not exists cantropee;

use cantropee;

set autocommit = false;
start transaction;

create table organizations
(
    id               binary(16) default (UUID_TO_BIN(UUID())) not null,
    insert_timestamp datetime   default NOW()                 not null,
    name             varchar(256)                             not null,
    currency         varchar(16)                              not null,

    constraint organizations_pk
        primary key (id)
);

create table users
(
    id                      binary(16) default (UUID_TO_BIN(UUID())) not null,
    insert_timestamp        datetime   default NOW()                 not null,
    email                   varchar(256)                             not null,
    password                varchar(256)                             not null,
    require_password_change boolean    default true                  not null,

    constraint accounts_pk
        primary key (id)
);
create unique index users_email_idx
    on users (email);

create table organization_users
(
    organization_id  binary(16)             not null,
    user_id          binary(16)             not null,
    insert_timestamp datetime default NOW() not null,
    role_id          binary(16)             not null,

    constraint organization_users_pk
        primary key (organization_id, user_id)
);

create table user_settings
(
    id                        BIGINT auto_increment,
    user_id                   binary(16)            not null,
    default_organization      binary(16)            not null,
    private_mode              boolean default false not null,
    default_preview_pending   boolean default false not null,
    default_sorting_order_asc boolean default false not null,
    extra                     json                  null,

    constraint user_settings_pk
        primary key (id),
    constraint user_settings_user_fk
        foreign key (user_id)
            references users (id)
            on delete cascade
);

create table roles
(
    id               binary(16) default (UUID_TO_BIN(UUID())) not null,
    organization_id  binary(16)                               not null,
    insert_timestamp datetime   default NOW()                 not null,
    name             varchar(256)                             not null,
    privileges       json                                     not null,

    constraint roles_pk
        primary key (id),
    constraint roles_organization_fk
        foreign key (organization_id)
            references organizations (id)
            on delete cascade
);

create table sessions
(
    id               BIGINT auto_increment,
    insert_timestamp datetime default NOW() not null,
    valid_until      datetime               not null,
    session_id       varchar(1024)          not null,
    user_id          binary(16)             not null,
    organization_id  binary(16)             not null,

    constraint sessions_pk
        primary key (id)
);
create index sessions_valid_until_idx
    on sessions (valid_until);

create table categories
(
    id               BIGINT auto_increment,
    organization_id  binary(16)             not null,
    name             varchar(256)           not null,
    insert_timestamp datetime default NOW() not null,

    constraint transactions_categories_pk
        primary key (id)
);

create table transactions
(
    id                  binary(16) default (UUID_TO_BIN(UUID())) not null,
    organization_id     binary(16)                               not null,
    insert_timestamp    datetime   default NOW()                 not null,
    effective_timestamp datetime   default NOW()                 not null,
    active              boolean    default true                  not null,
    ref_id              binary(16)                               null,
    current_version_id  binary(16)                               null,
    category_id         BIGINT                                   not null,
    value               BIGINT                                   not null,
    value19             BIGINT                                   null,
    value7              BIGINT                                   null,
    vat19               BIGINT                                   null,
    vat7                BIGINT                                   null,
    note                varchar(128)                             null,

    constraint transactions_pk
        primary key (id)
);
create index transactions_effective_timestamp_active_idx
    on transactions (organization_id, effective_timestamp, active);
create index transactions_ref_id_idx
    on transactions (organization_id, ref_id);


create table balance
(
    id               BIGINT auto_increment,
    organization_id  binary(16)             not null,
    insert_timestamp datetime default NOW() not null,
    effective_from   datetime               not null,
    effective_to     datetime               not null,
    value            BIGINT                 not null,
    vat19            BIGINT                 not null,
    vat7             BIGINT                 not null,
    pending_value    BIGINT                 not null,
    pending_vat19    BIGINT                 not null,
    pending_vat7     BIGINT                 not null,
    valid_until      datetime               not null,
    dirty            boolean  default false not null,

    constraint transactions_pk
        primary key (id)
);

commit;

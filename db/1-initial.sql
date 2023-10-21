create schema if not exists cantropee;

use cantropee;

create table organizations
(
    id               binary(16) default (UUID_TO_BIN(UUID())) not null,
    insert_timestamp datetime   default NOW()                 not null,
    name             varchar(256)                             not null,

    constraint organizations_pk
        primary key (id)
);

create table users
(
    id                   binary(16) default (UUID_TO_BIN(UUID())) not null,
    insert_timestamp     datetime   default NOW()                 not null,
    email                varchar(256)                             not null,
    password             varchar(256)                             not null,
    default_organization binary(16)                               null,

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
    role             BIGINT   default 0     not null,

    constraint organization_users_pk
        primary key (organization_id, user_id)
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
    category_id         BIGINT                                   not null,
    value               BIGINT                                   not null,
    value19             BIGINT                                   null,
    value7              BIGINT                                   null,
    vat19               BIGINT                                   null,
    vat7                BIGINT                                   null,

    constraint transactions_pk
        primary key (id)
);
create index transactions_effective_timestamp_idx
    on transactions (effective_timestamp);


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

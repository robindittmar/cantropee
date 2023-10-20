create schema if not exists cantropee;

use cantropee;

create table sessions
(
    id               BIGINT auto_increment,
    insert_timestamp datetime default NOW() not null,
    valid_until      datetime               not null,
    session_id       varchar(1024)          not null,
    constraint sessions_pk
        primary key (id)
);
create index sessions_valid_until_index
    on sessions (valid_until);

create table categories
(
    id               BIGINT auto_increment,
    name             varchar(256)           not null,
    insert_timestamp datetime default NOW() not null,
    constraint transactions_categories_pk
        primary key (id)
);

create table transactions
(
    id                  BIGINT auto_increment,
    insert_timestamp    datetime default NOW() not null,
    effective_timestamp datetime default NOW() not null,
    active              boolean  default true  not null,
    ref_id              BIGINT                 null,
    category_id         BIGINT                 not null,
    value               BIGINT                 not null,
    value19             BIGINT                 null,
    value7              BIGINT                 null,
    vat19               BIGINT                 null,
    vat7                BIGINT                 null,
    constraint transactions_pk
        primary key (id)
);

create index transactions_effective_timestamp_asc_index
    on transactions (effective_timestamp);


create table balance
(
    id               BIGINT auto_increment,
    insert_timestamp datetime default NOW() not null,
    effective_from   datetime               not null,
    effective_to     datetime               not null,
    value            BIGINT                 not null,
    vat19            BIGINT                 not null,
    vat7             BIGINT                 not null,
    dirty            boolean  default false not null,
    constraint transactions_pk
        primary key (id)
);

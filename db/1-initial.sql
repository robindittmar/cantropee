create schema if not exists cantropee;

use cantropee;

create table transactions
(
    id                  BIGINT auto_increment,
    insert_timestamp    datetime default NOW() not null,
    effective_timestamp datetime default NOW() not null,
    active              boolean  default true  not null,
    ref_id              BIGINT                 null,
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
    value            BIGINT                 not null,
    constraint transactions_pk
        primary key (id)
);

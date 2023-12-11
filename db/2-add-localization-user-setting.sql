use cantropee;

set autocommit = false;
start transaction;

ALTER TABLE cantropee.user_settings
    ADD COLUMN localization varchar(8) default 'en-US' not null;

commit;

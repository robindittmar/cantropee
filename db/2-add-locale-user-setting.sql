use cantropee;

set autocommit = false;
start transaction;

ALTER TABLE cantropee.user_settings
    ADD COLUMN locale varchar(8) default 'en-us' not null;

commit;

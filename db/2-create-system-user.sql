use cantropee;

start transaction;

insert into cantropee.users (uuid, email, password, require_password_change)
values (UUID_TO_BIN('c91d3ebb-06e1-413c-ba1d-f3fcac98e198'), 'system', '', false);

insert into cantropee.invites (issued_by, expires_at)
values (UUID_TO_BIN('c91d3ebb-06e1-413c-ba1d-f3fcac98e198'), '2050-01-01 00:00:00');

commit;

use cantropee;

start transaction;

create user ctp_svc_usr
    identified by 'vmV55V4E7GF4wD^bD#x*Rd4ruR!HXn*a';

grant delete, insert, select, update on cantropee.* to ctp_svc_usr;

commit;

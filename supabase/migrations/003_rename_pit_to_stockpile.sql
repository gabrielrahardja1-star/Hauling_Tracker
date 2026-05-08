-- Rename pit_operator role to stockpile_operator
alter type user_role_enum rename value 'pit_operator' to 'stockpile_operator';

-- Rename the pit_operator user login to stockpile1
update users set email = 'stockpile1' where email = 'pit_operator1';

-- Adiciona a foto de perfil do usuário.
-- Execute apenas em bancos já existentes; instalações novas já usam o
-- database.sql atualizado.

ALTER TABLE users
  ADD COLUMN photo MEDIUMTEXT NULL AFTER phone;

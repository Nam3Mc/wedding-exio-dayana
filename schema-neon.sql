-- ============================================================
-- BODA DAYANA & EXIO
-- Esquema PostgreSQL compatible con Neon y el backend Express
-- ============================================================
-- IMPORTANTE:
-- Este script elimina y vuelve a crear las tablas de invitaciones.
-- Úsalo en una base nueva o cuando no necesites conservar datos previos.
-- ============================================================

BEGIN;

SET search_path TO public;

-- Necesaria para generar UUID seguros con gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Limpiar instalaciones anteriores para garantizar el esquema exacto.
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;

DROP FUNCTION IF EXISTS set_invitation_updated_at() CASCADE;
DROP FUNCTION IF EXISTS validate_family_member_limit() CASCADE;
DROP FUNCTION IF EXISTS validate_invitation_max_attendees() CASCADE;

-- Estados utilizados por admin.js, public.js y los HTML.
CREATE TYPE invitation_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'VIRTUAL',
    'REJECTED',
    'EXPIRED'
);

-- La persona principal vive en esta tabla.
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_guest VARCHAR(150) NOT NULL,
    is_foreign BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date DATE NOT NULL,
    group_status invitation_status NOT NULL DEFAULT 'PENDING',
    max_attendees SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT invitations_primary_guest_not_blank
        CHECK (char_length(btrim(primary_guest)) BETWEEN 1 AND 150),

    -- 1 invitado principal + máximo 20 acompañantes.
    CONSTRAINT invitations_max_attendees_range
        CHECK (max_attendees BETWEEN 1 AND 21)
);

-- Esta tabla contiene solamente acompañantes opcionales.
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_attending BOOLEAN DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT family_members_name_not_blank
        CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),

    CONSTRAINT family_members_invitation_fk
        FOREIGN KEY (invitation_id)
        REFERENCES invitations(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

-- Mantiene updated_at actualizado aunque una modificación no venga del backend.
CREATE FUNCTION set_invitation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER invitations_set_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION set_invitation_updated_at();

-- Impide insertar más acompañantes de los permitidos por max_attendees.
CREATE FUNCTION validate_family_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    allowed_companions INTEGER;
    current_companions INTEGER;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.invitation_id = OLD.invitation_id THEN
        RETURN NEW;
    END IF;

    SELECT GREATEST(max_attendees - 1, 0)
    INTO allowed_companions
    FROM invitations
    WHERE id = NEW.invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La invitación % no existe', NEW.invitation_id
            USING ERRCODE = '23503';
    END IF;

    SELECT COUNT(*)
    INTO current_companions
    FROM family_members
    WHERE invitation_id = NEW.invitation_id;

    IF current_companions >= allowed_companions THEN
        RAISE EXCEPTION
            'La invitación % admite como máximo % acompañantes',
            NEW.invitation_id,
            allowed_companions
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER family_members_validate_limit
BEFORE INSERT OR UPDATE OF invitation_id ON family_members
FOR EACH ROW
EXECUTE FUNCTION validate_family_member_limit();

-- Evita reducir max_attendees por debajo de las personas ya registradas.
CREATE FUNCTION validate_invitation_max_attendees()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    existing_companions INTEGER;
BEGIN
    IF NEW.max_attendees = OLD.max_attendees THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO existing_companions
    FROM family_members
    WHERE invitation_id = OLD.id;

    IF NEW.max_attendees < existing_companions + 1 THEN
        RAISE EXCEPTION
            'max_attendees no puede ser menor que el total de personas registradas (%)',
            existing_companions + 1
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER invitations_validate_max_attendees
BEFORE UPDATE OF max_attendees ON invitations
FOR EACH ROW
EXECUTE FUNCTION validate_invitation_max_attendees();

-- Índices para las consultas reales del backend.
CREATE INDEX invitations_created_at_idx
    ON invitations (created_at DESC);

CREATE INDEX invitations_status_expiration_idx
    ON invitations (group_status, expiration_date);

CREATE INDEX family_members_invitation_id_idx
    ON family_members (invitation_id);

CREATE INDEX family_members_invitation_attending_idx
    ON family_members (invitation_id, is_attending);

COMMIT;

-- ============================================================
-- VERIFICACIÓN
-- Debe devolver dos filas: invitations y family_members.
-- ============================================================
SELECT
    table_name
FROM information_schema.tables
WHERE
    table_schema = 'public'
    AND table_name IN ('invitations', 'family_members')
ORDER BY table_name;

-- Debe devolver los cinco estados esperados por la aplicación.
SELECT
    enumlabel AS status
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'invitation_status'
ORDER BY pg_enum.enumsortorder;

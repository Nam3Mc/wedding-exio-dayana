BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TYPE IF EXISTS invitation_status CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE TYPE invitation_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'VIRTUAL',
    'REJECTED',
    'EXPIRED'
);

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_guest VARCHAR(150) NOT NULL,
    is_foreign BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date DATE NOT NULL,
    group_status invitation_status NOT NULL DEFAULT 'PENDING',
    max_attendees SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT invitations_primary_guest_not_empty
        CHECK (char_length(btrim(primary_guest)) > 0),

    CONSTRAINT invitations_max_attendees_valid
        CHECK (max_attendees BETWEEN 1 AND 21)
);

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL
        REFERENCES invitations(id)
        ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    is_attending BOOLEAN DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT family_members_name_not_empty
        CHECK (char_length(btrim(name)) > 0)
);

CREATE INDEX invitations_created_at_idx
    ON invitations (created_at DESC);

CREATE INDEX invitations_status_expiration_idx
    ON invitations (group_status, expiration_date);

CREATE INDEX family_members_invitation_id_idx
    ON family_members (invitation_id);

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER invitations_update_timestamp
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;

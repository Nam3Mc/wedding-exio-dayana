BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'invitation_status'
    ) THEN
        CREATE TYPE invitation_status AS ENUM (
            'PENDING',
            'CONFIRMED',
            'REJECTED',
            'VIRTUAL',
            'EXPIRED'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_guest VARCHAR(100) NOT NULL,
    is_foreign BOOLEAN NOT NULL DEFAULT FALSE,
    expiration_date TIMESTAMPTZ NOT NULL,
    group_status invitation_status NOT NULL DEFAULT 'PENDING',
    max_attendees INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invitations_primary_guest_not_blank
        CHECK (LENGTH(BTRIM(primary_guest)) BETWEEN 1 AND 100),
    CONSTRAINT invitations_max_attendees_positive
        CHECK (max_attendees IS NULL OR max_attendees > 0)
);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_attending BOOLEAN DEFAULT NULL,
    CONSTRAINT family_members_invitation_fk
        FOREIGN KEY (invitation_id)
        REFERENCES invitations(id)
        ON DELETE CASCADE,
    CONSTRAINT family_members_name_not_blank
        CHECK (LENGTH(BTRIM(name)) BETWEEN 1 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_family_members_invitation_id
    ON family_members(invitation_id);

CREATE INDEX IF NOT EXISTS idx_invitations_group_status
    ON invitations(group_status);

CREATE INDEX IF NOT EXISTS idx_invitations_expiration_date
    ON invitations(expiration_date);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;

CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;

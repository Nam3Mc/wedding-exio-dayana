import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createInvitationSchema,
    isUuid,
    isValidDateOnly,
    parseSchema,
    respondInvitationSchema
} from '../src/utils/validation.js';

test('validates UUID values', () => {
    assert.equal(isUuid('4c5fa25a-f875-4f5f-9380-c42dbd126843'), true);
    assert.equal(isUuid('not-a-uuid'), false);
});

test('validates calendar dates strictly', () => {
    assert.equal(isValidDateOnly('2027-01-08'), true);
    assert.equal(isValidDateOnly('2027-02-30'), false);
    assert.equal(isValidDateOnly('08-01-2027'), false);
});

test('parses a valid invitation payload', () => {
    const result = parseSchema(createInvitationSchema, {
        primary_guest: 'Dreiser',
        family_members: ['Invitado 2'],
        is_foreign: false,
        expiration_date: '2027-01-01',
        max_attendees: null
    });

    assert.equal(result.success, true);
});

test('rejects invalid response statuses', () => {
    const result = parseSchema(respondInvitationSchema, {
        uuid: '4c5fa25a-f875-4f5f-9380-c42dbd126843',
        status: 'PENDING',
        responses: []
    });

    assert.equal(result.success, false);
});

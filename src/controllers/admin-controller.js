import {
    createInvitation,
    deleteInvitation,
    getAllInvitations
} from '../models/invitations.js';
import { isAdminAuthenticated } from '../middleware/admin-auth.js';

function getMessage(req, key) {
    return typeof req.query[key] === 'string' ? req.query[key] : '';
}

export async function renderAdmin(req, res, next) {
    try {
        const authenticated = isAdminAuthenticated(req);
        const invitations = authenticated ? await getAllInvitations() : [];

        return res.render('admin', {
            title: 'Panel de invitaciones · Dayana & Exio',
            authenticated,
            invitations,
            successMessage: getMessage(req, 'success'),
            errorMessage: getMessage(req, 'error')
        });
    } catch (error) {
        return next(error);
    }
}

export function login(req, res) {
    const configuredPassword = process.env.ADMIN_PASSWORD || '';
    const receivedPassword = typeof req.body.password === 'string'
        ? req.body.password
        : '';

    if (!configuredPassword) {
        return res.redirect('/?error=' + encodeURIComponent(
            'ADMIN_PASSWORD no está configurada en Vercel.'
        ));
    }

    if (receivedPassword !== configuredPassword) {
        return res.redirect('/?error=' + encodeURIComponent('Contraseña incorrecta.'));
    }

    res.cookie('wedding_admin', 'authorized', {
        signed: true,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/'
    });

    return res.redirect('/?success=' + encodeURIComponent('Sesión iniciada.'));
}

export function logout(req, res) {
    res.clearCookie('wedding_admin', {
        path: '/'
    });

    return res.redirect('/');
}

export async function create(req, res) {
    try {
        const invitationId = await createInvitation({
            primaryGuest: req.body.primary_guest,
            companions: req.body.companions,
            expirationDate: req.body.expiration_date,
            isForeign: req.body.is_foreign === 'on'
        });

        return res.redirect('/?success=' + encodeURIComponent(
            `Invitación creada correctamente: ${invitationId}`
        ));
    } catch (error) {
        return res.redirect('/?error=' + encodeURIComponent(error.message));
    }
}

export async function remove(req, res) {
    try {
        const deleted = await deleteInvitation(req.params.id);

        const message = deleted
            ? 'Invitación eliminada correctamente.'
            : 'La invitación ya no existe.';

        return res.redirect('/?success=' + encodeURIComponent(message));
    } catch (error) {
        return res.redirect('/?error=' + encodeURIComponent(error.message));
    }
}

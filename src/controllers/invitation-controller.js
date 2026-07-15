import {
    getInvitationById,
    respondToInvitation
} from '../models/invitations.js';

export async function renderInvitation(req, res, next) {
    try {
        const data = await getInvitationById(req.params.id);

        if (!data) {
            return res.status(404).render('error', {
                title: 'Invitación no encontrada',
                message: 'El enlace de esta invitación no existe.'
            });
        }

        return res.render('invitation', {
            title: `Invitación para ${data.invitation.primary_guest}`,
            invitation: data.invitation,
            companions: data.companions,
            successMessage: typeof req.query.success === 'string'
                ? req.query.success
                : '',
            errorMessage: typeof req.query.error === 'string'
                ? req.query.error
                : ''
        });
    } catch (error) {
        return next(error);
    }
}

export async function respond(req, res) {
    try {
        await respondToInvitation(
            req.params.id,
            req.body.status,
            req.body.attending_companions || []
        );

        return res.redirect(
            `/invitation/${encodeURIComponent(req.params.id)}?success=` +
            encodeURIComponent('Gracias. Tu respuesta fue guardada correctamente.')
        );
    } catch (error) {
        return res.redirect(
            `/invitation/${encodeURIComponent(req.params.id)}?error=` +
            encodeURIComponent(error.message)
        );
    }
}

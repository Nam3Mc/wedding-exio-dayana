export function isAdminAuthenticated(req) {
    return req.signedCookies?.wedding_admin === 'authorized';
}

export function requireAdmin(req, res, next) {
    if (isAdminAuthenticated(req)) {
        return next();
    }

    return res.redirect('/?error=' + encodeURIComponent('Debes iniciar sesión.'));
}

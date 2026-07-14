export function noStore(req, res, next) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return next();
}

export function requireSameOrigin(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.get('origin');

    if (!origin) {
        return next();
    }

    const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
    const forwardedProtocol = req
        .get('x-forwarded-proto')
        ?.split(',')[0]
        ?.trim();
    const host = forwardedHost || req.get('host');
    const protocol = forwardedProtocol || req.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (origin !== expectedOrigin) {
        return res.status(403).json({
            error: 'Origen de solicitud no permitido.'
        });
    }

    return next();
}

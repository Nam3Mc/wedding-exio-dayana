import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const jwtSecret = process.env.JWT_SECRET?.trim();
    const authorizationHeader = req.headers.authorization;

    if (!jwtSecret) {
        console.error('JWT_SECRET environment variable is missing');

        return res.status(500).json({
            error: 'El servidor no tiene configurada la autenticación'
        });
    }

    if (typeof authorizationHeader !== 'string') {
        return res.status(401).json({
            error: 'Acceso denegado: token no proporcionado'
        });
    }

    const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({
            error: 'Formato de token no válido'
        });
    }

    try {
        const decodedToken = jwt.verify(match[1], jwtSecret, {
            issuer: 'wedding-exio-dayana'
        });

        if (!decodedToken || decodedToken.admin !== true) {
            return res.status(403).json({
                error: 'Token sin permisos de administración'
            });
        }

        req.user = decodedToken;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'La sesión expiró'
            });
        }

        return res.status(401).json({
            error: 'Token inválido'
        });
    }
};

export default authMiddleware;

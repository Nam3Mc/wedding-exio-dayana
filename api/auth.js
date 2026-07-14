import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            error: 'Acceso denegado: token no proporcionado'
        });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Formato de token no válido'
        });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('JWT_SECRET is not configured');

        return res.status(500).json({
            error: 'La autenticación no está configurada'
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            jwtSecret
        );

        req.user = decoded;

        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado'
            });
        }

        return res.status(401).json({
            error: 'Token inválido'
        });
    }
};

export default authMiddleware;
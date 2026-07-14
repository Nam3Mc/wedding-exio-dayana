import { AppError } from '../utils/app-error.js';

export function notFoundHandler(req, res) {
    return res.status(404).json({
        error: 'Ruta no encontrada.'
    });
}

export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: error.message,
            code: error.code
        });
    }

    if (error instanceof SyntaxError && 'body' in error) {
        return res.status(400).json({
            error: 'El cuerpo JSON de la solicitud no es válido.'
        });
    }

    if (error?.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'La solicitud supera el tamaño permitido.'
        });
    }

    console.error('Unhandled request error:', {
        method: req.method,
        path: req.originalUrl,
        error
    });

    return res.status(500).json({
        error: 'Ocurrió un error interno del servidor.'
    });
}

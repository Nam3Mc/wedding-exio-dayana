import { Router } from 'express';
import {
    create,
    guests,
    login,
    logout,
    remove,
    renderAdmin
} from '../controllers/admin-controller.js';
import { requireAdmin } from '../middleware/admin-auth.js';

const router = Router();

router.get('/', renderAdmin);
router.post('/admin/login', login);
router.post('/admin/logout', logout);
router.get('/admin/invitations/:id/guests', requireAdmin, guests);
router.post('/admin/invitations', requireAdmin, create);
router.post('/admin/invitations/:id/delete', requireAdmin, remove);

export default router;

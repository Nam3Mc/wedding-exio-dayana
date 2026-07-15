import { Router } from 'express';
import {
    renderInvitation,
    respond
} from '../controllers/invitation-controller.js';

const router = Router();

router.get('/invitation/:id', renderInvitation);
router.post('/invitation/:id/respond', respond);

export default router;

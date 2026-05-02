import { Router } from 'express';
import { startServer, stopServer, restartServer, getServerStatus } from '../controllers/serverController.js';

const router = Router();

router.post('/:identifier/start',   startServer);
router.post('/:identifier/stop',    stopServer);
router.post('/:identifier/restart', restartServer);
router.get('/:identifier/status',   getServerStatus);

export default router;

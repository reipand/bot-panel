import { Router } from 'express';
import { getUserInfo, linkUser, getUserServerList } from '../controllers/userController.js';

const router = Router();

router.get('/:discord_id',         getUserInfo);
router.post('/link',               linkUser);
router.get('/:discord_id/servers', getUserServerList);

export default router;

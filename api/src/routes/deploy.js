import { Router } from 'express';
import { queueDeploy, getDeployStatus } from '../controllers/deployController.js';

const router = Router();

router.post('/',               queueDeploy);
router.get('/status/:job_id',  getDeployStatus);

export default router;

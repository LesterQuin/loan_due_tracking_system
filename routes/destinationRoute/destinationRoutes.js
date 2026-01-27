import express from 'express'
import * as Controller from '../../controllers/destinationController/destinationController.js'

const router = express.Router();

router.post('/', Controller.addDestination);
router.get('/', Controller.listDestinations);   

export default router;
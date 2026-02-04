import express from 'express';
import * as Controller from '../../controllers/agentController/agentController.js';
const router = express.Router();

router.post('/register', Controller.register);
router.post('/login', Controller.login);
router.post('/reset-password', Controller.resetPassword);
router.post('/verify-otp', Controller.verifyOTP);
router.post('/resend-otp', Controller.resendOTP);
router.post('/logout', Controller.logout);

export default router;
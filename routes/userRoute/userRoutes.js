import express from 'express';
import * as Controller from '../../controllers/userController/userController.js';
import { loginValidation, resetPasswordValidation, verifyOTPValidation, resendOTPValidation, logoutValidation } from '../../middlewares/agentValidate.js';

const router = express.Router();

// Apply validation middleware to routes
router.post('/register', Controller.register);
router.post('/login', loginValidation, Controller.login);
router.post('/reset-password', resetPasswordValidation, Controller.resetPassword);
router.post('/verify-otp', verifyOTPValidation, Controller.verifyOTP);
router.post('/resend-otp', resendOTPValidation, Controller.resendOTP);
router.post('/logout', logoutValidation, Controller.logout);
router.post('/refresh-token', Controller.refreshToken);

export default router;

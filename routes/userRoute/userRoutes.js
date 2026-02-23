import express from 'express';
import * as Controller from '../../controllers/userController/userController.js';
import { registerValidation, loginValidation, resetPasswordValidation, verifyOTPValidation, resendOTPValidation, logoutValidation, updateProfileValidation } from '../../middlewares/agentValidate.js';
import { authenticateJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// Apply validation middleware to routes
router.post('/register', registerValidation, Controller.register);
router.post('/login', loginValidation, Controller.login);
router.post('/reset-password', resetPasswordValidation, Controller.resetPassword);
router.post('/verify-otp', verifyOTPValidation, Controller.verifyOTP);
router.post('/resend-otp', resendOTPValidation, Controller.resendOTP);
router.post('/logout', logoutValidation, Controller.logout);
router.post('/refresh-token', Controller.refreshToken);
router.put('/update-profile', authenticateJWT, updateProfileValidation, Controller.updateProfile);

export default router;

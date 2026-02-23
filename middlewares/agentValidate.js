import { body, validationResult } from 'express-validator';

// ========================= REGISTER VALIDATION =========================
export const registerValidation = [
    body('firstname')
        .notEmpty().withMessage('First name is required')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
    
    body('middlename')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Middle name must be at most 100 characters'),
    
    body('lastname')
        .notEmpty().withMessage('Last name is required')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
    
    body('email')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage('Invalid email format')
        .custom((value) => {
            const emailRegex = /^[\w.-]+@(gmail\.com|yahoo\.com|phillifeassurance\.onmicrosoft\.com|sjgem\.net)$/i;
            if (!emailRegex.test(value)) {
                throw new Error('Invalid domain address. Only gmail.com, yahoo.com, phillifeassurance.onmicrosoft.com, and sjgem.net are allowed');
            }
            return true;
        }),
    
    body('agentCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Agent code must be at most 50 characters'),
    
    body('userType')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isIn(['AGENT', 'BRANCH', 'DEPT']).withMessage('Invalid userType. Must be AGENT, BRANCH, or DEPT'),
    
    body('role')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isIn(['SD', 'MD', 'CCO', 'CCA']).withMessage('Invalid role. Must be SD, MD, CCO, or CCA'),
    
    body('mobile')
        .notEmpty().withMessage('Mobile number is required')
        .trim()
        .matches(/^(\+63|09)\d{9}$/).withMessage('Mobile must start with +63 or 09 followed by 9 digits'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// ========================= LOGIN VALIDATION =========================
export const loginValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage(' Invalid email format'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 1 }).withMessage('Password is required'),
    
    body('newPassword')
        .optional()
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/)
        .withMessage('New password must be 8+ chars, include upper, lower, number'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// ========================= RESET PASSWORD VALIDATION =========================
export const resetPasswordValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage(' Invalid email format'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/)
        .withMessage('New password must be 8+ chars, include upper, lower, number'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// ========================= VERIFY OTP VALIDATION =========================
export const verifyOTPValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage(' Invalid email format'),
    
    body('otp')
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must be numeric'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// ========================= RESEND OTP VALIDATION =========================
export const resendOTPValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage(' Invalid email format'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// ========================= LOGOUT VALIDATION =========================
export const logoutValidation = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .trim()
        .isEmail().withMessage(' Invalid email format'),
    
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required')
        .trim(),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

// ========================= UPDATE PROFILE VALIDATION =========================
export const updateProfileValidation = [
    // Optional password change
    body('currentPassword')
        .optional()
        .isLength({ min: 1 }).withMessage('Current password is required'),
    
    body('newPassword')
        .optional()
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/)
        .withMessage('New password must be 8+ chars, include upper, lower, number'),
    
    // Optional profile fields - middlename and suffix can be null
    body('firstname')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isLength({ max: 100 }).withMessage('First name must be at most 100 characters'),
    
    body('middlename')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isLength({ max: 100 }).withMessage('Middle name must be at most 100 characters'),
    
    body('lastname')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isLength({ max: 100 }).withMessage('Last name must be at most 100 characters'),
    
    body('suffix')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isLength({ max: 20 }).withMessage('Suffix must be at most 20 characters'),
    
    body('mobile')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .matches(/^(\+63|09)\d{9}$/).withMessage('Mobile must start with +63 or 09 followed by 9 digits'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

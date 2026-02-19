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
            const emailRegex = /^[\w.-]+@(gmail\.com|yahoo\.com|phillifeassurance\.onmicrosoft\.com)$/i;
            if (!emailRegex.test(value)) {
                throw new Error('Invalid domain address. Only gmail.com, yahoo.com, and phillifeassurance.onmicrosoft.com are allowed');
            }
            return true;
        }),
    
    body('agentCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Agent code must be at most 50 characters'),
    
    body('departmentId')
        .optional({ nullable: true, values: 'falsy' })
        .isInt({ min: 1 }).withMessage('Department ID must be a positive integer'),
    
    body('regionId')
        .optional({ nullable: true, values: 'falsy' })
        .isInt({ min: 1 }).withMessage('Region ID must be a positive integer'),
    
    body('divisionId')
        .optional({ nullable: true, values: 'falsy' })
        .isInt({ min: 1 }).withMessage('Division ID must be a positive integer'),
    
    body('userType')
        .optional({ nullable: true, values: 'falsy' })
        .trim()
        .isIn(['Admin', 'MD', 'SD', 'FC']).withMessage('Invalid userType. Must be Admin, MD, SD, or FC'),
    
    body('phoneNumber')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('Phone number must be at most 20 characters')
        .matches(/^[0-9+\-\s()]*$/).withMessage('Invalid phone number format'),

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
        .isEmail().withMessage('Invalid email format'),
    
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
        .isEmail().withMessage('Invalid email format'),
    
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
        .isEmail().withMessage('Invalid email format'),
    
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
        .isEmail().withMessage('Invalid email format'),

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
        .isEmail().withMessage('Invalid email format'),
    
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

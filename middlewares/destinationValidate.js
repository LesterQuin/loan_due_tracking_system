import { body, validationResult } from 'express-validator';

export const destinationValidation = [
    body('userType')
        .notEmpty().withMessage('userType is required')
        .isIn(['CCO', 'Agent']).withMessage('Invalid userType'),

    body('destinationName')
        .custom((value, { req }) => {
        if (req.body.userType === 'Agent') {
            if (!value) throw new Error('destinationName is required for Agent');
            if (!['SD', 'MD', 'FC'].includes(value)) throw new Error('Invalid destinationName for Agent');
        }
        return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

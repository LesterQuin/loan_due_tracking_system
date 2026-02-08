import jwt from 'jsonwebtoken';
import { getDepartmentPermissions } from '../controllers/agentController/agentController.js';

export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // attach user
        req.user = decoded;

        // attach permissions
        req.user.permissions = getDepartmentPermissions(decoded.departmentId);

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

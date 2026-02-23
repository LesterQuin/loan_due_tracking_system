import jwt from 'jsonwebtoken';
import * as User from '../models/userModel/userModel.js';
import * as Agent from '../models/agentModel/agentModel.js';
import { getDepartmentPermissions } from '../controllers/agentController/agentController.js';

export const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // First try to get user from user table
        const user = await User.getUserByEmail(decoded.email);
        
        if (user) {
            // Attach user info to request
            req.user = {
                id: user.id,
                email: user.email,
                userType: user.userType,
                departmentId: user.departmentCode
            };
            return next();
        }
        
        // Fallback to agent table
        const agent = await Agent.getAgentByEmail(decoded.email);
        if (!agent) return res.status(401).json({ message: 'User not found' });

        // Attach agent + permissions to request
        req.user = {
            id: agent.id,
            email: agent.email,
            userType: agent.userType,
            departmentId: agent.departmentId,
            permissions: getDepartmentPermissions(agent) // full agent object
        };

        next();
    } catch (err) {
        console.error('[JWT ERROR]', err);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

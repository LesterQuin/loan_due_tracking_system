import { getDepartmentPermissions } from '../controllers/agentController/agentController.js';
import * as Agent from '../models/agentModel/agentModel.js';

export const requirePermission = (permissionKey) => {
    return async (req, res, next) => {
        try {
            const agent = await Agent.getAgentByEmail(req.user.email);
            if (!agent) {
                return res.status(401).json({ message: 'Agent not found' });
            }

            const permissions = getDepartmentPermissions(agent.departmentId);

            if (!permissions[permissionKey]) {
                return res.status(403).json({ message: 'Access denied' });
            }

            // attach permissions if needed later
            req.permissions = permissions;

            next();
        } catch (err) {
            console.error('PERMISSION ERROR:', err);
            res.status(500).json({ message: 'Permission check failed' });
        }
    };
};

export const canExport = (req, res, next) => {
    const { permissions } = req.user;

    if (!permissions || !permissions.canExport) {
        return res.status(403).json({ message: 'Export not allowed' });
    }

    next();
};


import { getDepartmentPermissions } from '../utils/permissions.js'; 

export const requirePermission = (permissionKeys) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) return res.status(401).json({ message: 'Unauthorized: no user info' });

            const permissions = getDepartmentPermissions(user);

            if (permissions.viewOnly) {
                return res.status(403).json({ message: 'Access denied: view-only user' });
            }

            const keys = Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys];
            const hasPermission = keys.some(key => permissions[key]);

            if (!hasPermission) {
                return res.status(403).json({ message: 'Access denied: insufficient permissions' });
            }

            if (req.params.departmentId && !['Admin', 'MD'].includes(user.userType)) {
                if (user.departmentId != req.params.departmentId) {
                    return res.status(403).json({ message: 'Access denied: wrong department' });
                }
            }

            next();
        } catch (err) {
            console.error('PERMISSION ERROR:', err);
            res.status(500).json({ message: 'Permission check failed' });
        }
    };
};

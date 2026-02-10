import { getDepartmentPermissions } from '../utils/permissions.js'; 

export const requirePermission = (permissionKeys = []) => {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Unauthorized: no user info' });
            }

            const permissions = getDepartmentPermissions(user);

            const keys = Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys];

            // ✅ allow if user has at least ONE of the allowed permissions
            const hasPermission = keys.some(key => permissions[key] === true);

            if (!hasPermission) {
                return res.status(403).json({
                    message: 'Access denied: insufficient permissions'
                });
            }

            // 🔒 Optional department safety (only if route has param)
            if (req.params.departmentId && !['Admin', 'MD'].includes(user.userType)) {
                if (Number(user.departmentId) !== Number(req.params.departmentId)) {
                    return res.status(403).json({
                        message: 'Access denied: wrong department'
                    });
                }
            }

            next();
        } catch (err) {
            console.error('PERMISSION ERROR:', err);
            res.status(500).json({ message: 'Permission check failed' });
        }
    };
};

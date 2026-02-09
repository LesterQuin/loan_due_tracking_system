export const requirePermission = (permissionKey) => {
    return (req, res, next) => {
        try {
            if (!req.user || !req.user.permissions) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const permissions = req.user.permissions;

            if (!permissions[permissionKey]) {
                return res.status(403).json({ message: 'Access denied' });
            }

            next();
        } catch (err) {
            console.error('PERMISSION ERROR:', err);
            res.status(500).json({ message: 'Permission check failed' });
        }
    };
};

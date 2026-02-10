// utils/permissions.js
export const getDepartmentPermissions = (agent) => {
    // Only apply userType permissions if set
    if (agent.userType) {
        switch (agent.userType) {
            case 'Admin':
            case 'MD':
                return { canUpload: true, canImport: true, canExport: true, viewOnly: false };
            case 'SD':
                return { canUpload: false, canImport: false, canExport: true, viewOnly: false };
            case 'FC':
                return { canUpload: false, canImport: false, canExport: false, viewOnly: true };
        }
    }

    // Fallback based on numeric departmentId
    switch (agent.departmentId) {
        case 1: // PLA
            return { canUpload: true, canImport: true, canExport: false, viewOnly: true };
        case 2: // LMG
            return { canUpload: true, canImport: true, canExport: true, viewOnly: false };
        case 3: // OP
            return { canUpload: false, canImport: false, canExport: false, viewOnly: true };
        default:
            return { canUpload: false, canImport: false, canExport: false, viewOnly: true };
    }
};

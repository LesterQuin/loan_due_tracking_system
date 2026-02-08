// utils/scope.js
export const resolveScope = (agent) => {
    if (agent.userType === 'Admin') {
        return { level: 'ALL' };
    }

    if (agent.userType === 'MD') {
        return { level: 'ALL' }; // national
    }

    if (agent.userType === 'SD') {
        return {
            level: 'REGION',
            regionId: agent.regionId
        };
    }

    if (agent.userType === 'FC') {
        return {
            level: 'DIVISION',
            regionId: agent.regionId,
            divisionId: agent.divisionId
        };
    }

    return { level: 'NONE' };
};

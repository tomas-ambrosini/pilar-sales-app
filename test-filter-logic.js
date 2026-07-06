const filters = {
    ROLES: { ADMIN: 'SUPER_ADMIN', MANAGER: 'MANAGER', DISPATCHER: 'DISPATCHER' },
    activeRole: 'SUPER_ADMIN',
    pipelineFilter: 'My Deals',
    user: { id: '02e7a65f-a2a2-4cee-af8e-e6cbd44b55f1' }
};

const opp = {
    assigned_salesperson_id: '3b766c98-faa7-4427-9b8e-8eb8b4c947c9' // Evan's ID
};

const isManager = [filters.ROLES.ADMIN, filters.ROLES.MANAGER, filters.ROLES.DISPATCHER].includes(filters.activeRole);
const currentFilter = isManager ? filters.pipelineFilter : 'My Deals';

if (currentFilter === 'My Deals' && opp.assigned_salesperson_id !== filters.user?.id) {
    console.log("Returned early - filtered out!");
} else {
    console.log("NOT filtered out!");
}

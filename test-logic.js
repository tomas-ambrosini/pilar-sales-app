const ROLES = { ADMIN: 'SUPER_ADMIN', MANAGER: 'MANAGER', DISPATCHER: 'DISPATCHER' };
const activeRole = 'SUPER_ADMIN';
const isManager = [ROLES.ADMIN, ROLES.MANAGER, ROLES.DISPATCHER].includes(activeRole);

const pipelineFilter = 'My Deals';
const currentFilter = isManager ? pipelineFilter : 'My Deals';

const opp = { assigned_salesperson_id: 'evan-123' };
const user = { id: 'tomas-456' };

console.log("isManager:", isManager);
console.log("currentFilter:", currentFilter);
console.log("filter condition:", currentFilter === 'My Deals' && opp.assigned_salesperson_id !== user?.id);

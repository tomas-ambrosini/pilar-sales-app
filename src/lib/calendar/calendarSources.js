import { opportunitiesAdapter } from './adapters/opportunitiesAdapter';
import { workOrdersAdapter } from './adapters/workOrdersAdapter';
import { tasksAdapter } from './adapters/tasksAdapter';
import { proposalsAdapter } from './adapters/proposalsAdapter';
import { companyEventsAdapter } from './adapters/companyEventsAdapter';
import { serviceCallsAdapter } from './adapters/serviceCallsAdapter';
import { financeAdapter } from './adapters/financeAdapter';
import { customerAdapter } from './adapters/customerAdapter';

export const calendarSources = [
  opportunitiesAdapter,
  workOrdersAdapter,
  tasksAdapter,
  companyEventsAdapter,
  proposalsAdapter,
  serviceCallsAdapter,
  financeAdapter,
  customerAdapter
];

import { opportunitiesAdapter } from './adapters/opportunitiesAdapter';
import { workOrdersAdapter } from './adapters/workOrdersAdapter';
import { tasksAdapter } from './adapters/tasksAdapter';
import { proposalsAdapter } from './adapters/proposalsAdapter';
import { companyEventsAdapter } from './adapters/companyEventsAdapter';
import { serviceCallsAdapter } from './adapters/serviceCallsAdapter';

export const calendarSources = [
  opportunitiesAdapter,
  workOrdersAdapter,
  tasksAdapter,
  companyEventsAdapter,
  proposalsAdapter,
  serviceCallsAdapter
];

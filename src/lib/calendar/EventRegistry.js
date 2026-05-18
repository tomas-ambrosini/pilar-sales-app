import { calendarSources } from './calendarSources';

class Registry {
  constructor() {
    this.adapters = calendarSources;
  }

  /**
   * Invokes all adapters, aggregates results, and filters.
   * @param {string} dateStart - ISO String boundary
   * @param {string} dateEnd - ISO String boundary
   * @param {object} filters - Current UI filters { department_id, users, event_types }
   */
  async fetchEvents(dateStart, dateEnd, filters = {}) {
    try {
      // 1. Run all adapters in parallel
      const results = await Promise.all(
        this.adapters.map(adapter => adapter(dateStart, dateEnd).catch(err => {
          console.error("Adapter execution failed:", err);
          return [];
        }))
      );

      // 2. Flatten array
      let allEvents = results.flat();

      // 3. Apply Filters
      allEvents = allEvents.filter(ev => {
        // Filter by Event Type
        if (filters.event_types && filters.event_types.length > 0) {
          if (!filters.event_types.includes(ev.event_type)) return false;
        }

        // Filter by Department (If department logic applies)
        if (filters.department_id && filters.department_id !== 'ALL') {
           // We will map this when events are explicitly tagged with dept IDs
           // For now, if the event has a department_id, check it
           if (ev.department_id && ev.department_id !== filters.department_id) return false;
        }

        return true;
      });

      // 4. Sort globally by start date
      allEvents.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

      return allEvents;
    } catch (err) {
      console.error("EventRegistry Error:", err);
      return [];
    }
  }
}

export const EventRegistry = new Registry();

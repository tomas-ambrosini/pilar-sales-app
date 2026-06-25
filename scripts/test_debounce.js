import { debounce } from '../src/utils/debounce.js';

console.log("--- Testing Debounce Utility ---");
let callCount = 0;
const mockFetch = () => {
    callCount++;
    console.log(`Fetch called! Total executions: ${callCount}`);
};

const debouncedFetch = debounce(mockFetch, 100);

console.log("Simulating 5 rapid Realtime DB events in 10ms...");
debouncedFetch();
debouncedFetch();
debouncedFetch();
debouncedFetch();
debouncedFetch();

setTimeout(() => {
    if (callCount === 1) {
        console.log("✅ SUCCESS: Debounce prevented DB throttling. 5 rapid events resulted in exactly 1 fetch.");
    } else {
        console.error("❌ FAIL: Debounce did not work properly.");
    }
}, 200);

export function computeDashboardMetrics(records = [], dateField = 'created_at', days = 7) {
    if (!records || records.length === 0) {
        return {
            chartData: Array.from({ length: days }).map(() => ({ v: 0 })),
            currentValue: 0,
            growthText: '0%',
            isPositive: null
        };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Total up to today
    const currentValue = records.length;

    // Build the chart data for the last 'days' days.
    // For Area charts, we typically want cumulative totals up to that day.
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
        const targetDate = new Date(startOfToday);
        targetDate.setDate(targetDate.getDate() - i);
        targetDate.setHours(23, 59, 59, 999); // End of that day

        const countUpToDay = records.filter(r => {
            const rDate = new Date(r[dateField]);
            return rDate <= targetDate;
        }).length;

        chartData.push({ v: countUpToDay });
    }

    // Calculate growth comparing "new records in last N days" vs "new records in previous N days"
    const periodEnd = now;
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - days);

    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - days);

    const currentPeriodNew = records.filter(r => {
        const d = new Date(r[dateField]);
        return d > periodStart && d <= periodEnd;
    }).length;

    const prevPeriodNew = records.filter(r => {
        const d = new Date(r[dateField]);
        return d > prevPeriodStart && d <= periodStart;
    }).length;

    let growthRaw = 0;
    if (prevPeriodNew === 0) {
        growthRaw = currentPeriodNew > 0 ? 100 : 0;
    } else {
        growthRaw = ((currentPeriodNew - prevPeriodNew) / prevPeriodNew) * 100;
    }

    const isPositive = growthRaw > 0;
    const growthText = `${growthRaw > 0 ? '+' : ''}${growthRaw.toFixed(1)}%`;

    return {
        chartData,
        currentValue,
        growthText,
        isPositive: growthRaw === 0 ? null : isPositive
    };
}

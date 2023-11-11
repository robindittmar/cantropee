import {getTransactions} from "./transaction-service";

interface ChartData {
    [key: number]: number;
}

export async function getChart(organizationId: string) {
    const now = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const transactions = await getTransactions(
        organizationId,
        startDate,
        now,
        0,
        100000000,
        true,
        undefined,
        undefined,
    );

    let values: ChartData = {};
    let currentTotal = 0;
    let currentMonth: number | undefined = undefined;
    for (const t of transactions.data) {
        if (currentMonth === undefined) {
            currentMonth = t.effectiveTimestamp.getMonth();

            console.log('1st month: ' + currentMonth);
        }
        if (t.effectiveTimestamp.getMonth() != currentMonth) {
            values[currentMonth + 1] = currentTotal;
            currentTotal = 0;
            currentMonth = t.effectiveTimestamp.getMonth();

            console.log('next month: ' + currentMonth);
        }

        currentTotal += t.value;
        console.log(`+ ${t.value} = ${currentTotal}`);
    }

    // We need to apply last accumulation
    // if (t.effectiveTimestamp.getMonth() != currentMonth) {
    //     values[currentMonth + 1] = currentTotal;
    //     currentTotal = 0;
    //     currentMonth = t.effectiveTimestamp.getMonth();
    //
    //     console.log('next month: ' + currentMonth);
    // }

    console.log(values);
    return values;
}

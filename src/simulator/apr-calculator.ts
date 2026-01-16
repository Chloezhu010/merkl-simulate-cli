export function calculateApr(
    tokenPrice: number, 
    tokenAmount: number, 
    durationDays: number, 
    tvlUsd: number
): {totalBudget: number, dailyReward: number, apr: number }
{
    // input check
    if (tvlUsd <= 0)
        throw new Error("TVL must be greater than 0");
    if (durationDays <= 0)
        throw new Error("Duration must be greater than 0 days");
    // calculate apr
    const totalBudget = tokenPrice * tokenAmount;
    const dailyReward = totalBudget / durationDays;
    const apr = dailyReward * 365 * 100 / tvlUsd;
    return { totalBudget, dailyReward, apr};
}

// // test
// try {
//     // console.log(calculateApr(0.1, 300000, 14, 0));
//     console.log(calculateApr(0.1, 300000, 14, 100000));
//     console.log(calculateApr(0.1, 300000, 14, 2000000));
// } catch (error) {
//     console.log('Caught: ', error.message);
// }



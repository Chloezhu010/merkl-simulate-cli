import { calculateApr } from "./apr-calculator.js";

interface Campaign {
    id: string,
    apr: number
}

// rank the client's campaign APR against existing campaigns
export function rankTargetCampaign(existing: Campaign[], proposedApr: number){
    const all = [
        ...existing,
        { id: "YOUR_CAMPAIGN", apr: proposedApr}
    ];

    // sort by apr descending
    all.sort((a, b) => b.apr - a.apr);
    // find the ranking
    const targetRank = all.findIndex(c => c.id === "YOUR_CAMPAIGN") + 1;
    return {ranked: all, YOUR_RANK: targetRank};
}

function budgetForApr(
    apr: number,
    tvlUsd: number,
    durationDays: number
): number {
    const dailyNeeded = (apr * tvlUsd) / (100 * 365);
    return (dailyNeeded * durationDays);
}

// budget amont to reach certain APR ranking
export function budgetToReachRank(
    targetRank: number,
    existingCampaigns: Campaign[],
    tvlUsd: number,
    durationDays: number
): number | null {
    // sort existing campaigns by apr
    const sorted = [...existingCampaigns].sort((a, b) => b.apr - a.apr);
    // check target rank input
    if (targetRank < 1 || targetRank > sorted.length + 1)
        return null;
    // beat the top campaign
    if (targetRank == 1){
        const topApr = sorted[0]?.apr;
        return budgetForApr(topApr, tvlUsd, durationDays);
    }
    // beat campaign at index (targetRank - 1)
    const aprToBeat = sorted[targetRank - 1]?.apr;
    return budgetForApr(aprToBeat, tvlUsd, durationDays);
}

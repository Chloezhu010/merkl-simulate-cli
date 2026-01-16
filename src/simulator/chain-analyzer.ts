import type { Opportunity } from '@merkl/api';
import { MerklClient } from '../api/client.js';

// ============================================================================
// Types
// ============================================================================

export interface ChainAnalysis {
    chainId: number;
    chainName?: string;
    summary: {
        totalOpportunities: number;
        totalTvl: number;
        totalDailyRewards: number;
        avgApr: number;
        weightedAvgApr: number;
        totalLiveCampaigns: number;
    };
    byAction: {
        action: string;
        count: number;
        totalTvl: number;
        avgApr: number;
        weightedAvgApr: number;
    }[];
    topPoolsByTvl: PoolSummary[];
    // underservedPools: PoolSummary[];
}

export interface PoolSummary {
    identifier: string;
    name: string;
    action: string;
    tvl: number;
    apr: number;
    dailyRewards: number;
    liveCampaigns: number;
}

// ============================================================================
// Helpers
// ============================================================================

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const avg = (arr: number[]) => arr.length? sum(arr) / arr.length : 0;
const weightedAvg = (values: number[], weights: number[]): number => {
    const totalWeight = sum(weights);
    if (totalWeight === 0) return 0;
    const weightedSum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
    return weightedSum / totalWeight;
}

function toPoolSummary(o: Opportunity): PoolSummary {
    return {
        identifier: o.identifier,
        name: o.name,
        action: o.action,
        tvl: o.tvl ?? 0,
        apr: o.apr ?? 0,
        dailyRewards: o.dailyRewards ?? 0,
        liveCampaigns: o.liveCampaigns ?? 0,
    }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Analyze all opportunities on a chain.
 * @param chainId - Chain ID (e.g., 42161 for Arbitrum)
 * @param fetchAll - If true, paginate through ALL opportunities. If false, fetch top 100 by TVL.
 */
export async function analyzeChain(chainId: number, fetchAll = false): Promise<ChainAnalysis> {
    const client = new MerklClient();

    // fetch opportunities basded on fetchAll flag
    let opps;
    if (fetchAll) {
        console.log(`Fetching ALL opportunities on chain ${chainId}...`);
        opps = await client.getAllOppByChain(chainId, { status: 'LIVE', sort: 'tvl' });
    } else {
        console.log(`Fetching top 100 opportunities by TVL on chain ${chainId}...`);
        opps = await client.getOppByChain(chainId, { status: 'LIVE', sort: 'tvl', items: 100 });
    }

    if (!opps.length)
        throw new Error(`No opportunities found on chain ${chainId}`);

    // summary stats
    const tvls = opps.map((o: Opportunity) => o.tvl ?? 0);
    const aprs = opps.map((o: Opportunity) => o.apr ?? 0);
    const dailyRewards = opps.map((o: Opportunity) => o.dailyRewards ?? 0);
    const liveCampaigns = opps.map((o: Opportunity) => o.liveCampaigns ?? 0);
    const weightedAvgApr = weightedAvg(aprs, tvls);

    // group by action
    const actionMap = new Map<string, Opportunity[]>();
    for (const opp of opps){
        const action = opp.action ?? 'UNKNOWN';
        const list = actionMap.get(action) ?? [];
        list.push(opp);
        actionMap.set(action, list);
    }
    const byAction = Array.from(actionMap.entries())
        .map(([action, opps]) => {
            const actionAprs = opps.map((o: Opportunity) => o.apr ?? 0);
            const actionTvls = opps.map((o: Opportunity) => o.tvl ?? 0);

            return {
                action,
                count: opps.length,
                totalTvl: sum(opps.map((o: Opportunity) => o.tvl ?? 0)),
                avgApr: avg(opps.map((o: Opportunity) => o.apr ?? 0)),
                weightedAvgApr: weightedAvg(actionAprs, actionTvls),
            };
        })
        .sort((a, b) => b.totalTvl - a.totalTvl);
    
    // top pools by tvl
    const topPoolsByTvl = opps.slice(0, 10).map(toPoolSummary);

    // // underserved: high tvl but low apr
    // const underservedPools = [...opps]
    //     .filter(o => (o.tvl?? 0) >= 1_000_000 && (o.apr??0) <= 5) // e.g., tvl >= $1M and apr <= 5%
    //     .sort((a, b) => (b.tvl??0) - (a.tvl??0)) // sort by tvl desc
    //     .slice(0, 10) // top 10
    //     .map(toPoolSummary);

    // return value
    return {
        chainId,
        chainName: opps[0]?.chain?.name,
        summary: {
            totalOpportunities: opps.length,
            totalTvl: sum(tvls),
            totalDailyRewards: sum(dailyRewards),
            avgApr: avg(aprs),
            weightedAvgApr: weightedAvgApr,
            totalLiveCampaigns: sum(liveCampaigns),
        },
        byAction,
        topPoolsByTvl,
        // underservedPools,
    };
}
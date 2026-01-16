import { MerklClient } from '../api/client.js';
import { calculateApr } from './apr-calculator.js';
import { parseCampain } from './campaign-parser.js';
import { rankTargetCampaign, budgetToReachRank  } from './ranker.js';

interface SimulationInput {
    identifier: string,     // pool identifier for api lookup
    tokenPrice: number,     // reward token's USD price
    tokenAmount: number,    // total tokens plan to distribute
    durationDays: number,   // campaign duration days
    targetTvl?: number,     // override TVL (for new pools)
    targetRank?: number     // client's target APR rank
}

/**
 * Simulates adding a new incentive campaign to an existing Merkl opportunity.
 * Calculates your APR contribution and ranks you against existing campaigns.
 * 
 * @param input.identifier - Pool identifier for API lookup (e.g., "0x852F...")
 * @param input.tokenPrice - Reward token's USD price
 * @param input.tokenAmount - Total tokens to distribute
 * @param input.durationDays - Campaign duration in days
 * @param input.targetTvl - Override TVL (optional, for new pools)
 * @param input.targetRank - Desired rank to calculate required budget (optional)
 * 
 * @returns Opportunity details, your campaign metrics (APR, rank, budget to target), and existing campaigns
 */
export async function simulate(input: SimulationInput) {
    const client = new MerklClient();

    // fetch opp from api
    const opp = await client.getOppByIdentifier(input.identifier);
    if (!opp)
        throw new Error(`Opportunity not found: ${input.identifier}`);

    // determine tvl (api value or user provided)
    const tvl = input.targetTvl?? opp.tvl;
    if (tvl <= 0)
        throw new Error ('TVL must be larger than 0. Provide --target-tvl for new pools.');

    // calculate user's campaign apr
    const { totalBudget, dailyReward, apr: yourApr } = calculateApr(
        input.tokenPrice,
        input.tokenAmount,
        input.durationDays,
        tvl
    );

    // parse existing campaigns
    const existingCampaigns = parseCampain(opp);

    // rank user's campaign apr vs existing campaigns
    const { ranked, YOUR_RANK } = rankTargetCampaign(existingCampaigns, yourApr);

    // calculate budget amount based on target rank
    let budgetToReach;
    if (input.targetRank){
        budgetToReach = budgetToReachRank(input.targetRank, existingCampaigns, tvl, input.durationDays);
    }    

    // return results
    return {
        opportunity: {
            name: opp.name,
            action: opp.action,
            tvl: opp.tvl,
            currentApr: opp.apr,
            liveCampaigns: opp.liveCampaigns
        },
        yourCampaign: {
            TotalBudget: totalBudget,
            DailyReward: dailyReward,
            APR: yourApr,
            CurrentRank: YOUR_RANK,
            TargetRank: input.targetRank,
            BudgetToReach: budgetToReach,
        },
        existingCampaigns,
    }
}
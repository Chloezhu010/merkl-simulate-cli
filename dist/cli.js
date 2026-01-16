#!/usr/bin/env node

// src/commands/cli.ts
import { Command } from "commander";

// src/api/client.ts
import { MerklApi } from "@merkl/api";
import pLimit from "p-limit";
var merkl = MerklApi("https://api.merkl.xyz").v4;
var limit = pLimit(10);
var MerklClient = class {
  // get opportunity by identifier
  async getOppByIdentifier(identifier) {
    const response = await limit(() => merkl.opportunities.index.get({
      query: { identifier }
    }));
    return response.data?.[0] ?? null;
  }
  // list opportunity by chain (single page)
  async getOppByChain(chainId, options) {
    const response = await limit(
      () => merkl.opportunities.index.get({
        query: {
          chainId,
          status: options?.status ?? "LIVE",
          sort: options?.sort ?? "tvl",
          items: options?.items ?? 20,
          page: options?.page ?? 0
        }
      })
    );
    return response.data ?? [];
  }
  // fetch ALL opportunities on a chain (with pagination)
  async getAllOppByChain(chainId, options) {
    const allOpps = [];
    const pageSize = 100;
    let page = 0;
    while (true) {
      const opps = await this.getOppByChain(chainId, {
        status: options?.status ?? "LIVE",
        sort: options?.sort ?? "tvl",
        items: pageSize,
        page
      });
      if (opps.length === 0) break;
      allOpps.push(...opps);
      if (opps.length < pageSize) break;
      page++;
    }
    return allOpps;
  }
  // get chain info
  async getChain(chainId) {
    const response = await limit(
      () => merkl.chains({ id: chainId }).get()
    );
    return response.data;
  }
};
var merklClient = new MerklClient();

// src/simulator/apr-calculator.ts
function calculateApr(tokenPrice, tokenAmount, durationDays, tvlUsd) {
  if (tvlUsd <= 0)
    throw new Error("TVL must be greater than 0");
  if (durationDays <= 0)
    throw new Error("Duration must be greater than 0 days");
  const totalBudget = tokenPrice * tokenAmount;
  const dailyReward = totalBudget / durationDays;
  const apr = dailyReward * 365 * 100 / tvlUsd;
  return { totalBudget, dailyReward, apr };
}

// src/simulator/campaign-parser.ts
function parseCampain(opp) {
  const campaigns = [];
  for (const aprItem of opp.aprRecord.breakdowns) {
    campaigns.push({
      id: aprItem.identifier,
      apr: aprItem.value,
      category: aprItem.distributionType
    });
  }
  return campaigns;
}

// src/simulator/ranker.ts
function rankTargetCampaign(existing, proposedApr) {
  const all = [
    ...existing,
    { id: "YOUR_CAMPAIGN", apr: proposedApr }
  ];
  all.sort((a, b) => b.apr - a.apr);
  const targetRank = all.findIndex((c) => c.id === "YOUR_CAMPAIGN") + 1;
  return { ranked: all, YOUR_RANK: targetRank };
}
function budgetForApr(apr, tvlUsd, durationDays) {
  const dailyNeeded = apr * tvlUsd / (100 * 365);
  return dailyNeeded * durationDays;
}
function budgetToReachRank(targetRank, existingCampaigns, tvlUsd, durationDays) {
  const sorted = [...existingCampaigns].sort((a, b) => b.apr - a.apr);
  if (targetRank < 1 || targetRank > sorted.length + 1)
    return null;
  if (targetRank == 1) {
    const topApr = sorted[0]?.apr;
    return budgetForApr(topApr, tvlUsd, durationDays);
  }
  const aprToBeat = sorted[targetRank - 1]?.apr;
  return budgetForApr(aprToBeat, tvlUsd, durationDays);
}

// src/simulator/simulate.ts
async function simulate(input) {
  const client = new MerklClient();
  const opp = await client.getOppByIdentifier(input.identifier);
  if (!opp)
    throw new Error(`Opportunity not found: ${input.identifier}`);
  const tvl = input.targetTvl ?? opp.tvl;
  if (tvl <= 0)
    throw new Error("TVL must be larger than 0. Provide --target-tvl for new pools.");
  const { totalBudget, dailyReward, apr: yourApr } = calculateApr(
    input.tokenPrice,
    input.tokenAmount,
    input.durationDays,
    tvl
  );
  const existingCampaigns = parseCampain(opp);
  const { ranked, YOUR_RANK } = rankTargetCampaign(existingCampaigns, yourApr);
  let budgetToReach;
  if (input.targetRank) {
    budgetToReach = budgetToReachRank(input.targetRank, existingCampaigns, tvl, input.durationDays);
  }
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
      BudgetToReach: budgetToReach
    },
    existingCampaigns
  };
}

// src/simulator/chain-analyzer.ts
var sum = (arr) => arr.reduce((a, b) => a + b, 0);
var avg = (arr) => arr.length ? sum(arr) / arr.length : 0;
var weightedAvg = (values, weights) => {
  const totalWeight = sum(weights);
  if (totalWeight === 0) return 0;
  const weightedSum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
  return weightedSum / totalWeight;
};
function toPoolSummary(o) {
  return {
    identifier: o.identifier,
    name: o.name,
    action: o.action,
    tvl: o.tvl ?? 0,
    apr: o.apr ?? 0,
    dailyRewards: o.dailyRewards ?? 0,
    liveCampaigns: o.liveCampaigns ?? 0
  };
}
async function analyzeChain(chainId, fetchAll = false) {
  const client = new MerklClient();
  let opps;
  if (fetchAll) {
    console.log(`Fetching ALL opportunities on chain ${chainId}...`);
    opps = await client.getAllOppByChain(chainId, { status: "LIVE", sort: "tvl" });
  } else {
    console.log(`Fetching top 100 opportunities by TVL on chain ${chainId}...`);
    opps = await client.getOppByChain(chainId, { status: "LIVE", sort: "tvl", items: 100 });
  }
  if (!opps.length)
    throw new Error(`No opportunities found on chain ${chainId}`);
  const tvls = opps.map((o) => o.tvl ?? 0);
  const aprs = opps.map((o) => o.apr ?? 0);
  const dailyRewards = opps.map((o) => o.dailyRewards ?? 0);
  const liveCampaigns = opps.map((o) => o.liveCampaigns ?? 0);
  const weightedAvgApr = weightedAvg(aprs, tvls);
  const actionMap = /* @__PURE__ */ new Map();
  for (const opp of opps) {
    const action = opp.action ?? "UNKNOWN";
    const list = actionMap.get(action) ?? [];
    list.push(opp);
    actionMap.set(action, list);
  }
  const byAction = Array.from(actionMap.entries()).map(([action, opps2]) => {
    const actionAprs = opps2.map((o) => o.apr ?? 0);
    const actionTvls = opps2.map((o) => o.tvl ?? 0);
    return {
      action,
      count: opps2.length,
      totalTvl: sum(opps2.map((o) => o.tvl ?? 0)),
      avgApr: avg(opps2.map((o) => o.apr ?? 0)),
      weightedAvgApr: weightedAvg(actionAprs, actionTvls)
    };
  }).sort((a, b) => b.totalTvl - a.totalTvl);
  const topPoolsByTvl = opps.slice(0, 10).map(toPoolSummary);
  return {
    chainId,
    chainName: opps[0]?.chain?.name,
    summary: {
      totalOpportunities: opps.length,
      totalTvl: sum(tvls),
      totalDailyRewards: sum(dailyRewards),
      avgApr: avg(aprs),
      weightedAvgApr,
      totalLiveCampaigns: sum(liveCampaigns)
    },
    byAction,
    topPoolsByTvl
    // underservedPools,
  };
}

// src/commands/cli.ts
var program = new Command();
program.name("merkl-simulate-cli").description("CLI tool for simulating Merkl incentive campaigns and analyzing opportunities.").version("1.0.0");
program.command("simulate").description("Simulate adding a new incentive campaign to an opportunity.").requiredOption("-i, --identifier <string>", 'Pool identifier for API lookup (e.g., "0x852F...")').requiredOption("-p, --token-price <number>", "Reward token's USD price", "Reward token USD price").requiredOption("-a, --token-amount <number>", "Total reward tokens to distribute", "Total reward tokens to distribute").requiredOption("-d, --duration-days <number>", "Campaign duration in days", "Campaign duration in days").option("-t, --target-tvl <number>", "Override TVL (optional, for new pools)").option("-r, --target-rank <number>", "Desired rank to calculate required budget (optional)").action(async (options) => {
  const tokenPrice = parseFloat(options.tokenPrice);
  const tokenAmount = parseFloat(options.tokenAmount);
  const durationDays = parseInt(options.durationDays);
  const targetTvl = options.targetTvl ? parseFloat(options.targetTvl) : void 0;
  const targetRank = options.targetRank ? parseInt(options.targetRank) : void 0;
  const result = await simulate({
    identifier: options.identifier,
    tokenPrice,
    tokenAmount,
    durationDays,
    targetTvl,
    targetRank
  });
  console.log(result);
});
program.command("analyze-chain").description("Analyze all opportunities on a specified chain.").requiredOption("-i, --chain-id <number>", "Chain ID (e.g., 1 for Ethereum)").option("-a, --fetch-all", "Fetch ALL opportunities with pagination (slower)", false).action(async (options) => {
  const chainId = parseInt(options.chainId);
  const fetchAll = options.fetchAll;
  const result = await analyzeChain(chainId, fetchAll);
  console.log(result);
});
program.parse();

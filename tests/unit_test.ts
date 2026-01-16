import { MerklClient } from '../src/api/client.js';
import { parseCampain } from '../src/simulator/campaign-parser.js';
import { rankTargetCampaign } from '../src/simulator/ranker.js';
import { budgetToReachRank } from '../src/simulator/ranker.js';
import { simulate } from '../src/simulator/simulate.js';
import { analyzeChain } from '../src/simulator/chain-analyzer.js';


// const client = new MerklClient();
// const opp = await client.getAllOppByChain(9745, {status: 'LIVE', sort: 'tvl' });
// console.log(opp);
// const opp = await client.getOppByIdentifier("0xd1074E0AE85610dDBA0147e29eBe0D8E5873a000");
// const campaigns = parseCampain(opp);
// // console.log(campaigns);
// console.log(rankTargetCampaign(campaigns, 0.5));

// const tvl = 500000;
// const duration = 14;
// console.log("Budget to rank on par with #1:", budgetToReachRank(1, campaigns, tvl, duration));
// console.log("Budget to rank on par with #2:", budgetToReachRank(2, campaigns, tvl, duration));

// // Test simulate()
// simulate({
//     identifier: "0x852FF1EC21D63b405eC431e04AE3AC760e29263D",
//     tokenPrice: 0.1,
//     tokenAmount: 300000,
//     durationDays: 14,
//     targetRank: 1
// }).then (result => {
//     console.log(result);
// }).catch (err => {
//     console.error('Error:', err.message);
// })

// test analyzeChain()
analyzeChain(143, true).then(result => {
    console.log(result);
}).catch(err => {
    console.error('Error:', err.message);
});


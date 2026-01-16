import { MerklClient } from '../api/client.ts';

async function explore(){
    const client = new MerklClient();

    // fetch a real opp
    const opp = await client.getOppByIdentifier(
        "0x8014e0076e5393e62c49a7134070d8fccc922e46BORROW_BL");
    // show everything
    console.log("== Full Opp ==");
    console.log(opp);

    // // show items i care
    // console.log("Name:", opp.name);
    // console.log("Action:", opp.action);
    // console.log("TVL:", opp.tvl);
    // console.log("APR:", opp.apr);
    // console.log("Daily reward:", opp.dailyRewards);
    // console.log("Live campaigns:", opp.liveCampaigns);
    // console.log("\n=== APR breakdown ===")
    // console.dir(opp.aprRecord, { depth: null });
    // console.log("\n=== Reward breakdown ===");
    // console.dir(opp.rewardsRecord, { depth: null });

}

explore();
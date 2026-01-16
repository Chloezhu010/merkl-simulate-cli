export function parseCampain(opp: any){
    const campaigns = [];

    for (const aprItem of opp.aprRecord.breakdowns){
        campaigns.push({
            id: aprItem.identifier,
            apr: aprItem.value,
            category: aprItem.distributionType
        });
    }
    return campaigns;
}

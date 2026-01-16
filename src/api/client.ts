import { MerklApi } from '@merkl/api';
import pLimit from 'p-limit';

const merkl = MerklApi('https://api.merkl.xyz').v4;
const limit = pLimit(10); // 10 request per second

export class MerklClient {
    // get opportunity by identifier
    async getOppByIdentifier(identifier: string) {
        const response = await limit(() => 
            merkl.opportunities.index.get({
                query: { identifier }
        }));
        return response.data?.[0] ?? null;
    }

    // list opportunity by chain (single page)
    async getOppByChain(chainId: number, options?: {
        status?: 'LIVE' | 'PAST' | 'SOON';
        sort?: 'apr' | 'tvl' | 'rewards';
        items?: number;
        page?: number;
    }){
        const response = await limit(() =>
            merkl.opportunities.index.get({
                query: {
                    chainId,
                    status: options?.status ?? 'LIVE',
                    sort: options?.sort ?? 'tvl',
                    items: options?.items ?? 20,
                    page: options?.page ?? 0,
                }
            })
        );
        return response.data ?? [];
    }

    // fetch ALL opportunities on a chain (with pagination)
    async getAllOppByChain(chainId: number, options?: {
        status?: 'LIVE' | 'PAST' | 'SOON';
        sort?: 'apr' | 'tvl' | 'rewards';
    }) {
        const allOpps: Awaited<ReturnType<typeof this.getOppByChain>> = [];
        const pageSize = 100;
        let page = 0;

        while (true) {
            const opps = await this.getOppByChain(chainId, {
                status: options?.status ?? 'LIVE',
                sort: options?.sort ?? 'tvl',
                items: pageSize,
                page,
            });

            if (opps.length === 0) break;

            allOpps.push(...opps);

            // If got fewer than pageSize, we've reached the end
            if (opps.length < pageSize) break;

            page++;
        }

        return allOpps;
    }

    // get chain info
    async getChain(chainId: number){
        const response = await limit(() =>
            merkl.chains({ id: chainId }).get()
        );
        return response.data;
    }
}

// export singleton
export const merklClient = new MerklClient();


// // Tests
// async function main() {
//   const client = new MerklClient();
//   // Test 1: Get by identifier
//   const opp = await (client.getOppByIdentifier('0x8014e0076e5393e62c49a7134070d8fccc922e46BORROW_BL'));
//   console.log("Opportunity: ", opp?.name, "APR: ", opp?.apr);
//   // Test 2: List by chain
//   const opps = await (client.getOppByChain(1, { items: 3}));
//   console.log("Top 3 on Ethereum: ", opps.map(o => o.name));
//   // Test 3: get chain info on Ethereum
//   const chainInfo = await (client.getChain(1));
//   console.log("Ethereum chain info: ", chainInfo);
// }

// main();
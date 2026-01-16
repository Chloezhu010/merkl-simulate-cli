#!/usr/bin/env node
import { Command } from "commander";
import { simulate } from "../simulator/simulate.js";
import { analyzeChain } from "../simulator/chain-analyzer.js";

const program = new Command();

// main command
program
    .name("merkl-simulate-cli")
    .description("CLI tool for simulating Merkl incentive campaigns and analyzing opportunities.")
    .version("1.0.0");

// subcommand: simulate
program
    .command('simulate')
    .description('Simulate adding a new incentive campaign to an opportunity.')
    .requiredOption('-i, --identifier <string>', 'Pool identifier for API lookup (e.g., "0x852F...")')
    .requiredOption('-p, --token-price <number>', 'Reward token\'s USD price', 'Reward token USD price')
    .requiredOption('-a, --token-amount <number>', 'Total reward tokens to distribute', 'Total reward tokens to distribute')
    .requiredOption('-d, --duration-days <number>', 'Campaign duration in days', 'Campaign duration in days')
    .option('-t, --target-tvl <number>', 'Override TVL (optional, for new pools)')
    .option('-r, --target-rank <number>', 'Desired rank to calculate required budget (optional)')
    .action(async (options) => {
        // parse options to number
        const tokenPrice = parseFloat(options.tokenPrice);
        const tokenAmount = parseFloat(options.tokenAmount);
        const durationDays = parseInt(options.durationDays);
        const targetTvl = options.targetTvl ? parseFloat(options.targetTvl) : undefined;
        const targetRank = options.targetRank ? parseInt(options.targetRank) : undefined;
        // call simulate()
        const result = await simulate({
            identifier: options.identifier,
            tokenPrice,
            tokenAmount,
            durationDays,
            targetTvl,
            targetRank
        });
        // format and print output
        console.log(result); // TODO: improve output formatting
    })

// subcommand: analyze-chain
program
    .command('analyze-chain')
    .description('Analyze all opportunities on a specified chain.')
    .requiredOption('-i, --chain-id <number>', 'Chain ID (e.g., 1 for Ethereum)')
    .option('-a, --fetch-all', 'Fetch ALL opportunities with pagination (slower)', false)
    .action(async (options) => {
        // parse chainid & fetchAll flag
        const chainId = parseInt(options.chainId);
        const fetchAll = options.fetchAll;
        // call analyzeChain()
        const result = await analyzeChain(chainId, fetchAll);
        // format and print output
        console.log(result); // TODO: improve output formatting
    });

// parse CLI args
program.parse();
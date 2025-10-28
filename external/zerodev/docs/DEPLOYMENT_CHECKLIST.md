# Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

### Tools & Setup
- [ ] Foundry installed (`forge --version`)
- [ ] Just installed (`just --version`)
- [ ] jq installed (`jq --version`) - for deployment tracking
- [ ] Git initialized (`git init`)
- [ ] Submodule set up (`just setup`)
- [ ] Contracts compiled (`just build`)

### Configuration
- [ ] `.env` file created and configured
  - [ ] PRIVATE_KEY set (with funds for gas)
  - [ ] ETHERSCAN_API_KEY set (optional, for verification)
- [ ] `networks.toml` configured
  - [ ] Network name set
  - [ ] RPC URL set
  - [ ] Chain ID set
  - [ ] Explorer details configured
  - [ ] EntryPoint address set
- [ ] Deployer wallet funded with gas tokens
- [ ] Test deployment on testnet first (recommended)

## Deployment Steps

### Testnet Deployment

- [ ] Network configured in `networks.toml`
- [ ] Verify RPC URL is accessible
- [ ] Deployer wallet has testnet tokens (0.1 ETH recommended)
- [ ] EntryPoint address: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- [ ] List available networks: `just list-networks`
- [ ] Deploy: `just deploy-network <network-name>`
- [ ] Verify addresses saved: `just show-deployments`
- [ ] Verify contracts on block explorer (if configured)
- [ ] Test basic functionality:
  - [ ] KernelFactory can create accounts
  - [ ] Validator can validate signatures
  - [ ] Kernel account can execute transactions

### Mainnet Deployment

- [ ] **SECURITY REVIEW COMPLETED**
- [ ] All testnet tests passed
- [ ] Deployer wallet has sufficient gas tokens
- [ ] Mainnet network configured in `networks.toml`
- [ ] EntryPoint address verified: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- [ ] Deployment private key is from a secure, dedicated deployer wallet
- [ ] List networks: `just list-networks`
- [ ] Deploy: `just deploy-network <mainnet-network>`
- [ ] Verify addresses: `just show-deployments`
- [ ] Verify all contracts on block explorer
- [ ] **DO NOT DELETE DEPLOYMENT WALLET** until verified
- [ ] Backup `deployments.json` securely

## Post-Deployment

- [ ] Verify addresses saved in `deployments.json`
- [ ] View deployments: `just show-deployments`
- [ ] Verify all contracts on block explorer
- [ ] Test contract interactions
- [ ] Document deployment in project records
- [ ] Tag the git commit: `git tag v3.1-deployment-NETWORK`
- [ ] Backup deployment artifacts:
  - [ ] `deployments.json`
  - [ ] `contracts/kernel/broadcast/`
- [ ] Share deployment addresses with team (securely)
- [ ] Update application configuration with new addresses

## Expected Gas Costs (Approximate)

| Contract | Gas Usage | Cost @ 20 gwei | Cost @ 50 gwei |
|----------|-----------|----------------|----------------|
| Kernel | ~3.5M | 0.07 ETH | 0.175 ETH |
| KernelFactory | ~800K | 0.016 ETH | 0.04 ETH |
| MultiChainValidator | ~1.2M | 0.024 ETH | 0.06 ETH |
| **Total** | **~5.5M** | **~0.11 ETH** | **~0.275 ETH** |

*Note: Actual costs vary based on network congestion and optimization settings*

## Troubleshooting

### Build Fails
```bash
just clean
cd contracts/kernel
forge install --force
cd ../..
just build
```

### Deployment Fails - Insufficient Funds
- Check wallet balance: `cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL`
- Ensure at least 0.15 ETH for mainnet, 0.1 Sepolia ETH for testnet

### Deployment Fails - RPC Issues
- Verify RPC URL is accessible: `curl $RPC_URL`
- Check rate limits on RPC provider
- Try alternative RPC endpoint

### Verification Fails
- Ensure ETHERSCAN_API_KEY is set correctly
- Wait a few minutes and retry verification:
  ```bash
  just verify <ADDRESS> <CONTRACT> $RPC_URL <ARGS>
  ```

## Multi-Chain Deployment

For deploying to multiple chains simultaneously:

- [ ] Configure all target networks in `networks.toml`
- [ ] Verify each network's RPC URL and configuration
- [ ] Ensure deployer wallet is funded on all target chains
- [ ] List networks: `just list-networks`
- [ ] Deploy: `just deploy-multi network-a network-b network-c`
- [ ] Verify all deployments: `just show-deployments`
- [ ] Verify contracts on each chain's explorer
- [ ] Document all chain-specific addresses

## Resources

- 📖 [Quick Reference](QUICKREF.md) - Command cheat sheet
- 🌐 [Multi-Chain Deployment](MULTI_CHAIN_DEPLOYMENT.md) - Detailed multi-chain guide
- 📦 [Deployment Tracking](DEPLOYMENT_TRACKING.md) - Address tracking system
- 🔧 [Fixes & Troubleshooting](FIXES.md) - Common issues
- ZeroDev Docs: https://docs.zerodev.app/
- Kernel Repo: https://github.com/zerodevapp/kernel
- ERC-4337 Resources: https://eips.ethereum.org/EIPS/eip-4337

## Notes

- Always deploy to testnet first
- Use `networks.toml` for network configuration (not `.env`)
- Addresses are automatically tracked in `deployments.json`
- Keep deployment private keys separate from operational keys
- Backup both `deployments.json` and the `broadcast/` directory

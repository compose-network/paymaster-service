# Multi-Chain Deployment Guide

Deploy Kernel contracts to multiple EVM chains with ease using network configurations.

## Quick Start

### 1. Configure Networks

Edit `networks.toml` to add your rollup chains:

```toml
[networks.rollup-a]
name = "Rollup A Testnet"
rpc_url = "https://rollup-a-bck.explorer.testnet.compose.network/api/eth-rpc"
chain_id = 12345
explorer_type = "blockscout"
explorer_url = "https://rollup-a-bck.explorer.testnet.compose.network"
explorer_api_url = "https://rollup-a-bck.explorer.testnet.compose.network/api/"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

### 2. List Available Networks

```bash
just list-networks
```

Output:
```
Available networks:
  - sepolia
  - rollup-a
  - rollup-b
```

### 3. Deploy to Single Network

```bash
# Deploy to Sepolia
just deploy-network sepolia

# Deploy to your rollup
just deploy-network rollup-a
```

### 4. Deploy to Multiple Networks

```bash
# Deploy to 2 networks
just deploy-multi rollup-a rollup-b

# Deploy to all your production networks
just deploy-multi mainnet base optimism arbitrum polygon
```

### 5. View Deployment Addresses

Addresses are automatically saved to `deployments.json` after each deployment:

```bash
# View all deployments
just show-deployments

# Get addresses for specific network
just get-deployment rollup-a
```

**deployments.json structure:**
```json
{
  "rollup-a": {
    "chain_id": "11111",
    "Kernel": "0x...",
    "KernelFactory": "0x...",
    "MultiChainValidator": "0x...",
    "deployed_at": "2025-01-15 22:30:45 UTC"
  }
}
```

## Network Configuration

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Human-readable name | `"Rollup A Testnet"` |
| `rpc_url` | RPC endpoint | `"https://..."` |
| `chain_id` | Chain ID | `12345` |
| `explorer_type` | `"blockscout"` or `"etherscan"` | `"blockscout"` |
| `explorer_url` | Explorer homepage | `"https://..."` |
| `explorer_api_url` | Explorer API endpoint | `"https://.../api/"` |
| `entrypoint` | ERC-4337 EntryPoint address | `"0x0000...032"` |

### Blockscout Configuration

For Blockscout explorers:

```toml
explorer_type = "blockscout"
explorer_url = "https://explorer.yourchain.com"
explorer_api_url = "https://explorer.yourchain.com/api/"
```

### Etherscan Configuration

For Etherscan-compatible explorers:

```toml
explorer_type = "etherscan"
explorer_url = "https://etherscan.io"
explorer_api_url = "https://api.etherscan.io/api"
```

**Note**: For Etherscan, you need `ETHERSCAN_API_KEY` in your `.env` file.

## Verification

### Automatic Verification (During Deployment)

Verification happens automatically based on `explorer_type` in `networks.toml`.

### Manual Verification

#### Blockscout

```bash
just verify-blockscout rollup-a <CONTRACT_ADDRESS> src/Kernel.sol:Kernel
```

#### Etherscan

```bash
just verify-etherscan sepolia <CONTRACT_ADDRESS> src/Kernel.sol:Kernel <CONSTRUCTOR_ARGS>
```

#### Verify All Contracts

After deployment, verify all three contracts at once:

```bash
just verify-all rollup-a \
  0xKERNEL_ADDRESS \
  0xFACTORY_ADDRESS \
  0xVALIDATOR_ADDRESS
```

## Deployment Workflows

### Scenario 1: Deploy to Single Testnet

```bash
# 1. Configure network in networks.toml
# 2. Deploy
just deploy-network rollup-a

# 3. Save addresses (they're printed in output)
# Kernel:             0x...
# KernelFactory:      0x...
# MultiChainValidator: 0x...

# 4. Verify (if needed)
just verify-all rollup-a 0xKERNEL 0xFACTORY 0xVALIDATOR
```

### Scenario 2: Deploy to Multiple Testnets

```bash
# Deploy to all your test networks
just deploy-multi rollup-a-testnet rollup-b-testnet

# Contracts will be deployed sequentially
# Addresses printed for each network
```

### Scenario 3: Production Deployment

```bash
# 1. Test on testnets first
just deploy-network rollup-a-testnet

# 2. Add production networks to networks.toml
# 3. Deploy to production
just deploy-network rollup-a-mainnet
just deploy-network rollup-b-mainnet

# Or deploy to multiple at once
just deploy-multi rollup-a-mainnet rollup-b-mainnet
```

## Environment Variables

Only need **PRIVATE_KEY** in `.env`:

```bash
# .env
PRIVATE_KEY="0x..."
ETHERSCAN_API_KEY="..."  # Only for Etherscan verification
```

All other configuration (RPC URLs, explorers, etc.) is in `networks.toml`.

## Advanced Usage

### Custom Deployment Script

For more control, use the low-level commands:

```bash
# Load network config
source scripts/parse-network.sh rollup-a

# Deploy manually
just deploy-kernel "$NETWORK_RPC_URL" "$PRIVATE_KEY" "$NETWORK_ENTRYPOINT"
just deploy-factory "$NETWORK_RPC_URL" "$PRIVATE_KEY" <KERNEL_ADDRESS>
just deploy-validator "$NETWORK_RPC_URL" "$PRIVATE_KEY"
```

### Add New Network On-the-Fly

```bash
# Edit networks.toml
vim networks.toml

# Add new network section
# [networks.new-rollup]
# name = "New Rollup"
# ...

# Deploy immediately
just deploy-network new-rollup
```

## Troubleshooting

### Network Config Errors

```bash
# Validate network config
source scripts/parse-network.sh rollup-a
echo "RPC: $NETWORK_RPC_URL"
echo "EntryPoint: $NETWORK_ENTRYPOINT"
```

### RPC Connection Issues

```bash
# Test RPC connection
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  YOUR_RPC_URL
```

### Blockscout Verification Fails

- Ensure `verifier-url` ends with `/api/`
- Check that RPC URL is accessible
- Blockscout may require a few minutes after deployment

### Multi-Chain Deployment Stops

If deployment fails on one network:
1. Fix the issue in `networks.toml`
2. Re-run for failed network: `just deploy-network rollup-x`
3. Continue with remaining networks

## Network Configuration Examples

### Example 1: Compose Network Rollup

```toml
[networks.compose-rollup]
name = "Compose Rollup Testnet"
rpc_url = "https://rollup-bck.explorer.testnet.compose.network/api/eth-rpc"
chain_id = 12345
explorer_type = "blockscout"
explorer_url = "https://rollup-bck.explorer.testnet.compose.network"
explorer_api_url = "https://rollup-bck.explorer.testnet.compose.network/api/"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

### Example 2: Base Sepolia

```toml
[networks.base-sepolia]
name = "Base Sepolia"
rpc_url = "https://sepolia.base.org"
chain_id = 84532
explorer_type = "blockscout"
explorer_url = "https://sepolia.basescan.org"
explorer_api_url = "https://sepolia.basescan.org/api/"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

### Example 3: Ethereum Sepolia (Etherscan)

```toml
[networks.sepolia]
name = "Sepolia Testnet"
rpc_url = "https://sepolia.infura.io/v3/YOUR_KEY"
chain_id = 11155111
explorer_type = "etherscan"
explorer_url = "https://sepolia.etherscan.io"
explorer_api_url = "https://api-sepolia.etherscan.io/api"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

## Tips

- **Test First**: Always deploy to testnet before mainnet
- **Save Addresses**: Keep a record of deployed addresses per network
- **Gas Costs**: Have sufficient native tokens on each chain
- **Verification**: Blockscout may take 1-2 minutes after deployment
- **Multi-Deploy**: Use `deploy-multi` to save time on multiple networks
- **Network Names**: Use descriptive names like `rollup-a-testnet` vs `rollup-a-mainnet`

## Summary

```bash
# Quick workflow
just list-networks                          # See available networks
just deploy-network rollup-a                # Deploy to one network
just deploy-multi rollup-a rollup-b         # Deploy to multiple
just verify-all rollup-a 0x... 0x... 0x...  # Verify contracts
```

That's it! No need to edit `.env` between deployments. Just add networks to `networks.toml` and deploy.

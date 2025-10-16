# Quick Start Guide

Get up and running with Kernel v3.1 deployment in 5 minutes.

> **Note**: This guide uses the modern multi-chain deployment system. For legacy `.env`-based deployment, see the README.

## 1. Prerequisites

Install required tools:

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install just (macOS)
brew install just

# Install just (Linux)
cargo install just
```

## 2. Setup

```bash
# Clone or navigate to this repo
cd repo1

# Initialize git (if not already done)
git init

# Setup kernel submodule (v3.1)
just setup

# This will take a few minutes as it downloads dependencies
```

## 3. Configure

### Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your private key
PRIVATE_KEY="0x..."
ETHERSCAN_API_KEY="..."  # Optional, for contract verification
```

### Network Configuration

Edit `networks.toml` to add your target networks:

```toml
[networks.my-network]
name = "My Network"
rpc_url = "https://rpc.mynetwork.com"
chain_id = 12345
explorer_type = "blockscout"
explorer_url = "https://explorer.mynetwork.com"
explorer_api_url = "https://explorer.mynetwork.com/api/"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

## 4. Build

```bash
# Compile all contracts
just build

# This will take 1-2 minutes on first run
```

## 5. Deploy

### List Available Networks

```bash
just list-networks
```

### Deploy to Single Network

```bash
# Deploy to a network defined in networks.toml
just deploy-network my-network

# Addresses automatically saved to deployments.json
```

### Deploy to Multiple Networks

```bash
# Deploy to multiple networks at once
just deploy-multi network-a network-b network-c
```

### View Deployments

```bash
# Show all deployed addresses
just show-deployments

# Get addresses for specific network
just get-deployment my-network
```

## 6. Verify

Contracts are automatically verified during deployment if `ETHERSCAN_API_KEY` is set in `.env`.

## That's It! 🎉

Your contracts are now deployed. The output will show three addresses:
- **Kernel**: The implementation contract
- **KernelFactory**: Creates new Kernel accounts
- **MultiChainValidator**: ECDSA validator for multi-chain support

## What's Next?

- Save the deployed addresses (automatically saved to `deployments.json`)
- View deployments: `just show-deployments`
- Test creating a Kernel account using KernelFactory
- Integrate with your application
- Check [README.md](../README.md) for detailed documentation
- See [MULTI_CHAIN_DEPLOYMENT.md](MULTI_CHAIN_DEPLOYMENT.md) for multi-chain deployments

## Troubleshooting

### Check Your Setup
```bash
./check-setup.sh
```

### Common Issues

**"command not found: forge"**
- Install Foundry (see step 1)

**"command not found: just"**
- Install just (see step 1)

**"submodule not found"**
```bash
just setup
```

**"build failed"**
```bash
just clean
just build
```

**"insufficient funds"**
- Ensure deployer wallet has enough ETH
- Testnet: Get Sepolia ETH from faucet
- Mainnet: Needs ~0.15 ETH for deployment

**"RPC error"**
- Check RPC_URL in .env
- Verify API key is valid
- Try different RPC provider

## Network-Specific RPC URLs

### Sepolia (Testnet)
```
https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
https://sepolia.infura.io/v3/YOUR_KEY
```

### Ethereum Mainnet
```
https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
https://mainnet.infura.io/v3/YOUR_KEY
```

### Base
```
https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
https://mainnet.base.org
```

### Optimism
```
https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
https://mainnet.optimism.io
```

### Arbitrum
```
https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
https://arb1.arbitrum.io/rpc
```

All networks use the same EntryPoint: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

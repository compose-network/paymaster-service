# Kernel v3.1 Contract Deployment

This repository contains deployment scripts for the ZeroDev Kernel v3.1 contracts:
- **Kernel**: The main account implementation contract
- **KernelFactory**: Factory contract for creating Kernel accounts
- **MultiChainValidator**: Multi-chain ECDSA validator

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- [just](https://github.com/casey/just#installation) command runner installed
- Git with submodule support

## Quick Start

### 1. Initialize the Repository

```bash
# Initialize git if not already done
git init

# Setup the kernel submodule (v3.1 release)
just setup
```

This will:
- Add the kernel repository as a submodule at `contracts/kernel`
- Check out the `release/v3.1` branch
- Initialize all submodule dependencies
- Install foundry dependencies

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your PRIVATE_KEY
```

**Required in `.env`:**
```bash
PRIVATE_KEY="0x..."  # Your deployer wallet private key
```

### 3. Configure Networks

Edit `networks.toml` to add your target chains:

```toml
[networks.rollup-a]
name = "Rollup A Testnet"
rpc_url = "https://your-rpc-url"
chain_id = 12345
explorer_type = "blockscout"
explorer_url = "https://explorer.yourchain.com"
explorer_api_url = "https://explorer.yourchain.com/api/"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

See [MULTI_CHAIN_DEPLOYMENT.md](docs/MULTI_CHAIN_DEPLOYMENT.md) for detailed configuration guide.

### 4. Build Contracts

```bash
just build
```

This compiles all contracts in the kernel submodule.

### 5. Deploy Contracts

#### Multi-Chain Deployment (Recommended)

```bash
# List available networks
just list-networks

# Deploy to single network
just deploy-network rollup-a

# Deploy to multiple networks
just deploy-multi rollup-a rollup-b
```

#### Legacy Single-Chain Deployment

```bash
# Using environment variables from .env
just deploy-env

# Or manually specify parameters
just deploy-all <RPC_URL> <PRIVATE_KEY> <ENTRYPOINT_ADDRESS>
```

See [MULTI_CHAIN_DEPLOYMENT.md](docs/MULTI_CHAIN_DEPLOYMENT.md) for complete workflows.

## Available Commands

Run `just` to see all available commands:

```bash
# Setup & Build
just setup                      # Setup kernel submodule and dependencies
just build                      # Build all contracts
just clean                      # Clean build artifacts

# Multi-Chain Deployment (Recommended)
just list-networks              # List available networks from networks.toml
just deploy-network <network>   # Deploy to specific network
just deploy-multi <networks...> # Deploy to multiple networks
just show-deployments           # Show all deployments from deployments.json
just get-deployment <network>   # Get addresses for specific network

# Verification
just verify-blockscout <network> <addr> <contract>  # Verify on Blockscout
just verify-etherscan <network> <addr> <contract>   # Verify on Etherscan
just verify-all <network> <kernel> <factory> <val>  # Verify all contracts

# Legacy Single-Chain Commands
just deploy-kernel <rpc> <key> <entrypoint>         # Deploy Kernel
just deploy-factory <rpc> <key> <kernel-addr>       # Deploy Factory
just deploy-validator <rpc> <key>                   # Deploy Validator
just deploy-all <rpc> <key> <entrypoint>           # Deploy all
just deploy-env                                     # Deploy using .env
```

## Contract Dependencies

### Kernel.sol
- **Constructor**: `IEntryPoint _entrypoint`
- **Dependencies**: ValidationManager, EIP712, ExecLib, ModuleLib
- **External Libraries**: solady

### KernelFactory.sol
- **Constructor**: `address _impl` (Kernel implementation address)
- **Dependencies**: LibClone (solady)
- **Note**: Must be deployed after Kernel

### MultiChainValidator.sol
- **Constructor**: None
- **Dependencies**: ECDSA, MerkleProofLib (solady)
- **Note**: Configuration happens on installation, not deployment

## Deployment Flow

```
1. Kernel.sol (with EntryPoint address)
   ↓
2. KernelFactory.sol (with Kernel address)
   ↓
3. MultiChainValidator.sol (standalone)
```

## Network Configuration

### Sepolia Testnet
```bash
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

### Ethereum Mainnet
```bash
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ENTRYPOINT_ADDRESS=0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

### Base / Optimism / Arbitrum
Same EntryPoint address: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

## Verification

Contracts are automatically verified during deployment if you have `ETHERSCAN_API_KEY` set.

To manually verify:
```bash
just verify <CONTRACT_ADDRESS> <CONTRACT_PATH> <RPC_URL> <CONSTRUCTOR_ARGS>

# Example:
just verify 0x123... src/Kernel.sol:Kernel $RPC_URL 0xEntryPointAddress
```

## Troubleshooting

### Contract Size Error (EIP-3860)
If you see `max initcode size exceeded` or `max code size exceeded`:
```
Error: max initcode size exceeded: code size 49825 limit 49152
Error: max code size exceeded
```

**Solution**: The deployment automatically uses the `deploy` profile with:
- `via-ir=true` - IR-based optimizer
- `optimizer_runs=200` - Reduced from 1000 to minimize bytecode size

In `contracts/kernel/foundry.toml` you can find the configuration.

If you still see this error after rebuilding:
1. `just clean` - Remove old artifacts
2. `just build` - Rebuild with deploy profile (takes longer)
3. `just deploy-env` - Deploy optimized contracts

### Submodule Issues
```bash
# Reset submodules
git submodule deinit -f contracts/kernel
rm -rf .git/modules/contracts/kernel
just setup
```

### Build Errors
```bash
# Clean and rebuild
just clean
just build
```

### RPC Issues
- Ensure your RPC URL is correct and has sufficient rate limits
- For production, use a dedicated RPC provider (Alchemy, Infura, etc.)

## Security Notes

- **Never commit `.env` file** - it contains sensitive keys
- Use a dedicated deployer wallet, not your main wallet
- Test on testnets (Sepolia) before mainnet deployment
- Verify contract source code after deployment

## Documentation

- 📖 [Quick Reference](docs/QUICKREF.md) - Common commands cheat sheet
- 🚀 [Quick Start Guide](docs/QUICKSTART.md) - Get started quickly
- 🌐 [Multi-Chain Deployment](docs/MULTI_CHAIN_DEPLOYMENT.md) - Deploy to multiple chains
- 📦 [Deployment Tracking](docs/DEPLOYMENT_TRACKING.md) - Track deployment addresses
- ✅ [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md) - Pre-deployment checklist
- 🏗️ [Project Structure](docs/PROJECT_STRUCTURE.md) - Repository organization
- 🔧 [Fixes & Troubleshooting](docs/FIXES.md) - Common issues and solutions

## Repository Structure

```
repo1/
├── contracts/
│   └── kernel/              # Git submodule (v3.1)
├── docs/                    # Documentation
├── scripts/                 # Deployment scripts
├── .env                     # Your configuration (gitignored)
├── .env.example            # Configuration template
├── networks.toml           # Network configurations
├── justfile                # Deployment commands
└── README.md              # This file
```

## References

- [Kernel Repository](https://github.com/zerodevapp/kernel)
- [ZeroDev Documentation](https://docs.zerodev.app/)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Foundry Book](https://book.getfoundry.sh/)

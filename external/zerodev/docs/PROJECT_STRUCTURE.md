# Project Structure

This document describes the structure of this deployment repository.

## Directory Layout

```
repo1/
├── contracts/
│   └── kernel/                  # Git submodule (release/v3.1)
│       ├── src/                 # Contract source files
│       │   ├── Kernel.sol
│       │   ├── factory/
│       │   │   └── KernelFactory.sol
│       │   └── validator/
│       │       └── MultiChainValidator.sol
│       ├── lib/                 # Dependencies (solady, forge-std, etc.)
│       ├── out/                 # Compiled artifacts
│       ├── broadcast/           # Deployment records
│       └── foundry.toml         # Foundry configuration
│
├── docs/                        # Documentation
│   ├── QUICKSTART.md           # Quick start guide
│   ├── QUICKREF.md             # Quick reference card
│   ├── MULTI_CHAIN_DEPLOYMENT.md # Multi-chain deployment guide
│   ├── DEPLOYMENT_TRACKING.md  # Deployment address tracking
│   ├── DEPLOYMENT_CHECKLIST.md # Pre/post deployment checklist
│   ├── PROJECT_STRUCTURE.md    # This file
│   ├── FIXES.md                # Common fixes and troubleshooting
│   ├── deployments.example.md  # Example deployment record
│   └── changelog/              # Change logs
│
├── scripts/                     # Deployment and utility scripts
│   ├── parse-network.sh        # Parse network config from TOML
│   ├── save-deployment.sh      # Save deployment addresses to JSON
│   └── deploy.sh               # Main deployment script
│
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── networks.toml               # Network configurations
├── deployments.json            # Deployment addresses (gitignored)
├── deployments.example.json    # Example deployments file
│
├── justfile                     # Deployment commands (main tool)
├── check-setup.sh               # Environment validation script
└── README.md                    # Main documentation
```

## File Descriptions

### Configuration Files

- **`.env`** - Your private configuration (never commit!)
  - RPC URLs
  - Private keys
  - API keys
  - Deployed addresses

- **`.env.example`** - Template for `.env` file
  - Shows required variables
  - Includes example values
  - Safe to commit

- **`.gitignore`** - Prevents committing sensitive files
  - `.env`
  - Build artifacts
  - IDE files

- **`.gitattributes`** - Git text file handling
  - Ensures consistent line endings
  - Proper treatment of Solidity files

### Core Deployment Files

- **`justfile`** - Main deployment tool
  - `just setup` - Initialize submodule
  - `just build` - Compile contracts
  - `just deploy-kernel` - Deploy Kernel
  - `just deploy-factory` - Deploy Factory
  - `just deploy-validator` - Deploy Validator
  - `just deploy-all` - Deploy everything
  - `just deploy-env` - Deploy using .env

- **`deploy-example.sh`** - Alternative bash script
  - Same functionality as justfile
  - Uses forge create directly
  - Outputs JSON results
  - Requires jq for parsing

- **`check-setup.sh`** - Validates environment
  - Checks for required tools
  - Verifies submodule setup
  - Validates .env configuration
  - Confirms contracts are built

### Documentation Files (docs/)

- **`README.md`** (root) - Main documentation
  - Prerequisites and setup
  - Quick start guide
  - Available commands
  - Links to detailed docs

- **`docs/QUICKSTART.md`** - 5-minute setup guide
  - Step-by-step setup
  - Quick deployment commands
  - Common troubleshooting

- **`docs/QUICKREF.md`** - Quick reference card
  - Command cheat sheet
  - Network config template
  - Typical workflow

- **`docs/MULTI_CHAIN_DEPLOYMENT.md`** - Multi-chain guide
  - Network configuration
  - Multi-network deployment
  - Address tracking

- **`docs/DEPLOYMENT_TRACKING.md`** - Address tracking
  - Automatic address saving
  - deployments.json structure
  - Querying deployments

- **`docs/DEPLOYMENT_CHECKLIST.md`** - Deployment checklist
  - Pre-deployment checks
  - Deployment steps
  - Post-deployment tasks
  - Gas cost estimates

- **`docs/PROJECT_STRUCTURE.md`** - This file
  - Repository layout
  - File descriptions
  - Workflow explanation

- **`docs/FIXES.md`** - Troubleshooting guide
  - Common issues
  - Solutions and fixes
  - Configuration tips

## Workflow Overview

### Initial Setup
```
1. Clone/create repository
2. Run: just setup
3. Configure: cp .env.example .env (then edit)
4. Verify: ./check-setup.sh
```

### Development Cycle
```
1. Edit contracts (if needed): contracts/kernel/src/
2. Build: just build
3. Test on testnet: just deploy-env
4. Verify on explorer
```

### Production Deployment
```
1. Review: DEPLOYMENT_CHECKLIST.md
2. Configure .env for mainnet
3. Deploy: just deploy-env
4. Save addresses and transaction hashes
5. Backup: contracts/kernel/broadcast/
```

## Submodule Details

The `contracts/kernel` directory is a git submodule pointing to:
- Repository: https://github.com/zerodevapp/kernel
- Branch: release/v3.1
- Contains: All contract source code and dependencies

### Submodule Commands

```bash
# Initialize submodule
just setup

# Update to latest v3.1
cd contracts/kernel
git pull origin release/v3.1
cd ../..

# Reset submodule
git submodule deinit -f contracts/kernel
rm -rf .git/modules/contracts/kernel
just setup
```

## Build Artifacts

After running `just build`, artifacts are in:
- `contracts/kernel/out/` - Compiled contracts (JSON)
  - ABI
  - Bytecode
  - Deployment bytecode
  - Metadata

After deployment, records are in:
- `contracts/kernel/broadcast/` - Deployment transactions
  - Chain ID
  - Transaction hashes
  - Contract addresses
  - Gas used

## Environment Variables

Required in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| PRIVATE_KEY | Deployer private key | 0x1234... |
| ETHERSCAN_API_KEY | For verification (optional) | ABC123... |

**Note**: Network configurations (RPC URL, chain ID, EntryPoint) are now stored in `networks.toml` instead of `.env`.

## Network Configuration (networks.toml)

Each network is configured in `networks.toml`:

| Field | Description | Example |
|-------|-------------|---------|
| name | Network display name | "Rollup A Testnet" |
| rpc_url | RPC endpoint | "https://rpc.network.com" |
| chain_id | Chain ID | 12345 |
| explorer_type | "blockscout" or "etherscan" | "blockscout" |
| explorer_url | Block explorer URL | "https://explorer.network.com" |
| explorer_api_url | Explorer API endpoint | "https://explorer.network.com/api/" |
| entrypoint | ERC-4337 EntryPoint address | "0x0000000071727De22E5E9d8BAf0edAc6f37da032" |

## Deployment Tracking (deployments.json)

Deployed addresses are automatically saved:

| Field | Description |
|-------|-------------|
| chain_id | Chain ID of deployment |
| Kernel | Kernel implementation address |
| KernelFactory | Factory contract address |
| MultiChainValidator | Validator contract address |
| deployed_at | Deployment timestamp |

## Security Notes

### Never Commit
- `.env` file
- Private keys
- API keys
- Sensitive configuration

### Safe to Commit
- `.env.example`
- Documentation
- Scripts (justfile, *.sh)
- `.gitignore`
- `.gitattributes`

### Backup Important Files
- `.env` (encrypted backup only)
- `contracts/kernel/broadcast/` (after deployment)
- Deployment addresses and transaction hashes

## Tool Dependencies

### Required
- **Foundry** (forge, cast) - Solidity development
- **just** - Command runner
- **git** - Version control

### Optional but Recommended
- **jq** - JSON parsing (for deploy-example.sh)
- **curl** - RPC testing
- **cast** - Blockchain interactions (included with foundry)

## Support & Resources

- Main docs: [README.md](../README.md)
- Quick start: [QUICKSTART.md](QUICKSTART.md)
- Quick reference: [QUICKREF.md](QUICKREF.md)
- Multi-chain deployment: [MULTI_CHAIN_DEPLOYMENT.md](MULTI_CHAIN_DEPLOYMENT.md)
- Deployment tracking: [DEPLOYMENT_TRACKING.md](DEPLOYMENT_TRACKING.md)
- Deployment checklist: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- Fixes & troubleshooting: [FIXES.md](FIXES.md)
- Kernel repository: https://github.com/zerodevapp/kernel
- ZeroDev docs: https://docs.zerodev.app/

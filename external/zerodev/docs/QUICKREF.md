# Quick Reference Card

## Setup (One Time)

```bash
just setup                    # Initialize submodule
cp .env.example .env         # Copy env template
# Edit .env: Add PRIVATE_KEY
# Edit networks.toml: Add your rollup networks
```

## Deploy to Single Network

```bash
just build                   # Build contracts
just deploy-network rollup-a # Deploy (saves to deployments.json)
just show-deployments        # View saved addresses
```

## Deploy to Multiple Networks

```bash
just build                              # Build once
just deploy-multi rollup-a rollup-b     # Deploy to both (auto-saves)
just show-deployments                   # View all deployments
```

## Verify Contracts

```bash
# After deployment, copy the addresses and verify:
just verify-all rollup-a \
  0xKERNEL_ADDR \
  0xFACTORY_ADDR \
  0xVALIDATOR_ADDR
```

## Common Commands

| Command | Description |
|---------|-------------|
| `just list-networks` | Show available networks |
| `just deploy-network <name>` | Deploy to one network |
| `just deploy-multi <names...>` | Deploy to multiple networks |
| `just show-deployments` | View all saved deployments |
| `just get-deployment <network>` | Get addresses for specific network |
| `just verify-blockscout <network> <addr> <contract>` | Verify on Blockscout |
| `just build` | Compile contracts |
| `just clean` | Clean build artifacts |

## Network Config Template

```toml
[networks.your-network]
name = "Your Network Name"
rpc_url = "https://rpc.yournetwork.com"
chain_id = 12345
explorer_type = "blockscout"  # or "etherscan"
explorer_url = "https://explorer.yournetwork.com"
explorer_api_url = "https://explorer.yournetwork.com/api/"
entrypoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
```

## Contract Names (for verification)

- Kernel: `src/Kernel.sol:Kernel`
- Factory: `src/factory/KernelFactory.sol:KernelFactory`
- Validator: `src/validator/MultiChainValidator.sol:MultiChainValidator`

## Typical Workflow

```bash
# 1. Setup (first time only)
just setup
cp .env.example .env
# Edit .env and networks.toml

# 2. Build
just build

# 3. Deploy
just deploy-multi rollup-a rollup-b

# 4. Verify (optional)
just verify-all rollup-a 0xKernel 0xFactory 0xValidator
just verify-all rollup-b 0xKernel 0xFactory 0xValidator
```

## Files You Need to Edit

1. **`.env`** - Only your PRIVATE_KEY
2. **`networks.toml`** - All network configurations

That's it! No need to edit .env between deployments.

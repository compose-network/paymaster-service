# Documentation Index

Welcome to the Kernel v3.1 deployment documentation.

## Getting Started

Start here if you're new to the project:

1. **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
2. **[Quick Reference](QUICKREF.md)** - Command cheat sheet for daily use
3. **[Main README](../README.md)** - Complete overview and setup instructions

## Deployment Guides

### Multi-Chain Deployment (Recommended)

- **[Multi-Chain Deployment Guide](MULTI_CHAIN_DEPLOYMENT.md)** - Deploy to multiple networks
  - Network configuration in `networks.toml`
  - Deploy to single or multiple chains
  - Network-specific settings
  - Verification on different explorers

- **[Deployment Tracking](DEPLOYMENT_TRACKING.md)** - Automatic address tracking
  - How `deployments.json` works
  - Viewing and querying deployments
  - Integration with CI/CD
  - Manual management

### Pre & Post Deployment

- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Complete deployment workflow
  - Pre-deployment requirements
  - Step-by-step deployment
  - Post-deployment verification
  - Multi-chain considerations

## Technical Documentation

- **[Project Structure](PROJECT_STRUCTURE.md)** - Repository organization
  - Directory layout
  - File descriptions
  - Workflow overview
  - Environment variables

- **[Fixes & Troubleshooting](FIXES.md)** - Common issues and solutions
  - EIP-3860 contract size limits
  - Build optimizations
  - RPC and verification issues

## Quick Links

### Common Tasks

| Task | Command | Documentation |
|------|---------|---------------|
| Setup repository | `just setup` | [Quick Start](QUICKSTART.md) |
| Build contracts | `just build` | [README](../README.md) |
| Deploy to network | `just deploy-network <name>` | [Multi-Chain Guide](MULTI_CHAIN_DEPLOYMENT.md) |
| View deployments | `just show-deployments` | [Deployment Tracking](DEPLOYMENT_TRACKING.md) |
| Verify contracts | `just verify-all <network> ...` | [Multi-Chain Guide](MULTI_CHAIN_DEPLOYMENT.md) |

### Configuration Files

| File | Purpose | Example |
|------|---------|---------|
| `.env` | Private keys and API keys | `PRIVATE_KEY="0x..."` |
| `networks.toml` | Network configurations | See [Multi-Chain Guide](MULTI_CHAIN_DEPLOYMENT.md) |
| `deployments.json` | Deployment addresses (auto-generated) | See [Deployment Tracking](DEPLOYMENT_TRACKING.md) |

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── QUICKSTART.md                # 5-minute setup guide
├── QUICKREF.md                  # Command cheat sheet
├── MULTI_CHAIN_DEPLOYMENT.md    # Multi-chain deployment guide
├── DEPLOYMENT_TRACKING.md       # Address tracking system
├── DEPLOYMENT_CHECKLIST.md      # Deployment workflow checklist
├── PROJECT_STRUCTURE.md         # Repository structure
├── FIXES.md                     # Troubleshooting guide
├── deployments.example.md       # Example deployment record
└── changelog/                   # Version history and changes
```

## Support & Resources

### Internal Documentation
- [Main README](../README.md) - Complete project documentation
- [Quick Reference](QUICKREF.md) - Daily command reference

### External Resources
- [ZeroDev Documentation](https://docs.zerodev.app/) - Official ZeroDev docs
- [Kernel Repository](https://github.com/zerodevapp/kernel) - Source code
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337) - Account abstraction standard
- [Foundry Book](https://book.getfoundry.sh/) - Foundry documentation

## Contributing

When adding new documentation:

1. Follow the existing structure and style
2. Add the document to this index
3. Update cross-references in related documents
4. Include code examples where appropriate
5. Link to external resources when helpful

## Versioning

This documentation is for **Kernel v3.1**. For other versions, check the appropriate branch or tag in the repository.

---

**Need help?** Start with the [Quick Start Guide](QUICKSTART.md) or check the [Troubleshooting section](FIXES.md).

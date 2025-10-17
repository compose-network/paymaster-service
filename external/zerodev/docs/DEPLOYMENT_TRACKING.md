# Deployment Address Tracking

Deployment addresses are automatically saved to `deployments.json` after each successful deployment.

## Automatic Saving

Every time you deploy using `just deploy-network` or `just deploy-multi`, the contract addresses are automatically saved:

```bash
# Deploy to rollup-a
just deploy-network rollup-a

# Addresses are automatically saved to deployments.json
# ✓ Saved deployment addresses to deployments.json
```

## File Structure

**deployments.json:**
```json
{
  "rollup-a": {
    "chain_id": "11111",
    "Kernel": "0x0d33801785340072C452b994496B19f196b7eE15",
    "KernelFactory": "0xa9d0096bdbf97401F1B5E8D5330Ee8b7f0cb975D",
    "MultiChainValidator": "0x656d5cC4e7d49EaCC063cBB8D3e072F2841D68b4",
    "deployed_at": "2025-01-15 22:30:45 UTC"
  },
  "rollup-b": {
    "chain_id": "22222",
    "Kernel": "0x...",
    "KernelFactory": "0x...",
    "MultiChainValidator": "0x...",
    "deployed_at": "2025-01-15 22:35:12 UTC"
  }
}
```

## View Deployments

### Show All Deployments

```bash
just show-deployments
```

Output:
```
=== Deployment Addresses ===

rollup-a (Chain ID: 11111):
  Kernel:             0x0d33801785340072C452b994496B19f196b7eE15
  KernelFactory:      0xa9d0096bdbf97401F1B5E8D5330Ee8b7f0cb975D
  MultiChainValidator: 0x656d5cC4e7d49EaCC063cBB8D3e072F2841D68b4
  Deployed:           2025-01-15 22:30:45 UTC

rollup-b (Chain ID: 22222):
  Kernel:             0x...
  KernelFactory:      0x...
  MultiChainValidator: 0x...
  Deployed:           2025-01-15 22:35:12 UTC
```

### Get Specific Network

```bash
just get-deployment rollup-a
```

Output:
```json
{
  "chain_id": "11111",
  "Kernel": "0x0d33801785340072C452b994496B19f196b7eE15",
  "KernelFactory": "0xa9d0096bdbf97401F1B5E8D5330Ee8b7f0cb975D",
  "MultiChainValidator": "0x656d5cC4e7d49EaCC063cBB8D3e072F2841D68b4",
  "deployed_at": "2025-01-15 22:30:45 UTC"
}
```

## Use Cases

### 1. Quick Reference

Check deployed addresses without searching through logs:

```bash
just show-deployments
```

### 2. Verification

Use saved addresses for verification:

```bash
# Get addresses
KERNEL=$(just get-deployment rollup-a | jq -r '.Kernel')
FACTORY=$(just get-deployment rollup-a | jq -r '.KernelFactory')
VALIDATOR=$(just get-deployment rollup-a | jq -r '.MultiChainValidator')

# Verify
just verify-all rollup-a $KERNEL $FACTORY $VALIDATOR
```

### 3. CI/CD Integration

Read addresses in scripts:

```bash
#!/usr/bin/env bash
KERNEL=$(jq -r '.["rollup-a"].Kernel' deployments.json)
echo "Kernel deployed at: $KERNEL"
```

### 4. Multi-Chain Overview

After deploying to multiple networks, see all addresses at once:

```bash
just deploy-multi rollup-a rollup-b rollup-c
just show-deployments
```

## Manual Management

### Add Deployment Manually

```bash
./scripts/save-deployment.sh rollup-a \
  0xKERNEL_ADDRESS \
  0xFACTORY_ADDRESS \
  0xVALIDATOR_ADDRESS \
  12345
```

### Edit deployments.json

You can manually edit `deployments.json` if needed:

```bash
vim deployments.json
```

### Backup

Keep backups of deployment records:

```bash
cp deployments.json deployments.backup.json
```

## Integration with Verification

Use deployment addresses directly in verification commands:

```bash
# Deploy
just deploy-network rollup-a

# Addresses are auto-saved, now verify using them
ADDRS=$(just get-deployment rollup-a)
KERNEL=$(echo $ADDRS | jq -r '.Kernel')
FACTORY=$(echo $ADDRS | jq -r '.KernelFactory')
VALIDATOR=$(echo $ADDRS | jq -r '.MultiChainValidator')

just verify-all rollup-a $KERNEL $FACTORY $VALIDATOR
```

## Git Ignore

`deployments.json` is gitignored by default (may contain sensitive addresses). 

To track it in git:
1. Remove from `.gitignore`
2. Commit the file
3. Consider using a private repository

## Example Workflow

```bash
# 1. Deploy to testnets
just deploy-multi rollup-a-testnet rollup-b-testnet

# 2. View all deployments
just show-deployments

# 3. Get specific network addresses
just get-deployment rollup-a-testnet

# 4. Deploy to production
just deploy-network rollup-a-mainnet

# 5. Compare addresses
just show-deployments
```

## Troubleshooting

### Addresses Not Saved

If addresses aren't saved automatically:
- Check that deployment completed successfully
- Ensure `jq` is installed: `brew install jq`
- Verify script permissions: `ls -la scripts/save-deployment.sh`

### File Not Found

If `deployments.json` doesn't exist:
- It's created automatically on first deployment
- Create manually: `echo '{}' > deployments.json`

### Invalid JSON

If the file becomes corrupted:
```bash
# Validate
jq . deployments.json

# Reset
echo '{}' > deployments.json
```

## Summary

- ✅ **Automatic**: Addresses saved after each deployment
- ✅ **Structured**: Clean JSON format
- ✅ **Timestamped**: Know when each deployment happened
- ✅ **Queryable**: Easy to retrieve specific networks
- ✅ **CI/CD Ready**: Script-friendly format
- ✅ **Multi-Chain**: Track unlimited networks

No more searching through terminal logs or spreadsheets! 🎉

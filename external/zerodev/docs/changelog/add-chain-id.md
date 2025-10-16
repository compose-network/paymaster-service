# Changelog: Add chain_id to deployments.json

**Date**: 2025-10-16  
**Type**: Enhancement

## Summary

Added `chain_id` field to `deployments.json` for better multi-chain deployment tracking.

## Changes

### Updated Files

1. **scripts/save-deployment.sh**
   - Added `chain_id` parameter (5th argument)
   - Now saves chain_id in JSON structure
   - Usage: `./save-deployment.sh <network> <kernel> <factory> <validator> <chain_id>`

2. **justfile**
   - Updated `deploy-network` to pass `$NETWORK_CHAIN_ID` to save script
   - Updated `show-deployments` to display chain ID in output

3. **deployments.example.json**
   - Added `chain_id` field to example structure

4. **DEPLOYMENT_TRACKING.md**
   - Updated all JSON examples to include `chain_id`
   - Updated output examples to show chain ID
   - Updated manual deployment command

5. **MULTI_CHAIN_DEPLOYMENT.md**
   - Updated deployments.json structure example

## New Structure

**Before:**
```json
{
  "rollup-a": {
    "Kernel": "0x...",
    "KernelFactory": "0x...",
    "MultiChainValidator": "0x...",
    "deployed_at": "2025-01-15 22:30:45 UTC"
  }
}
```

**After:**
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

## Benefits

- **Better Organization**: Easily identify which chain each deployment is on
- **Multi-Chain Clarity**: No confusion when deploying to multiple chains
- **Validation**: Can verify you're interacting with the correct chain
- **CI/CD**: Automated scripts can validate chain before operations

## Usage

### Automatic (Recommended)

Chain ID is automatically captured from `networks.toml` during deployment:

```bash
just deploy-network rollup-a
# chain_id automatically added from networks.toml
```

### Manual

```bash
./scripts/save-deployment.sh rollup-a \
  0xKERNEL \
  0xFACTORY \
  0xVALIDATOR \
  11111
```

## Display Output

**show-deployments now shows:**
```
rollup-a (Chain ID: 11111):
  Kernel:             0x...
  KernelFactory:      0x...
  MultiChainValidator: 0x...
  Deployed:           2025-01-15 22:30:45 UTC
```

## Backward Compatibility

- Existing `deployments.json` files without `chain_id` will continue to work
- New deployments will include `chain_id`
- If chain_id cannot be determined, it defaults to "unknown"

## Migration

No migration needed. Next deployment will automatically use new format.

To manually add chain_id to existing deployments:
```bash
vim deployments.json
# Add "chain_id": "XXXXX" to each network entry
```

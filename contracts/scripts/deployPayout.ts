import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Network    :", network.name, `(chainId ${network.config.chainId})`);
  console.log("Deployer   :", deployer.address);
  console.log("Balance    :", ethers.formatEther(balance), "0G");

  if (balance === 0n) {
    throw new Error("Deployer has 0 balance. Fund it from https://faucet.0g.ai before deploying.");
  }

  console.log("\nDeploying OGRampPayout...");
  const Payout = await ethers.getContractFactory("OGRampPayout");
  const payout = await Payout.deploy();
  await payout.waitForDeployment();
  const addr = await payout.getAddress();
  console.log("Address    :", addr);

  // Pre-fund treasury so the backend can immediately disburse on-ramp payouts.
  // Tweak the amount to taste; on testnet 0.5 0G covers ~50 small ramps.
  const fundAmount = ethers.parseEther("0.5");
  if (balance > fundAmount + ethers.parseEther("0.05")) {
    console.log(`\nFunding treasury with ${ethers.formatEther(fundAmount)} 0G...`);
    const fundTx = await deployer.sendTransaction({ to: addr, value: fundAmount });
    await fundTx.wait();
    console.log("Fund tx    :", fundTx.hash);
    const treasury = await ethers.provider.getBalance(addr);
    console.log("Treasury   :", ethers.formatEther(treasury), "0G");
  } else {
    console.log("\n⚠️  Skipping pre-fund — deployer balance too low.");
    console.log("    Send funds manually:");
    console.log(`    cast send ${addr} --value 0.5ether --rpc-url https://evmrpc-testnet.0g.ai --private-key $KEY`);
  }

  console.log("\n✅ OGRampPayout deployed");
  console.log("Explorer   :", `https://chainscan-galileo.0g.ai/address/${addr}`);
  console.log("\nPaste into backend/.env:");
  console.log(`OG_PAYOUT_CONTRACT=${addr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

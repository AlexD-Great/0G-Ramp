import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Network    :", network.name, `(chainId ${network.config.chainId})`);
  console.log("Deployer   :", deployer.address);
  console.log("Balance    :", ethers.formatEther(balance), "0G");

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 balance. Fund it from https://faucet.0g.ai before deploying."
    );
  }

  const minDeposit = ethers.parseEther("0"); // bump to "0.001" if you want a floor

  console.log("\nDeploying OGRampBridge...");
  const Bridge = await ethers.getContractFactory("OGRampBridge");
  const bridge = await Bridge.deploy(minDeposit);
  await bridge.waitForDeployment();

  const addr = await bridge.getAddress();
  const tx = bridge.deploymentTransaction();

  console.log("\n✅ OGRampBridge deployed");
  console.log("Address    :", addr);
  console.log("Tx hash    :", tx?.hash);
  console.log("Explorer   :", `https://chainscan-galileo.0g.ai/address/${addr}`);
  console.log("\nPaste into backend/.env:");
  console.log(`BRIDGE_CONTRACT_ADDRESS=${addr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

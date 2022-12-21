import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import traveler from "ganache-time-traveler";

let { Framework } = require("@superfluid-finance/sdk-core");
let { expect, assert } = require("chai");
let { ethers, web3 } = require("hardhat");

let ricABI = require("./abis/fDAIABI");

let deployFramework = require("@superfluid-finance/ethereum-contracts/scripts/deploy-framework");
let deployTestToken = require("@superfluid-finance/ethereum-contracts/scripts/deploy-test-token");
let deploySuperToken = require("@superfluid-finance/ethereum-contracts/scripts/deploy-super-token");

let accounts: any[];
let admin: SignerWithAddress;
let alice: SignerWithAddress;
let bob: SignerWithAddress;
let carl: SignerWithAddress;
let karen: SignerWithAddress;

let App: any;

let sf: InstanceType<typeof Framework>;
let ric: InstanceType<typeof ricABI>;
let ricx: InstanceType<typeof ricABI>;
let usdc: InstanceType<typeof ricABI>;
let usdcx: InstanceType<typeof ricABI>;
let superSigner: InstanceType<typeof sf.createSigner>;
let waterDrops: InstanceType<typeof ConditionalWaterDrop>;

let duration;
let rate;
let deadline;

const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

let errorHandler = (err: any) => {
  if (err) throw err;
};

// helpers
export const currentBlockTimestamp = async () => {
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  return (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
};

export const increaseTime = async (seconds: any) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

describe("ConditionalWaterDrop", function () {
  before(async () => {
    [admin, alice, bob, carl, karen] = await ethers.getSigners();
    accounts = [admin, alice, bob, carl, karen];

    //deploy the framework
    await deployFramework(errorHandler, {
      web3,
      from: admin.address,
    });

    //deploy a fake erc20 token
    let fDAIAddress = await deployTestToken(errorHandler, [":", "fDAI"], {
      web3,
      from: admin.address,
    });

    //deploy a fake erc20 wrapper super token around the fDAI token
    let fDAIxAddress = await deploySuperToken(errorHandler, [":", "fDAI"], {
      web3,
      from: admin.address,
    });

    //deploy a fake erc20 token
    let fUSDCAddress = await deployTestToken(errorHandler, [":", "fUSDC"], {
      web3,
      from: admin.address,
    });

    //deploy a fake erc20 wrapper super token around the fDAI token
    let fUSDCxAddress = await deploySuperToken(errorHandler, [":", "fUSDC"], {
      web3,
      from: admin.address,
    });

    //initialize the superfluid framework...put custom and web3 only bc we are using hardhat locally
    sf = await Framework.create({
      networkName: "custom",
      provider: web3,
      chainId: 31337,
      dataMode: "WEB3_ONLY",
      resolverAddress: process.env.RESOLVER_ADDRESS, //this is how you get the resolver address
      protocolReleaseVersion: "test",
    });

    superSigner = await sf.createSigner({
      signer: admin,
      provider: web3,
    });

    //use the framework to get the super token
    ricx = await sf.loadSuperToken("fDAIx");
    usdcx = await sf.loadSuperToken("fUSDCx");

    //get the contract object for the erc20 token
    let ricAddress = ricx.underlyingToken.address;
    ric = new ethers.Contract(ricAddress, ricABI, admin);
    //get the contract object for the erc20 token
    let usdcAddress = usdcx.underlyingToken.address;
    usdc = new ethers.Contract(usdcAddress, ricABI, admin);

    App = await ethers.getContractFactory("ConditionalWaterDrop", admin);

    let now = new Date();
    now = Math.round(now.getTime() / 1000);

    console.log("Deploying app");
    // As owner, create a new Claim
    duration = 3600; // one hour
    rate = 1000000; // tokens per second to claim
    deadline = (await currentBlockTimestamp()) + 365 * 24 * 60 * 60; // 1 year
    waterDrops = await App.deploy(
      sf.settings.config.hostAddress,
      sf.settings.config.cfaV1Address,
      ricx.address,
      rate,
      duration,
      deadline
    );

    await waterDrops.deployed();

    console.log("Init app");
    await waterDrops.initialize(
      // send a stream to karen for 5000 RIC for 30 days
      usdcx.address,
      3600000000,
      3600,
      karen.address
    );

    // Make Some RICx tokens
    console.log("mint");
    await ric.mint(admin.address, ethers.utils.parseEther("10000000"));
    await ric
      .connect(admin)
      .approve(ricx.address, ethers.utils.parseEther("10000000"));

    let ricxUpgradeOperation = ricx.upgrade({
      amount: ethers.utils.parseEther("10000000"),
    });
    await ricxUpgradeOperation.exec(admin);

    // Transfer RICx to the waterdrops contract
    let transferOperation = ricx.transfer({
      receiver: waterDrops.address,
      amount: ethers.utils.parseEther("10000000"),
    });
    await transferOperation.exec(admin);

    // Macke some USDCx tokens:
    // Make Some RICx tokens
    await usdc.mint(admin.address, ethers.utils.parseEther("10000000"));
    await usdc
      .connect(admin)
      .approve(usdcx.address, ethers.utils.parseEther("10000000"));

    let usdcxUpgradeOperation = usdcx.upgrade({
      amount: ethers.utils.parseEther("10000000"),
    });
    await usdcxUpgradeOperation.exec(admin);

    // Transfer USDCx to the alice
    transferOperation = usdcx.transfer({
      receiver: alice.address,
      amount: ethers.utils.parseEther("5000000"),
    });
    await transferOperation.exec(admin);
    // Transfer USDCx to bob
    transferOperation = usdcx.transfer({
      receiver: bob.address,
      amount: ethers.utils.parseEther("5000000"),
    });
    await transferOperation.exec(admin);
  });

  beforeEach(async function () {});

  it("#1.1 - User can not claim their waterdrop when ineligible", async function () {
    // Expect claiming for bob and alice to fail since they have not streamed to karen
    await expect(waterDrops.connect(alice).claim()).to.be.revertedWith(
      "ineligible: no stream"
    );

    await expect(waterDrops.connect(bob).claim()).to.be.revertedWith(
      "ineligible: no stream"
    );
  });

  it("#1.2 - User can claim their waterdrop when eligible", async function () {
    // Make Bob and Alice eligible by streaming to karen for 30 days
    let flowConfig = {
      superToken: usdcx.address,
      sender: alice.address,
      receiver: karen.address,
      flowRate: 1000000,
    };
    let createFlow = sf.cfaV1.createFlow(flowConfig);
    await createFlow.exec(alice);
    flowConfig.sender = bob.address;
    createFlow = sf.cfaV1.createFlow(flowConfig);
    await createFlow.exec(bob);
    increaseTime(3700);

    // Try claim
    await waterDrops.connect(alice).claim();
    // Verify claimed for alice
    let flow = await waterDrops.getFlow(alice.address);
    expect(flow.flowRate).to.equal(1000000);
  });

  it("#1.3 - Streams are closed when ready", async function () {
    // Alice's stream is already open, expect its not ready to close:
    await expect(waterDrops.closeNext()).to.be.revertedWith(
      "not ready to close"
    );

    // Add another claim to the closureQueue
    increaseTime(1000);
    await waterDrops.connect(bob).claim();
    let flow = await waterDrops.getFlow(bob.address);
    expect(flow.flowRate).to.equal(1000000);

    // Fast forward time to the first close (Alice)
    increaseTime(2600);

    await waterDrops.closeNext();

    flow = await waterDrops.getFlow(alice.address);
    expect(flow.flowRate).to.equal(0);

    // Now close bob, the next in the queue

    await expect(waterDrops.closeNext()).to.be.revertedWith(
      "not ready to close"
    );

    increaseTime(2600);

    await waterDrops.closeNext();

    flow = await waterDrops.getFlow(bob.address);
    expect(flow.flowRate).to.equal(0);

    // Expect that they can't claim again after closure
    await expect(waterDrops.connect(alice).claim()).to.be.revertedWith(
      "already claimed"
    );
  });

  xit("#1.5 - Admin close stream", async function () {
    // Test a method to let the admin close any stream (i.e. emergency close)
  });

  xit("#1.6 - Admin emergency drain", async function () {
    // Test a method to drain the contract
  });
});

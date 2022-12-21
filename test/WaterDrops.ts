import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import traveler from "ganache-time-traveler";
import { isCallTrace } from "hardhat/internal/hardhat-network/stack-traces/message-trace";

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
let superSigner: InstanceType<typeof sf.createSigner>;
let waterDrops: InstanceType<typeof WaterDrops>;

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

describe("WaterDrops", function () {
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

    //get the contract object for the erc20 token
    let ricAddress = ricx.underlyingToken.address;
    ric = new ethers.Contract(ricAddress, ricABI, admin);

    App = await ethers.getContractFactory("WaterDrops", admin);

    waterDrops = await App.deploy(
      sf.settings.config.hostAddress,
      sf.settings.config.cfaV1Address
    );

    await waterDrops.deployed();

    // Make Some RICx tokens
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
  });

  beforeEach(async function () {});

  it("#1.1 - Create a new claimable waterdrop", async function () {
    // As owner, create a new Claim
    let duration = 3600; // one hour
    let rate = 1000000; // tokens per second to claim
    let deadline = (await currentBlockTimestamp()) * 7200; // 2 hours
    await waterDrops.addClaim(ricx.address, rate, duration, deadline, {
      from: admin.address,
    });

    // verify claim was made and saved correctly
    let claim = await waterDrops.claims(1, { from: admin.address });
    expect(claim.token).to.equal(ricx.address);
    expect(claim.rate).to.equal(rate);
    expect(claim.duration).to.equal(duration);
    expect(claim.deadline).to.equal(deadline);

    // Call the addClaim function and expect the NewClaim event to be emitted
    await expect(
      waterDrops.addClaim(ricx.address, rate, duration, deadline, {
        from: admin.address,
      })
    )
      .to.emit(waterDrops, "NewClaim")
      .withArgs(2, ricx.address, rate, duration, deadline);
  });

  it("#1.2 - Create new users claims", async function () {
    // As owner, create a new user claims
    await waterDrops.addUserClaim(alice.address, 1, { from: admin.address });
    await waterDrops.addUserClaim(bob.address, 1, { from: admin.address });

    // Verify the userClaims were made correctly
    let userClaim = await waterDrops.userClaims(alice.address, {
      from: admin.address,
    });
    expect(userClaim).to.equal(1);
    userClaim = await waterDrops.userClaims(bob.address, {
      from: admin.address,
    });
    expect(userClaim).to.equal(1);

    // Check that the "NewUserClaim" event is emitted
    await expect(
      waterDrops.addUserClaim(alice.address, 1, { from: admin.address })
    )
      .to.emit(waterDrops, "NewUserClaim")
      .withArgs(alice.address, 1);
    await expect(
      waterDrops.addUserClaim(bob.address, 1, { from: admin.address })
    )
      .to.emit(waterDrops, "NewUserClaim")
      .withArgs(bob.address, 1);
  });

  it("#1.3 - User can claim their waterdrop", async function () {
    // As water drop recipient, claim the water drop
    await waterDrops.connect(alice).claim();
    // verify the stream exists to the receipient
    let flow = await waterDrops.getFlow(alice.address);
    expect(flow.flowRate).to.equal(1000000);

    // check for emission
    await expect(waterDrops.connect(alice).claim())
      .to.emit(waterDrops, "Claimed")
      .withArgs(alice.address, 1);
  });

  it("#1.4 - Streams are closed when ready", async function () {
    // As the keeper, call the closeNext() method

    // Add another claim to the closureQueue
    increaseTime(1000);
    await waterDrops.connect(bob).claim();

    // Expect revert when not ready to close (i.e. an hour has not passed)
    await expect(waterDrops.closeNext()).to.be.revertedWith(
      "not ready to close"
    );

    // Fast forward time to the first close (Alice)
    increaseTime(2600);

    await waterDrops.closeNext();

    console.log("Get alice flow", alice.address);
    let flow = await waterDrops.getFlow(alice.address);
    expect(flow.flowRate).to.equal(0);

    // Now close bob, the next in the queue

    await expect(waterDrops.closeNext()).to.be.revertedWith(
      "not ready to close"
    );

    increaseTime(2600);

    await waterDrops.closeNext();

    console.log("Get bob flow");
    flow = await waterDrops.getFlow(bob.address);
    expect(flow.flowRate).to.equal(0);

    // Expect that they can't claim again after closure
    // await expect(
    //      waterDrops.connect(alice).claim(),
    //   ).to.be.revertedWith('no claims');

    await expect(waterDrops.closeNext())
      .to.emit(waterDrops, "CloseStream")
      .withArgs(alice.address);
  });

  it("#1.5 - Admin close stream", async function () {
    // Test a method to let the admin close any stream (i.e. emergency close)
  });

  it("#1.6 - Admin emergency drain", async function () {
    // Test a method to drain the contract
  });
});

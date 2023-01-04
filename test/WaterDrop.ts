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

let accounts: any[]
let admin: SignerWithAddress;
let alice: SignerWithAddress;
let bob: SignerWithAddress;
let carl: SignerWithAddress;
let karen: SignerWithAddress;

let App: any;

let sf: InstanceType<typeof Framework>;;
let ric: InstanceType<typeof ricABI>;
let ricx: InstanceType<typeof ricABI>;
let superSigner: InstanceType<typeof sf.createSigner>;
let waterDrops: InstanceType<typeof WaterDrop>;
 

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


describe("WaterDrop", function () {
  let rate = 0;
  let deadline = 0;
  let duration = 0;

  before(async () => {
    [admin, alice, bob, carl, karen] = await ethers.getSigners();
    accounts = [admin, alice, bob, carl, karen];

    duration = 3600; // one hour
    rate = 1000000;  // tokens per second to claim
    deadline = (await currentBlockTimestamp()) * 7200; // 2 hours

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
      provider: web3
    });

    //use the framework to get the super token
    ricx = await sf.loadSuperToken("fDAIx");

    //get the contract object for the erc20 token
    let ricAddress = ricx.underlyingToken.address;
    ric = new ethers.Contract(ricAddress, ricABI, admin);

    App = await ethers.getContractFactory("WaterDrop", admin);

    waterDrops = await App.deploy(
      sf.settings.config.hostAddress,
      sf.settings.config.cfaV1Address,
      ricx.address,
      rate,
      duration,
      deadline
    );

    await waterDrops.deployed();

    // Make Some RICx tokens
    await ric.mint(
      admin.address, ethers.utils.parseEther("10000000")
    );
    await ric.connect(admin).approve(ricx.address, ethers.utils.parseEther("10000000"));

    let ricxUpgradeOperation = ricx.upgrade({
      amount: ethers.utils.parseEther("10000000")
    });
    await ricxUpgradeOperation.exec(admin);

    // Transfer RICx to the waterdrops contract
    let transferOperation = ricx.transfer({
      receiver: waterDrops.address,
      amount: ethers.utils.parseEther("10000000")
    });
    await transferOperation.exec(admin);


  });

  beforeEach(async function() {

  });

  it("#1.1 - Create a new claimable waterdrop", async function () {
    // As owner, create a new Claim
    let claim = await waterDrops.waterDrop();
    expect(claim.token).to.equal(ricx.address);
    expect(claim.rate).to.equal(rate);
    expect(claim.duration).to.equal(duration);
    expect(claim.deadline).to.equal(deadline);

  });

  it("#1.2 - Creare new users claims", async function () {
    // As owner, create a new user claims
    // Call the addClaim function and expect the NewClaim event to be emitted
     // Check that the "NewUserClaim" event is emitted
     await expect(
      waterDrops.addUserClaim(alice.address, { from: admin.address })
    )
      .to.emit(waterDrops, "NewUserClaim")
      .withArgs(alice.address);
    await expect(
      waterDrops.addUserClaim(bob.address, { from: admin.address })
    )
      .to.emit(waterDrops, "NewUserClaim")
      .withArgs(bob.address);

    // Verify the userClaims were made correctly
    let userClaim = await waterDrops.userClaims(alice.address, {from: admin.address});
    expect(userClaim).to.equal(true);
    userClaim = await waterDrops.userClaims(bob.address, {from: admin.address});
    expect(userClaim).to.equal(true);

  });

  it("#1.3 - User can claim their waterdrop", async function () {

    // As water drop recipient, claim the water drop
    await expect(waterDrops.connect(alice).claim())
      .to.emit(waterDrops, "Claimed")
      .withArgs(alice.address, 1000000);
    
    // Verify the stream exists to the receipient
    let flow = await waterDrops.getFlow(alice.address);
    expect(flow.flowRate).to.equal(1000000);

  });

  it("#1.4 - Streams are closed when ready", async function () {

    let claim = await waterDrops.waterDrop();

    // Add another claim to the closureQueue
    increaseTime(1000)
    await waterDrops.connect(bob).claim();

    // Expect revert when not ready to close (i.e. an hour has not passed)
    await expect(
         waterDrops.closeNext(),
      ).to.be.revertedWith('not ready to close');

    // Fast forward time to the first close (Alice)
    increaseTime(2600);

    await expect(waterDrops.closeNext())
    .to.emit(waterDrops, "StreamClosed")
    .withArgs(alice.address, claim.token);

    let flow = await waterDrops.getFlow(alice.address);
    expect(flow.flowRate).to.equal(0);

    // Now close bob, the next in the queue

    await expect(
        waterDrops.closeNext(),
    ).to.be.revertedWith('not ready to close');

    increaseTime(2600);

    await expect(waterDrops.closeNext())
    .to.emit(waterDrops, "StreamClosed")
    .withArgs(bob.address, claim.token);

    flow = await waterDrops.getFlow(bob.address);
    expect(flow.flowRate).to.equal(0);

    // Expect that they can't claim again after closure
    await expect(
         waterDrops.connect(alice).claim(),
    ).to.be.revertedWith('already claimed');


  });

  it("#1.5 - Admin close stream", async function () {
    // Test a method to let the admin close any stream (i.e. emergency close)
  });

  it("#1.6 - Admin emergency drain", async function () {
    // Test a method to drain the contract
  });



});

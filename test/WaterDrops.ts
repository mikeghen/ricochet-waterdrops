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
let waterDrops: InstanceType<typeof WaterDrops>;

let errorHandler = (err: any) => {
  if (err) throw err;
};

describe("WaterDrops", function () {

  before(async () => {
    const [admin, alice, bob, carl, karen] = await ethers.getSigners();
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
      provider: web3
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

    // verify claim was made and saved correctly
  });

  it("#1.2 - Creare new users claims", async function () {
    // As owner, create a new user claim
    // Repeat for all four users other user claims

    // Verify the userClaims were made correctly
  });

  it("#1.3 - User can claim their waterdrop", async function () {
    // As water drop receipient, claim the water drop

    // verify the stream exists to the receipient
  });



  it("#1.4 - Streams are closed when ready", async function () {
    // As the keeper, call the closeNext() method
    // Test that it reverts when noone is ready to be closed
    // Fast forward time to the first close
    // Test that it closes the stream to the user when its ready to be closed
  });

  it("#1.5 - Admin close stream", async function () {
    // Test a method to let the admin close any stream (i.e. emergency close)
  });

  it("#1.6 - Admin emergency drain", async function () {
    // Test a method to drain the contract
  });



});

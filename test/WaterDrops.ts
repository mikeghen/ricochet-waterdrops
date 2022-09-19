import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("WaterDrops", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    // Contracts are deployed using the first signer/account by default
    const [owner, alice, bob, carl, karen] = await ethers.getSigners();

    const accounts = [owner, alice, bob, carl, karen];

    const WaterDrops = await ethers.getContractFactory("WaterDrops");
    const waterdrops = await WaterDrops.deploy(host, cfa);

    return { waterdrops, accounts };
  }


  // before
  // 0. Create 10 user addresses for 10 waterdrop claims
  // 1. deploy the waterdrop contract

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

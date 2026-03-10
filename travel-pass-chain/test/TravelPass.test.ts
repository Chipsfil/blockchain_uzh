// test/TravelPass.test.ts
//
// Comprehensive test suite for the three-contract travel-pass system.
// Simulates a hypothetical "Zurich CityPass" scenario with multiple
// service providers and a multi-day usage journey.

import { expect } from "chai";
import hre from "hardhat";
import { encodeBytes32String } from "ethers";

describe("Multi-Modal Travel Pass", function () {
  // ─── Contracts ───────────────────────────────────
  let providerRegistry: any;
  let passFactory: any;
  let usageRegistry: any;

  // ─── Signers ─────────────────────────────────────
  let admin: any;
  let busOperator: any;
  let bikeCompany: any;
  let museum: any;
  let travelerA: any;
  let travelerB: any;
  let stranger: any;

  // ─── Network helpers (time manipulation) ─────────
  let networkHelpers: any;

  // ─── Entitlement labels ──────────────────────────
  const BUS_ZONE1 = encodeBytes32String("BUS_ZONE1");
  const BIKE_RIDES = encodeBytes32String("BIKE_RIDES");
  const MUSEUM_ENTRY = encodeBytes32String("MUSEUM_ENTRY");
  const TRAIN_REGIONAL = encodeBytes32String("TRAIN_REGIONAL");

  // ─── Constants ───────────────────────────────────
  const HOURS_48 = 48n * 3600n;
  const HOURS_24 = 24n * 3600n;

  beforeEach(async function () {
    const connection = await hre.network.connect();
    networkHelpers = connection.networkHelpers;
    const ethers = connection.ethers;

    const signers = await ethers.getSigners();
    [admin, busOperator, bikeCompany, museum, travelerA, travelerB, stranger] =
      signers;

    // Deploy ProviderRegistry
    const PR = await ethers.getContractFactory("ProviderRegistry");
    providerRegistry = await PR.deploy(admin.address);
    await providerRegistry.waitForDeployment();

    // Deploy PassFactory
    const PF = await ethers.getContractFactory("PassFactory");
    passFactory = await PF.deploy(admin.address);
    await passFactory.waitForDeployment();

    // Deploy UsageRegistry
    const UR = await ethers.getContractFactory("UsageRegistry");
    usageRegistry = await UR.deploy(admin.address);
    await usageRegistry.waitForDeployment();

    // Wire contracts
    await passFactory.setUsageRegistry(await usageRegistry.getAddress());
    await usageRegistry.setPassFactory(await passFactory.getAddress());
    await usageRegistry.setProviderRegistry(
      await providerRegistry.getAddress()
    );
  });

  // ══════════════════════════════════════════════════
  //  ProviderRegistry
  // ══════════════════════════════════════════════════

  describe("ProviderRegistry", function () {
    it("should register a provider", async function () {
      await expect(
        providerRegistry.registerProvider(
          busOperator.address,
          "Zurich Buses",
          "bus"
        )
      )
        .to.emit(providerRegistry, "ProviderRegistered")
        .withArgs(busOperator.address, "Zurich Buses", "bus");

      expect(await providerRegistry.isAuthorized(busOperator.address)).to.be
        .true;
      expect(await providerRegistry.getProviderCount()).to.equal(1n);
    });

    it("should revoke a provider", async function () {
      await providerRegistry.registerProvider(
        busOperator.address,
        "Zurich Buses",
        "bus"
      );
      await expect(providerRegistry.revokeProvider(busOperator.address))
        .to.emit(providerRegistry, "ProviderRevoked")
        .withArgs(busOperator.address);

      expect(await providerRegistry.isAuthorized(busOperator.address)).to.be
        .false;
    });

    it("should reactivate a revoked provider", async function () {
      await providerRegistry.registerProvider(
        busOperator.address,
        "Zurich Buses",
        "bus"
      );
      await providerRegistry.revokeProvider(busOperator.address);
      await expect(providerRegistry.reactivateProvider(busOperator.address))
        .to.emit(providerRegistry, "ProviderReactivated")
        .withArgs(busOperator.address);

      expect(await providerRegistry.isAuthorized(busOperator.address)).to.be
        .true;
    });

    it("should reject registration from non-owner", async function () {
      await expect(
        providerRegistry
          .connect(stranger)
          .registerProvider(stranger.address, "Hacker", "???")
      ).to.be.revertedWithCustomError(
        providerRegistry,
        "OwnableUnauthorizedAccount"
      );
    });

    it("should enumerate providers", async function () {
      await providerRegistry.registerProvider(
        busOperator.address,
        "Zurich Buses",
        "bus"
      );
      await providerRegistry.registerProvider(
        bikeCompany.address,
        "Zurich Bikes AG",
        "bike"
      );
      await providerRegistry.registerProvider(
        museum.address,
        "Kunsthaus Zurich",
        "museum"
      );

      expect(await providerRegistry.getProviderCount()).to.equal(3n);
      expect(await providerRegistry.getProviderAt(1)).to.equal(
        bikeCompany.address
      );
    });
  });

  // ══════════════════════════════════════════════════
  //  PassFactory
  // ══════════════════════════════════════════════════

  describe("PassFactory", function () {
    it("should create a pass type", async function () {
      const tx = await passFactory.createPassType(
        "Zurich CityPass 48h",
        "Unlimited bus + 10 bike rides + 2 museum entries",
        "Zurich Zone 110",
        "ipfs://Qm.../zurich_48h.json",
        HOURS_48,
        false, // non-transferable
        [BUS_ZONE1, BIKE_RIDES, MUSEUM_ENTRY],
        [0n, 10n, 2n]
      );

      await expect(tx)
        .to.emit(passFactory, "PassTypeCreated")
        .withArgs(1n, "Zurich CityPass 48h", "Zurich Zone 110", HOURS_48, false);

      const pt = await passFactory.getPassType(1n);
      expect(pt.name_).to.equal("Zurich CityPass 48h");
      expect(pt.zone_).to.equal("Zurich Zone 110");
      expect(pt.transferable_).to.be.false;
      expect(pt.entitlementIds_.length).to.equal(3);
    });

    it("should mint a pass and initialize entitlements", async function () {
      await passFactory.createPassType(
        "Zurich CityPass 48h",
        "Unlimited bus + 10 bike rides + 2 museum entries",
        "Zurich Zone 110",
        "ipfs://Qm.../zurich_48h.json",
        HOURS_48,
        false,
        [BUS_ZONE1, BIKE_RIDES, MUSEUM_ENTRY],
        [0n, 10n, 2n]
      );

      const mintTx = await passFactory.mintPass(travelerA.address, 1n);
      await expect(mintTx)
        .to.emit(passFactory, "PassMinted")
        .to.emit(usageRegistry, "EntitlementsInitialized");

      // Check NFT ownership
      expect(await passFactory.ownerOf(1n)).to.equal(travelerA.address);

      // Check entitlements initialized
      const [ids, max, rem] = await usageRegistry.getAllRemainingUnits(1n);
      expect(ids.length).to.equal(3);
      expect(max[1]).to.equal(10n); // BIKE_RIDES max
      expect(rem[1]).to.equal(10n); // BIKE_RIDES remaining
    });

    it("should block transfer of non-transferable pass", async function () {
      await passFactory.createPassType(
        "Soulbound Pass",
        "Non-transferable",
        "Zone A",
        "ipfs://metadata",
        HOURS_24,
        false,
        [BUS_ZONE1],
        [0n]
      );
      await passFactory.mintPass(travelerA.address, 1n);

      await expect(
        passFactory
          .connect(travelerA)
          .transferFrom(travelerA.address, travelerB.address, 1n)
      ).to.be.revertedWith("Non-transferable pass");
    });

    it("should allow transfer of transferable pass", async function () {
      await passFactory.createPassType(
        "Transferable Pass",
        "Can be resold",
        "Zone B",
        "ipfs://metadata",
        HOURS_24,
        true,
        [BIKE_RIDES],
        [5n]
      );
      await passFactory.mintPass(travelerA.address, 1n);

      await passFactory
        .connect(travelerA)
        .transferFrom(travelerA.address, travelerB.address, 1n);

      expect(await passFactory.ownerOf(1n)).to.equal(travelerB.address);
    });

    it("should reject minting from non-owner", async function () {
      await passFactory.createPassType(
        "Pass",
        "Desc",
        "Zone",
        "uri",
        HOURS_24,
        true,
        [BUS_ZONE1],
        [0n]
      );

      await expect(
        passFactory.connect(stranger).mintPass(stranger.address, 1n)
      ).to.be.revertedWithCustomError(
        passFactory,
        "OwnableUnauthorizedAccount"
      );
    });
  });

  // ══════════════════════════════════════════════════
  //  UsageRegistry
  // ══════════════════════════════════════════════════

  describe("UsageRegistry", function () {
    beforeEach(async function () {
      // Register providers
      await providerRegistry.registerProvider(
        busOperator.address,
        "Zurich Buses",
        "bus"
      );
      await providerRegistry.registerProvider(
        bikeCompany.address,
        "Zurich Bikes AG",
        "bike"
      );
      await providerRegistry.registerProvider(
        museum.address,
        "Kunsthaus Zurich",
        "museum"
      );

      // Create pass type and mint
      await passFactory.createPassType(
        "Zurich CityPass 48h",
        "Unlimited bus + 10 bike rides + 2 museum entries",
        "Zurich Zone 110",
        "ipfs://Qm.../zurich_48h.json",
        HOURS_48,
        false,
        [BUS_ZONE1, BIKE_RIDES, MUSEUM_ENTRY],
        [0n, 10n, 2n]
      );

      await passFactory.mintPass(travelerA.address, 1n);
    });

    it("should consume limited entitlement (bike ride)", async function () {
      const tx = await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(1n, BIKE_RIDES, 1n);

      await expect(tx)
        .to.emit(usageRegistry, "EntitlementConsumed")
        .withArgs(1n, BIKE_RIDES, bikeCompany.address, 1n, 9n);

      expect(await usageRegistry.getRemainingUnits(1n, BIKE_RIDES)).to.equal(
        9n
      );
    });

    it("should consume unlimited entitlement (bus)", async function () {
      // Should succeed any number of times
      for (let i = 0; i < 5; i++) {
        await usageRegistry
          .connect(busOperator)
          .consumeEntitlement(1n, BUS_ZONE1, 1n);
      }

      // Remaining stays 0 (unlimited sentinel)
      expect(await usageRegistry.getRemainingUnits(1n, BUS_ZONE1)).to.equal(0n);
    });

    it("should reject over-consumption", async function () {
      // Consume all 2 museum entries
      await usageRegistry
        .connect(museum)
        .consumeEntitlement(1n, MUSEUM_ENTRY, 2n);

      // Third entry should fail
      await expect(
        usageRegistry
          .connect(museum)
          .consumeEntitlement(1n, MUSEUM_ENTRY, 1n)
      ).to.be.revertedWith("Not enough units");
    });

    it("should reject unauthorized provider", async function () {
      await expect(
        usageRegistry
          .connect(stranger)
          .consumeEntitlement(1n, BIKE_RIDES, 1n)
      ).to.be.revertedWith("Not authorized provider");
    });

    it("should reject revoked provider", async function () {
      await providerRegistry.revokeProvider(bikeCompany.address);

      await expect(
        usageRegistry
          .connect(bikeCompany)
          .consumeEntitlement(1n, BIKE_RIDES, 1n)
      ).to.be.revertedWith("Not authorized provider");
    });

    it("should reject consumption of wrong entitlement", async function () {
      await expect(
        usageRegistry
          .connect(busOperator)
          .consumeEntitlement(1n, TRAIN_REGIONAL, 1n)
      ).to.be.revertedWith("Entitlement not in pass");
    });

    it("should reject consumption on expired pass", async function () {
      // Fast-forward time past 48h
      await networkHelpers.time.increase(48 * 3600 + 1);

      await expect(
        usageRegistry
          .connect(bikeCompany)
          .consumeEntitlement(1n, BIKE_RIDES, 1n)
      ).to.be.revertedWith("Pass invalid or expired");
    });

    it("should build a usage log", async function () {
      await usageRegistry
        .connect(busOperator)
        .consumeEntitlement(1n, BUS_ZONE1, 1n);
      await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(1n, BIKE_RIDES, 1n);
      await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(1n, BIKE_RIDES, 1n);
      await usageRegistry
        .connect(museum)
        .consumeEntitlement(1n, MUSEUM_ENTRY, 1n);

      expect(await usageRegistry.getUsageLogCount(1n)).to.equal(4n);

      const entries = await usageRegistry.getUsageLog(1n, 0n, 10n);
      expect(entries.length).to.equal(4);
      expect(entries[0].provider).to.equal(busOperator.address);
      expect(entries[1].provider).to.equal(bikeCompany.address);
      expect(entries[3].entitlementId).to.equal(MUSEUM_ENTRY);
    });

    it("should return max and remaining via getAllRemainingUnits", async function () {
      await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(1n, BIKE_RIDES, 3n);

      const [ids, max, rem] = await usageRegistry.getAllRemainingUnits(1n);

      // Find BIKE_RIDES index
      const idx = ids.findIndex(
        (id: string) => id === BIKE_RIDES
      );
      expect(max[idx]).to.equal(10n);
      expect(rem[idx]).to.equal(7n);
    });
  });

  // ══════════════════════════════════════════════════
  //  Integration: Zurich weekend scenario
  // ══════════════════════════════════════════════════

  describe("Zurich weekend simulation", function () {
    it("should simulate a 2-day city trip", async function () {
      // ── Setup ────────────────────────────────────
      await providerRegistry.registerProvider(
        busOperator.address,
        "VBZ (Zurich Transit)",
        "bus"
      );
      await providerRegistry.registerProvider(
        bikeCompany.address,
        "Zurich Bikes AG",
        "bike"
      );
      await providerRegistry.registerProvider(
        museum.address,
        "Kunsthaus Zurich",
        "museum"
      );

      // Create two pass types
      await passFactory.createPassType(
        "Zurich CityPass 48h",
        "Unlimited bus zone 1, 10 bike rides, 2 museum entries",
        "Zurich Zone 110",
        "ipfs://Qm.../zurich_48h.json",
        HOURS_48,
        false,
        [BUS_ZONE1, BIKE_RIDES, MUSEUM_ENTRY],
        [0n, 10n, 2n]
      );

      await passFactory.createPassType(
        "Zurich Express 24h",
        "Unlimited bus zone 1, 3 bike rides",
        "Zurich Zone 110",
        "ipfs://Qm.../zurich_24h.json",
        HOURS_24,
        true,
        [BUS_ZONE1, BIKE_RIDES],
        [0n, 3n]
      );

      // Mint passes
      await passFactory.mintPass(travelerA.address, 1n); // token 1
      await passFactory.mintPass(travelerB.address, 2n); // token 2

      // ── Day 1 (Traveler A) ───────────────────────
      // Morning: takes bus to old town
      await usageRegistry
        .connect(busOperator)
        .consumeEntitlement(1n, BUS_ZONE1, 1n);

      // Rents a bike
      await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(1n, BIKE_RIDES, 1n);

      // Visits museum
      await usageRegistry
        .connect(museum)
        .consumeEntitlement(1n, MUSEUM_ENTRY, 1n);

      // Evening: bus back
      await usageRegistry
        .connect(busOperator)
        .consumeEntitlement(1n, BUS_ZONE1, 1n);

      // ── Day 1 (Traveler B) ───────────────────────
      await usageRegistry
        .connect(busOperator)
        .consumeEntitlement(2n, BUS_ZONE1, 1n);
      await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(2n, BIKE_RIDES, 1n);

      // ── Day 2 (Traveler A) ───────────────────────
      await networkHelpers.time.increase(12 * 3600);

      await usageRegistry
        .connect(bikeCompany)
        .consumeEntitlement(1n, BIKE_RIDES, 2n);

      await usageRegistry
        .connect(museum)
        .consumeEntitlement(1n, MUSEUM_ENTRY, 1n);

      // ── Verify final state ───────────────────────
      // Traveler A: 10 - 3 = 7 bike rides, 2 - 2 = 0 museum
      const [ids, , rem] = await usageRegistry.getAllRemainingUnits(1n);

      const bikeIdx = ids.findIndex(
        (id: string) => id === BIKE_RIDES
      );
      const museumIdx = ids.findIndex(
        (id: string) => id === MUSEUM_ENTRY
      );

      expect(rem[bikeIdx]).to.equal(7n);
      expect(rem[museumIdx]).to.equal(0n);

      // Traveler B: 3 - 1 = 2 bike rides
      const [, , remB] = await usageRegistry.getAllRemainingUnits(2n);
      expect(remB[1]).to.equal(2n); // BIKE_RIDES index for pass type 2

      // Usage log for Traveler A
      expect(await usageRegistry.getUsageLogCount(1n)).to.equal(6n);

      // Museum entry should now be depleted for A
      await expect(
        usageRegistry
          .connect(museum)
          .consumeEntitlement(1n, MUSEUM_ENTRY, 1n)
      ).to.be.revertedWith("Not enough units");

      // Pass validity check
      expect(await passFactory.isPassValid(1n)).to.be.true;

      // Fast-forward past 48h expiry
      await networkHelpers.time.increase(48 * 3600);

      expect(await passFactory.isPassValid(1n)).to.be.false;
    });
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";

describe("KudosNFT", () => {
  it("mints only as owner", async () => {
    const [owner, other] = await ethers.getSigners();
    const KudosNFT = await ethers.getContractFactory("KudosNFT");
    const contract = await KudosNFT.connect(owner).deploy();
    await contract.waitForDeployment();

    await expect(
      contract.connect(other).mint(other.address, "ipfs://token", "cast", "url")
    ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");

    const tx = await contract.connect(owner).mint(other.address, "ipfs://token", "cast", "url");
    await tx.wait();

    expect(await contract.ownerOf(1)).to.equal(other.address);
  });
});

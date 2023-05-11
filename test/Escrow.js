const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseEther(n.toString());
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender
    let realEstate, escrow

    beforeEach(async () => {
        //* Setup accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners()

        //* Deploy the Real Estate
        const RealEstate = await ethers.getContractFactory('RealEstate')
        realEstate = await RealEstate.deploy()

        //* Mint 1 NFT that corresponds to one real estate
        const mintTx = await realEstate.connect(seller).mint('https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS')
        await mintTx.wait()

        //* Deploy the Escrow
        const Escrow = await ethers.getContractFactory('Escrow')
        escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address)
    })

    describe('Deployment', () => {
        it('should return the NFT address', async () => {
            const result = await escrow.nftAddress()
            expect(result).to.be.equal(realEstate.address)
        })

        it('should return the seller address', async () => {
            const result = await escrow.seller()
            expect(result).to.be.equal(seller.address)
        })

        it('should return the inspector address', async () => {
            const result = await escrow.inspector()
            expect(result).to.be.equal(inspector.address)
        })

        it('should return the lender address', async () => {
            const result = await escrow.lender()
            expect(result).to.be.equal(lender.address)
        })
    })
})
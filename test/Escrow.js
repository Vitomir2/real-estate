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
        let tx = await realEstate.connect(seller).mint('https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS')
        await tx.wait()

        //* Deploy the Escrow
        const Escrow = await ethers.getContractFactory('Escrow')
        escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address)

        //* Approve the property
        tx = await realEstate.connect(seller).approve(escrow.address, 1)
        await tx.wait()

        //* List the property
        tx = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(3))
        await tx.wait()
    })

    // TODO: add test for the onlySeller modifier

    describe('Deployment', () => {
        it('should return the NFT address', async () => {
            const res = await escrow.nftAddress()
            expect(res).to.be.equal(realEstate.address)
        })

        it('should return the seller address', async () => {
            const res = await escrow.seller()
            expect(res).to.be.equal(seller.address)
        })

        it('should return the inspector address', async () => {
            const res = await escrow.inspector()
            expect(res).to.be.equal(inspector.address)
        })

        it('should return the lender address', async () => {
            const res = await escrow.lender()
            expect(res).to.be.equal(lender.address)
        })
    })

    describe('Listing', () => {
        it('should transfer the ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)
        })

        it('should update the property as listed', async () => {
            const res = await escrow.isListed(1)
            expect(res).to.be.equal(true)
        })

        it('should return the buyer address', async () => {
            const res = await escrow.buyer(1)
            expect(res).to.be.equal(buyer.address)
        })

        it('should return the purchase price', async () => {
            const res = await escrow.purchasePrice(1)
            expect(res).to.be.equal(tokens(10))
        })

        it('should return the escrow amount', async () => {
            const res = await escrow.escrowAmount(1)
            expect(res).to.be.equal(tokens(3))
        })
    })

    describe('Deposits', () => {
        it('should update the contract balance', async () => {
            const tx = await escrow.connect(buyer).depositEarnest(1, { value: tokens(3) })
            await tx.wait()

            const res = await escrow.getBalance()
            expect(res).to.be.equal(tokens(3))
        })
    })

    describe('Inspections', () => {
        it('should update the inspection status', async () => {
            const tx = await escrow.connect(inspector).changeInspectionStatus(1, true)
            await tx.wait()

            const res = await escrow.inspectionPassed(1)
            expect(res).to.be.equal(true)
        })
    })

    describe('Approvals', () => {
        it('should approve sale for all parties', async () => {
            let tx = await escrow.connect(seller).approveSale(1)
            await tx.wait()

            tx = await escrow.connect(buyer).approveSale(1)
            await tx.wait()

            tx = await escrow.connect(lender).approveSale(1)
            await tx.wait()

            expect(await escrow.approval(1, seller.address)).to.be.equal(true)
            expect(await escrow.approval(1, buyer.address)).to.be.equal(true)
            expect(await escrow.approval(1, lender.address)).to.be.equal(true)
        })
    })

    describe('Sale', () => {
        beforeEach(async () => {
            let tx = await escrow.connect(buyer).depositEarnest(1, { value: tokens(3) })
            await tx.wait()

            tx = await escrow.connect(inspector).changeInspectionStatus(1, true)
            await tx.wait()

            tx = await escrow.connect(seller).approveSale(1)
            await tx.wait()

            tx = await escrow.connect(buyer).approveSale(1)
            await tx.wait()

            tx = await escrow.connect(lender).approveSale(1)
            await tx.wait()

            await lender.sendTransaction({ to: escrow.address, value: tokens(7) })

            tx = await escrow.connect(seller).finalizeSale(1)
            await tx.wait()
        })

        it('should update the escrow balance', async () =>  {
            expect(await escrow.getBalance()).to.be.equal(0)
        })

        it('should change property ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
        })
    })
})

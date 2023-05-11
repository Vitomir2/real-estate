// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    /// @notice The address of the NFT contract
    address public nftAddress;

    /// @notice The address of the person that is selling the real estate
    address payable public seller;

    /// @notice The address of the deal inspector
    address public inspector;

    /// @notice The address of the lender
    address public lender;

    /// @notice A mapping to show if the property is listed or not
    mapping(uint256 => bool) public isListed;

    /// @notice A mapping to connect a purchase price to a property
    mapping(uint256 => uint256) public purchasePrice;

    /// @notice A mapping to link an escrow amount to a property
    mapping(uint256 => uint256) public escrowAmount;

    /// @notice A mapping to connect the property with the buyer address
    mapping(uint256 => address) public buyer;

    /// @notice A mapping to mark if the property inspection passed
    mapping(uint256 => bool) public inspectionPassed;

    /// @notice A mapping to approve sale for a property and address
    mapping(uint256 => mapping(address => bool)) public approval;

    //--- Modifiers ---
    /**
     * @notice Modifier that checks only seller is calling a method
     */
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method!");
        _;
    }

    /**
     * @notice Modifier that checks only buyer is calling a method
     */
    modifier onlyBuyer(uint256 _nftId) {
        require(msg.sender == buyer[_nftId], "Only buyer can call this method!");
        _;
    }

    /**
     * @notice Modifier that checks only inspector is calling a method
     */
    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this method!");
        _;
    }

    constructor(address _nftAddress, address payable _seller, address _inspector, address _lender) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    //--- Functions ---
    /**
     * @notice Function that will be used to list a property
     * @param _nftId the id of a property
     * @param _buyer the address of the buyer
     * @param _purchasePrice the purchase price of a property
     * @param _escrowAmount the amount of the escrow
     */
    function list(
        uint256 _nftId,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller {
        //* Transfer the NFT from seller to this escrow contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftId);

        isListed[_nftId] = true;
        purchasePrice[_nftId] = _purchasePrice;
        escrowAmount[_nftId] = _escrowAmount;
        buyer[_nftId] = _buyer;
    }

    /**
     * @notice Function to deposit the earnest
     * @param _nftId the id of the property
     */
    function depositEarnest(uint256 _nftId) public payable onlyBuyer(_nftId) {
        require(msg.value == escrowAmount[_nftId], "The earnest amount is incorrect!");
    }

    /**
     * @notice Method that will change the status of a property
     * @param _nftId the id of the property
     * @param _passed boolean to check if passed or not
     */
    function changeInspectionStatus(uint256 _nftId, bool _passed) public onlyInspector {
        inspectionPassed[_nftId] = _passed;
    }

    /**
     * @notice Method to approve a sale
     * @param _nftId the id of the property
     */
    function approveSale(uint256 _nftId) public {
        approval[_nftId][msg.sender] = true;
    }

    /**
     * @notice Method to finalize the property sale
     * @param _nftId the id of the property
     */
    function finalizeSale(uint256 _nftId) public {
        require(inspectionPassed[_nftId], "The inspection is not passed!");
        require(approval[_nftId][seller], "It is not approved for the seller!");
        require(approval[_nftId][buyer[_nftId]], "It is not approved for the seller!");
        require(approval[_nftId][lender], "It is not approved for the seller!");
        require(
            address(this).balance >= purchasePrice[_nftId],
            "There are not enough funds in the contract to finalize the sale!"
        );

        isListed[_nftId] = false;

        (bool success, ) = payable(seller).call{value: purchasePrice[_nftId]}("");
        require(success, "Failed to send the funds to the seller!");

        //* Transfer the NFT to the buyer
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftId], _nftId);
    }

    // TODO: think of a nice way to cancel the sale
    // function cancelSale(uint256 _nftId) public {
    //     if (inspectionPassed[_nftId]) {
    //         payable(buyer[_nftId]).transfer(purchasePrice[_nftId]);
    //     } else {
    //         payable(seller).transfer(purchasePrice[_nftId]);
    //     }
    // }

    /**
     * @notice Method to return the balance in the escrow contract
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    //* Required for the contract to receive ether
    receive() external payable {}
}
//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface Helper {
  function TuringTx(string memory, bytes memory) external returns (bytes memory);
  function TuringRandom() external returns (uint256);
  function Turing42() external returns (uint256);
}

contract HelloTuring {

  address public helperAddr;
  Helper myHelper;

  event MultFloatNumbers(uint256);
  event GetRandom(uint256);
  event Get42(uint256);
  event MultArray(uint256);

  constructor(address _helper) {
    helperAddr = _helper;
    myHelper = Helper(helperAddr);
  }

  function multFloatNumbers(string memory _url, string memory a)
    public {

    bytes memory encRequest = abi.encode(a);

    bytes memory encResponse = myHelper.TuringTx(_url, encRequest);

    uint256 product = abi.decode(encResponse,(uint256));

    // Test case to ensure revert string is reported to client
    require (product != 0, "Multiply by zero error");

    emit MultFloatNumbers(product);
  }

  // Tests a Turing method which returns a variable-length array.
  // The parameters 'a' and 'b' are passed in the request, returing
  // an array of 'b' elements each with value 'a'. This function
  // adds all of the returned values and returns a total of (a*b)
  function multArray(string memory _url, uint256 a, uint256 b)
    public {
    uint256 sum = 0;

    bytes memory encRequest = abi.encode(a,b);
    bytes memory encResponse = myHelper.TuringTx(_url, encRequest);

    uint256[] memory ary = abi.decode(encResponse, (uint256[]));

    uint256 i = 0;
    for (i = 0; i<ary.length; i++)
    {
      sum += ary[i];
    }

    emit MultArray(sum);
  }

  function getRandom()
    public {

    uint256 result = myHelper.TuringRandom();

    emit GetRandom(result);
  }

  function get42()
    public {

    uint256 result = myHelper.Turing42();

    emit Get42(result);
  }

}





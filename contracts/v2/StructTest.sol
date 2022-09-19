// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract StructTest {
    struct Test {
        uint one;
        uint two;
        mapping (uint8 => address) owners;
    }
    Test[] test;

    constructor() {
    }

    function initTest(uint _index) private {
        Test storage _t = test[_index];
        _t.one = 1;
        _t.two = 2;
        _t.owners[1] = address(this);
        _t.owners[2] = msg.sender;
    }

    function register() public {
        uint _index = test.length;
        test.push();
        initTest(_index);
    }

    function get(uint _index) public view returns (uint, uint, address, address) {
        Test storage _t = test[_index];
        return (_t.one, _t.two, _t.owners[1], _t.owners[2]);
    }
    
}
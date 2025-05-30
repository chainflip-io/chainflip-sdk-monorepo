/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  StateChainGateway,
  StateChainGatewayInterface,
} from "../StateChainGateway.js";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract IKeyManager",
        name: "keyManager",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "minFunding",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bool",
        name: "communityGuardDisabled",
        type: "bool",
      },
    ],
    name: "CommunityGuardDisabled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "flip",
        type: "address",
      },
    ],
    name: "FLIPSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "oldSupply",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newSupply",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "stateChainBlockNumber",
        type: "uint256",
      },
    ],
    name: "FlipSupplyUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "address",
        name: "funder",
        type: "address",
      },
    ],
    name: "Funded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "GovernanceWithdrawal",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "oldMinFunding",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newMinFunding",
        type: "uint256",
      },
    ],
    name: "MinFundingChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RedemptionExecuted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "RedemptionExpired",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "redeemAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint48",
        name: "startTime",
        type: "uint48",
      },
      {
        indexed: false,
        internalType: "uint48",
        name: "expiryTime",
        type: "uint48",
      },
    ],
    name: "RedemptionRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "bool",
        name: "suspended",
        type: "bool",
      },
    ],
    name: "Suspended",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "keyManager",
        type: "address",
      },
    ],
    name: "UpdatedKeyManager",
    type: "event",
  },
  {
    inputs: [],
    name: "REDEMPTION_DELAY",
    outputs: [
      {
        internalType: "uint48",
        name: "",
        type: "uint48",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "disableCommunityGuard",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "enableCommunityGuard",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
    ],
    name: "executeRedemption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "fundStateChainAccount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getCommunityGuardDisabled",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCommunityKey",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getFLIP",
    outputs: [
      {
        internalType: "contract IFLIP",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getGovernor",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getKeyManager",
    outputs: [
      {
        internalType: "contract IKeyManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getLastSupplyUpdateBlockNumber",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMinimumFunding",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
    ],
    name: "getPendingRedemption",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "redeemAddress",
            type: "address",
          },
          {
            internalType: "uint48",
            name: "startTime",
            type: "uint48",
          },
          {
            internalType: "uint48",
            name: "expiryTime",
            type: "uint48",
          },
        ],
        internalType: "struct IStateChainGateway.Redemption",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSuspendedState",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "govUpdateFlipIssuer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "govWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "sig",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "kTimesGAddress",
            type: "address",
          },
        ],
        internalType: "struct IShared.SigData",
        name: "sigData",
        type: "tuple",
      },
      {
        internalType: "bytes32",
        name: "nodeID",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "redeemAddress",
        type: "address",
      },
      {
        internalType: "uint48",
        name: "expiryTime",
        type: "uint48",
      },
    ],
    name: "registerRedemption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "resume",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "contract IFLIP",
        name: "flip",
        type: "address",
      },
    ],
    name: "setFlip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "newMinFunding",
        type: "uint256",
      },
    ],
    name: "setMinFunding",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "suspend",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "sig",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "kTimesGAddress",
            type: "address",
          },
        ],
        internalType: "struct IShared.SigData",
        name: "sigData",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "newIssuer",
        type: "address",
      },
      {
        internalType: "bool",
        name: "omitChecks",
        type: "bool",
      },
    ],
    name: "updateFlipIssuer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "sig",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "kTimesGAddress",
            type: "address",
          },
        ],
        internalType: "struct IShared.SigData",
        name: "sigData",
        type: "tuple",
      },
      {
        internalType: "uint256",
        name: "newTotalSupply",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "stateChainBlockNumber",
        type: "uint256",
      },
    ],
    name: "updateFlipSupply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "sig",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "kTimesGAddress",
            type: "address",
          },
        ],
        internalType: "struct IShared.SigData",
        name: "sigData",
        type: "tuple",
      },
      {
        internalType: "contract IKeyManager",
        name: "keyManager",
        type: "address",
      },
      {
        internalType: "bool",
        name: "omitChecks",
        type: "bool",
      },
    ],
    name: "updateKeyManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class StateChainGateway__factory {
  static readonly abi = _abi;
  static createInterface(): StateChainGatewayInterface {
    return new Interface(_abi) as StateChainGatewayInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): StateChainGateway {
    return new Contract(address, _abi, runner) as unknown as StateChainGateway;
  }
}

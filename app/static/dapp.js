
async function ethEnabled() {
    // If the browser has an Ethereum provider (MetaMask) installed
    if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        window.ethereum.enable();
        return true;
    }
    return false;
}

let erc20_abi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
let water_drops_abi = [
  {"inputs":[{"internalType":"contract ISuperfluid","name":"_host","type":"address"},{"internalType":"contract IConstantFlowAgreementV1","name":"_cfa","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"contract ISuperToken","name":"token","type":"address"},{"internalType":"int96","name":"rate","type":"int96"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"addClaim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"claimIndex","type":"uint256"}],"name":"addUserClaim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"cfaV1","outputs":[{"internalType":"contract ISuperfluid","name":"host","type":"address"},{"internalType":"contract IConstantFlowAgreementV1","name":"cfa","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"claim","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"claims","outputs":[{"internalType":"contract ISuperToken","name":"token","type":"address"},{"internalType":"int96","name":"rate","type":"int96"},{"internalType":"uint256","name":"duration","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"closeNext","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"}],"name":"getFlow","outputs":[{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"int96","name":"flowRate","type":"int96"},{"internalType":"uint256","name":"deposit","type":"uint256"},{"internalType":"uint256","name":"owedDeposit","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userClaims","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
let web3, ric, user, waterdrops;
let appAddress = "0x2Dfb623Df06946405BAAF59A12CA549c5dF1eBaB"; // Mumbai

async function main() {
    await ethereum.enable();
    web3 = new Web3(ethereum);
    user = (await web3.eth.getAccounts())[0];
    setInterval(getBalance, 200);
    const networkId = await web3.eth.net.getId();
    console.debug("networkId", networkId);


    waterdrops = new web3.eth.Contract(
        water_drops_abi,
        appAddress);
    console.debug("waterdrops contract", waterdrops._address);
}


// TODO: Put this in a function and don't duplicate code, use a list and a loop
document.getElementById("claim").addEventListener("click", function() {
    claim();
}, false);

async function claim() {
  // Get the address for approval
  await waterdrops.methods.claim().send({from: user});
}

async function refreshSubscription(address) {
   const sub = await ida.methods.getSubscription(
       address,
       appAddress,
       0,
       user
   ).call();
   console.log(sub);
   if (sub.approved) {
     let abtn = document.getElementById("approve-"+address)
     let sbtn = document.getElementById("start-"+address)
     let input = document.getElementById("input-amt-"+address)
     abtn.innerHTML = sub.approved ? "Approved" : "no";
     abtn.disabled = true;
     sbtn.disabled = false;
     input.disabled = false;
   }

}

async function getBalance(tokenAddress) {
  let url = "http://localhost:5000/balance/" + user + "/0x5D8B4C2554aeB7e86F387B4d6c00Ac33499Ed01f";
  return fetch(url)
  .then(function (response) {
    return response.json();
  })
  .then(function (payload) {
    // console.log(payload.balance);
    document.getElementById("ric-balance").innerHTML = payload.balance;
  })
  .catch(function (error) {
    console.log("Error: " + error);
  });
}

main();

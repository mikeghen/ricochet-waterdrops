# Waterdrop 🚰
### _by Ricochet Exchange_
Waterdrop works like a regular claimable airdrop except the tokens are streamed to the recipient overtime.

## Protocol Specification

* The contract is loaded with the `outputToken` required, there should be a surplus to account for delays in closing streams
* Waterdrop recipients call the `claim` method on the contract to start receiving their stream
* `claim` creates a [Gelato](https://www.gelato.network/) job to close the stream at some point in the future
* The contract can be reused for multiple waterdrops but only one waterdrop can run at one time
* Claims have a `deadline` and can be claimed up to the deadline, the deadline only applies to starting the stream
* This assumes the contract will have enough to stream to everyone in the airdrop
* Assumes the same amount to be distributed to everyone as part of the airdrop
* This can't be used to run 2 campaigns simultaneously

### Structures
`Claim` - a claim represents a waterdrop claim and contains information about the rate and duration of the claim
  - `token` - the token to use for the waterdrop
  - `rate` - the rate tokens are streamed to the receipient in wei per second
  - `duration` - the amount of time the claim will stream until the claim period ends
  - `deadline` - the date after which this claim is not longer allowed

### Variables
- `mapping(uint => Claim) claims` - a mapping containing the different claim types
- `mapping(address => uint) userClaims`  - maps addresses to their the claim
- `address[] closureQueue` - list of addresses to close streams, addresses are pushed in, `queueIndex` is moved around
- `uint queueIndex` - an index into the `closureQueue` tracks where the front of the queue is
- `address owner` - the owner of the contract (uses `Ownable`)

### Modifiers
- `onlyOwner` - modifies methods so they can only be called by the owner (uses `Ownable`)

### Methods
#### `addClaim(uint index, ISuperToken token, uint rate, uint duration, uint deadline) onlyOwner`
- Description: add a new waterdrop claim
- Parameters
  - `token` - a supertoken
  - `rate` - the output rate for this claim in wei per second
  - `duration` - the amount of seconds this claim will stream for
  - `deadline` - the timestamp of when this claim will expire
- Pre-conditions
- Post-conditions
  - A new `Claim` is added to `claims`


#### `addUserClaim(address recipient, uint claimIndex) onlyOwner`
- Description: add a record to `userClaims` so that `receipient` can claim their tokens
- Parameters
  - `recipient` - the address of the person that can claim the waterdrop
  - `claimIndex` - indexes `claims` to select which claim this user is elegible for
- Pre-conditions
  - The user does not already have a claim (if they do this will overwrite that claim)
  - There exists a `Claim` at `claims[claimIndex]`
- Post-conditions
  - a new entry is added to `userClaims`

#### `claim()`
- Description: Initiates the claim for the users
- Parameters
- Pre-conditions
  - There exists a claim for this `msg.sender`
  - The `msg.sender` is added to the `closureQueue` using a push operation
- Post-conditions
  - A stream of tokens is opened to the `msg.sender`
  - A Gelato job is created that will shut off the stream after `duration` has elapsed
  - It will revert if the `deadline` for the claim has passed

#### `closeNext()`
:information_source: This is the method that Gelato network checks for ready to execute
- Description: Closes the stream to `closureQueue[queueIndex]` if its ready to close
- Parameters
- Pre-conditions
  - Will revert unless the address at the front of the queue is ready to close
  - Based on when the stream was started (from SF sdk), the `rate`, and `duration`
- Post-conditions

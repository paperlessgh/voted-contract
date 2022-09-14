#
# **Overview**

In this doc a smart contract to facilitate voting on the Tezos Platform is outlined. As for any E-Voting System our main aim is to replicate the physical version and also take advantage of the transparency and accountancy of smart contracts to greatly enhance the voting experience.

As such, there are a few properties that we wish our smart contract to have.

1. Ensure transparency.
2. Ensure provability. Voters should be able to know from the smart contract storage who they voted for.
3. Prevent double voting.
4. Ensure organizers do not have absolute control over the voting process.

#
# **Smart Contract Overview**

1. Election Setup
2. Voting Process
3. Counting/Tallying

## **Election Setup**

Anytime a user does a publish;

- If it is the first time of publishing;
  - Register the election on the smart contract.
  - Generate private key and public key for the election
  - Use the private key to sign the tokens.
  - Discard the private key.
  - Store the public key on the smart contract.
  - Send the user tokens to them.
  - All of these have to be done in a background process using queues.
- If it is not the first time, it means that the smart contract has already been published.
  - Generate another private key, public key pair
  - Repeat the process for newly added users.

Create a table to track smart contracts with the following columns

1. address - address of the smart contract
2. level - level of the smart contract for now we have basic

## **Voting Process**

When the election is private the ui must require a token if it is not passed in the url.

### **How to validate the token**

- The validate token endpoint will take the election and the token as input
- It will then tell whether the token is valid or not.
- This is done by checking the signature of the token with all the public keys of the election
- It should work for only one of them.

This should be checked when the voter is trying to access the election page and also when the voter is finally placing the vote.

There should be a ui to show the user when the token is invalid.

### **How to record the vote**

- First try to save the vote in the smart contract.
- Use the hash to form a link and add this to your response.
- You need to add a button in the success ui where the user can click to view their vote on the smart contract.
- Use some cool animation in the loading popup when a vote is being placed.

## **Counting / Tallying**

How do we finally count the results of the voting.

- At the end of the voting, move the election status to counting.
- During this period any visit to the election page should show appropriate notice that we are now counting the vote and user should come back in a specific time period.
- After counting move the election status to ended.
- During the counting necessary statistics will be generated from the smart contract and stored in our databases.

## **Statistics to generate**

- Number of votes for each contestant in each category.
- Overall number of votes in a category.
- Votes per period
- Total number of votes.

#
# **Implementation**

## **Client**

- There should now be a smart contract service which will provide all the smart contract related functionalities.

```typescript
class SmartContractService {

  registerElection(smartContractAddress, electionId, electionDetails)

  validateToken(smartContractAddress, electionId, token)

  recordVote(smartContractAddress, electionId, voteDetails)

  getVoteData(smartContractAddress, electionId)

  updateElection(smartContractAddress, electionId, electionDetails)

  generateTokens(smartContractAddress, electionId, numberOfTokens)

}
```
## **Contract**

The smart contract will be able to handle several elections simultaneously. Each election will have a list Tezos public keys which will be used to validate pre-signed tokens as discussed above. The tokens are generated using the private key of the public key.

### **Data Storage**

The following data would need to be persisted on the smart contract.

1. Election
2. Category
3. Candidate
4. Vote

#### **Election**

The election storage is a big\_map with keys as election\_id and value is a record containing the following data;

- **categories** - the various categories in the election.
- **candidates** - all the candidates in the election.
- **start\_time** - time the election is supposed to start.
- **end\_time** - time the election is supposed to end.
- **visibility** - whether its public or private.
- **active** - whether the election is active or not.
- **mode** - free or paid (user must pay before voting).
- **cost\_per\_vote** - in case of paid election or 0 otherwise.
- **vote\_limit** - the max number of votes a user is allowed on the election, defaults to sum of vote\_limit on all categories.
- **organizer** - tezos account responsible for managing election
- **title** - title of the election.
- **description** - description of the election.
- **pub\_keys** - public keys that are related to the election tokens.
- **votes** - populated as votes are being cast
- **vote_count** - records number of votes

#### **Category**

The category storage is a map with keys as category\_id and value is a record containing the following data;

- **title** - title of the category
- **description** - description of the category
- **vote\_limit** - the max number of votes a user is allowed on the category, defaults to 1

#### **Candidate**

The candidate storage is a map with keys as candidate\_id and value is a record containing the following data;

- **name** - name of the candidate
- **description** - description of the candidate
- **category\_id** - category the candidate belongs to

#### **Vote**

The vote storage is an iterable\_big\_map with keys as tokens _in case of private vote_, and value is a record containing the following data;

- **election\_id** - id of the election
- **category\_id** - id of the category
- **candidate\_id** - id of the candidate
- **number\_of\_votes** - number of votes to be counted

_If the vote is not private, then this will only use a big\_map with keys as strictly consecutive positive integers starting from 0._

### **Entry Points**

The smart contract shall have the following entry points;

1. Set Election
2. Add Election Pub Key
3. Vote

#### **Set Election**

- This entry point takes as input an entire election record, and the election\_id.
- If the election\_id does not exist a new entry is made in the election storage.
  - The election record here does not include the votes
  - The votes should be initialized to big_map or iterable_big_map based on the.
  - There should be at least one item in the pub\_keys if the election is private.
- If the election\_id already exists it will just replace with the new election record.
  - It should fail if the current time is greater than the start time.
  - The caller should be the organizer.
- Each category should have all required data.
- Each candidate should have all required data.
- Verify each category\_id of each candidate exists in the submitted categories.

#### **Add Election Pub Key**

- The entry point takes as input a tezos public key.
- Can only be called by organizer.
- Appends the public key to already list of public keys.

#### **Vote**

- A vote is just a record as follows (election\_id, category\_id, candidate\_id, number\_of\_votes)
- A token is required in private election (check the visibility )
- The number\_of\_votes is optional and is 1 by default.
- Can be called by any tezos account.
- should verify that the token was signed by one of the keys in pub\_keys if election is private
- If election is public there is no need for a token
- This entry point should fail if current time is not in the interval [start\_time, end\_time]

### **Vote Token**

A vote token is needed for private election. This is for restricted elections. Tokens must be generated and sent to the approved voters over any of these preferred mediums;

- email
- sms
- whatsapp
- telegram

For now the key generation is done in the backend application and sent to the approved recipients.

The exact process is described above in the **Election Setup** section of this document above. To shed a few more light on the token creation process;

1. A random tezos account is generated.
2. The public key is added to the smart contract.
3. For each user, a random piece of data is generated, let that be d .
4. This is then signed using the private key of the tezos account, to obtain a signature sd .
5. Both the data d and signature sd is packed into a tuple (d, sd) data structure to be unpacked by the smart contract and verified with the public keys stored on the smart contract.
6. Send the base58check encoded version of the packed data to the user.
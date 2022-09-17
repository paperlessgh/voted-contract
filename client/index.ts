import { electionData, v1 } from "./election_data";
import { SimpleVoteContractClient} from "./voted-client";


(async () => {
    const organizerPrivateKey = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq";
    const contractAddress = "KT1F5rjUByiZzGaVT7kZvKoeKWzK7xuTXZEG";
    const rpcUrl = "https://ghostnet.ecadinfra.com";
    const tzktGhostnet = "https://ghostnet.tzkt.io";

    const sv: SimpleVoteContractClient = new SimpleVoteContractClient(contractAddress, organizerPrivateKey, rpcUrl);

    console.log("Publishing election ...");

    // const operationHash: string | undefined = await sv.publishElection(electionData);

    // if (operationHash == undefined) {
    //     console.log("The publish washn't successfull ...");
    //     return;
    // } else {
    //     console.log(`Publish successfull ${tzktGhostnet}/${operationHash}`);
    // }

    console.log("Generating tokens ...");
    const tokes = await sv.generateTokens(electionData.id, 1);
    if (tokes == null) {
        console.log(`Generated is null ${tokes}`);
        return;
    } else {
        console.log(`Tokens generated successfully ${tokes}`);
    }

    console.log("Validating token[0] ...");
    const tokenValid = await sv.validateToken(electionData.id, tokes[0]!);

    if (!tokenValid) {
        console.log(`Token is supposed to be valid ${tokenValid} ...`);
        return;
    } else {
        console.log(`Token is valid ${tokenValid} ...`);
    }

    console.log("Placing votes ...");
    const votedOpHash = await sv.recordVote({...v1, token: tokes[0]});

    if (votedOpHash == undefined) {
        console.log("The vote wasn't successfull ...");
        return;
    } else {
        console.log(`The vote was successfull ${tzktGhostnet}/${votedOpHash}`);
    }
    
})();

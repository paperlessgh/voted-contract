import { electionData, v1 } from "./election_data";
import { SimpleVoteContractClient} from "./voted-client";


(async () => {
    const organizerPrivateKey = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq";
    const contractAddress = "KT1TaMdhubw4vik8KrZiqdUQw2u1kWTPgfo4";
    const rpcUrl = "https://ghostnet.ecadinfra.com";
    const tzktGhostnet = "https://ghostnet.tzkt.io"

    const sv: SimpleVoteContractClient = new SimpleVoteContractClient(contractAddress, organizerPrivateKey, rpcUrl);

    const operationHash: string | undefined = await sv.publishElection(electionData);

    if (operationHash == undefined) {
        console.log("The publish washn't successfull ...");
    } else {
        console.log(`Publish successfull ${tzktGhostnet}/${operationHash}`)
    }


    const tokes = await sv.generateTokens(electionData.id, 1);
    if (tokes == null) {
        console.log(`Generated is null ${tokes}`);
        return;
    }

    console.log(tokes);

    const tokenValid = await sv.validateToken(electionData.id, tokes[0]!);

    if (!tokenValid) {
        console.log(`Token is supposed to be valid ${tokenValid} ...`);
    }

    const votedOpHash = await sv.recordVote({...v1, vote_token: tokes[0]});

    if (votedOpHash == undefined) {
        console.log("The vote wasn't successfull ...");
    } else {
        console.log(`The vote was successfull ${tzktGhostnet}/${votedOpHash}`)
    }
    
})();

import { electionData } from "./election_data";
import { SimpleVoteContractClient} from "./voted-client";


(async () => {
    const organizerPrivateKey = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq";
    const contractAddress = "KT1TaMdhubw4vik8KrZiqdUQw2u1kWTPgfo4";

    const sv: SimpleVoteContractClient = new SimpleVoteContractClient(contractAddress, organizerPrivateKey);

    const electionExists = await sv.electionExists(electionData.id);
    if (!electionExists) {
        const electionCreated = await sv.createElection(electionData);
        console.log('electionCreated', electionCreated);
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
    
})();

import { electionData } from "./election_data";
import { SimpleVoteContractClient} from "./voted-client";


(async () => {
    const organizerPrivateKey = "edsk3gUfUPyBSfrS9CCgmCiQsTCHGkviBDusMxDJstFtojtc1zcpsh";
    const contractAddress = "KT1TaMdhubw4vik8KrZiqdUQw2u1kWTPgfo4";

    const sv: SimpleVoteContractClient = new SimpleVoteContractClient(contractAddress, organizerPrivateKey);

    const electionExists = await sv.electionExists(electionData.election_id_param);
    if (!electionExists) {
        const electionCreated = await sv.createElection(electionData);
        console.log(electionCreated);
    }

    const generated = await sv.generateTokens(1);
    if (generated == null) {
        console.log(`Generated is null ${generated}`);
        return;
    }

    console.log(generated);
    

    if (generated.pubKey == null) {
        console.log(`Pubkey is null ${generated}`);
        return;
    }

    if (generated.tokens[0] == null) {
        console.log(`Tokens is null ${generated}`);
        return;
    }

    let tokenValid = await sv.validateToken(electionData.election_id_param, generated.tokens[0]);

    if (tokenValid) {
        console.log(`Token is not supposed to be valid ${tokenValid} ...`);
    } else {
        console.log(`Tokens are useless now, they should be added to the smart contract ...`);
    }

    const addedPubkey = await sv.addPubKey(electionData.election_id_param, generated.pubKey);

    if (addedPubkey == null) {
        console.log(`Could not add pubkeys ${addedPubkey}`);
        return;
    }

    tokenValid = await sv.validateToken(electionData.election_id_param, generated.tokens[0]);

    if (!tokenValid) {
        console.log(`Token is supposed to be valid ${tokenValid} ...`);
    }
    

})();

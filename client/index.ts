import { electionData, v1 } from "./election_data";
import { ElectionVoteData, ELECTION_VISIBILITY, SimpleVoteContractClient } from "./voted-client";


(async () => {
    const organizerPrivateKey = "edskRhYeMahFUYEsVnAu6N4K9VmX7Dr1bHBEHSJkCQg8E5JS2GQgTPvTkXhf5DLWpFWeqJfiyWvmuWn4c1zv6HAdFs52HdYXev";
    const contractAddress = "KT1HuYY5d2FPYvP1Na2ZJ14y5UpCP4GAy9sD";
    const rpcUrl = "https://kathmandunet.ecadinfra.com";
    const tzktGhostnet = "https://kathmandunet.tzkt.io";

    const action: "publish" | "token" | "vote" | string | null = process.argv[2];

    const sv: SimpleVoteContractClient = new SimpleVoteContractClient(contractAddress, organizerPrivateKey, rpcUrl);

    switch (action) {
        case "publish":
            console.log("Publishing election ...");

            const operationHash: string | undefined = await sv.publishElection(electionData);

            if (operationHash == undefined) {
                console.log("The publish washn't successfull ...");
                return;
            } else {
                console.log(`Publish successfull ${tzktGhostnet}/${operationHash}`);
            }
            break;
        case "token":
            console.log("Generating tokens ...");
            const tokes = await sv.generateTokens(electionData.id, 3);
            if (tokes == null) {
                console.log(`Generated is null ${tokes}`);
                return;
            } else {
                console.log(`Tokens generated successfully ${tokes}`);
            }
            break;
        case "validate":
            let token: string | null = process.argv[3];
            if (token == null) {
                console.log("You must pass a valid token. Example: ts-node index.ts vote (token)");
            }
            token = token.trim();
            console.log(`Validating ${token} ...`);
            const tokenValid = await sv.validateToken(electionData.id, token);

            if (!tokenValid) {
                console.log(`Token is supposed to be valid ${tokenValid} ...`);
                return;
            } else {
                console.log(`Token is valid ${tokenValid} ...`);
            }
            break;
        case "vote":
            let vtoken: string | null = process.argv[3];
            if ((vtoken == null) && (electionData.visibility == ELECTION_VISIBILITY.private)) {
                console.log("You must pass a valid token if election is private. Example: ts-node index.ts vote (token)");
                return;
            }
            vtoken = vtoken?.trim();

            console.log("Placing votes ...");
            const votedOpHash = await sv.recordVote({ ...v1, token: vtoken });

            if (votedOpHash == undefined) {
                console.log("The vote wasn't successfull ...");
                return;
            } else {
                console.log(`The vote was successfull ${tzktGhostnet}/${votedOpHash}`);
            }
            break;
        case "show":
            const election: ElectionVoteData | null = await sv.getVoteData(electionData.id);
            console.log(election);
            break
        default:
            console.log("Usage: ts-node index.ts [publish | vote]");
            break;
    }

})();

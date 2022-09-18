import { electionData, v1 } from "./election_data";
import { SimpleVoteContractClient } from "./voted-client";


(async () => {
    const organizerPrivateKey = "edsk3QoqBuvdamxouPhin7swCvkQNgq4jP5KZPbwWNnwdZpSpJiEbq";
    const contractAddress = "KT1HigPEf5kwKAugixp7xMQxpp6J15rZ9v2u";
    const rpcUrl = "https://ghostnet.ecadinfra.com";
    const tzktGhostnet = "https://ghostnet.tzkt.io";

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
            const tokes = await sv.generateTokens(electionData.id, 1);
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
            if (vtoken == null) {
                console.log("You must pass a valid token. Example: ts-node index.ts vote (token)");
            }
            vtoken = vtoken.trim();

            console.log("Placing votes ...");
            const votedOpHash = await sv.recordVote({ ...v1, token: vtoken });

            if (votedOpHash == undefined) {
                console.log("The vote wasn't successfull ...");
                return;
            } else {
                console.log(`The vote was successfull ${tzktGhostnet}/${votedOpHash}`);
            }
            break;
        default:
            console.log("Usage: ts-node index.ts [publish | vote]");
            break;
    }

})();

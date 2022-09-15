import { SimpleVoteContractClient } from "./voted-client";

(async () => {
    const organizerPrivateKey = "edsk3gUfUPyBSfrS9CCgmCiQsTCHGkviBDusMxDJstFtojtc1zcpsh";
    const contractAddress = "KT1HqX4o8KvSj1SHzuW8tLNX2oZPin5EdPW4";

    const sv: SimpleVoteContractClient = new SimpleVoteContractClient(contractAddress, organizerPrivateKey);

    const tokes = await sv.generateTokens(10);
    console.log(tokes);

    await sv.validateToken("abc", tokes?.tokens[0] ?? "");
    
})();
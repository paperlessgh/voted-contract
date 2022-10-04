import { Candidate, Category, Election, ELECTION_MODE, ELECTION_VISIBILITY, Vote, VoteParam } from "./voted-client";


const ca1: Category = {
    title: "Favorite Color",
    description: "what is your favorite color",
    vote_limit: 3,
}

const ca2: Category = {
    title: "Brightest Color",
    description: "What color is brightest to you",
    vote_limit: 3,
}

const ca3: Category = {
    title: "Disliked Color",
    description: "what color do you dislike the most",
    vote_limit: 3,
}

const categories: {[key:string]:Category}= {
    "1": ca1,
    "2": ca2,
    "3": ca3
};

const cd1: Candidate = {
    title: "Red",
    description: "color red",
    category_id: "1"
};

const cd2: Candidate = {
    title: "Gold",
    description: "color red",
    category_id: "1"
};

const cd3: Candidate = {
    title: "Red",
    description: "color red",
    category_id: "1"
};

const cd4: Candidate = {
    title: "Red",
    description: "color red",
    category_id: "2"
};

const cd5: Candidate = {
    title: "Gold",
    description: "color red",
    category_id: "2"
};

const cd6: Candidate = {
    title: "Red",
    description: "color red",
    category_id: "2"
};

const cd7: Candidate = {
    title: "Red",
    description: "color red",
    category_id: "3"
};

const cd8: Candidate = {
    title: "Gold",
    description: "color red",
    category_id: "3"
};

const cd9: Candidate = {
    title: "Red",
    description: "color red",
    category_id: "3"
};

const candidates: {[key:string]: Candidate} = {
    "a": cd1,
    "b": cd2,
    "c": cd3,
    "d": cd4,
    "e": cd5,
    "f": cd6,
    "g": cd7,
    "h": cd8,
    "i": cd9
};

const start = new Date();
start.setMinutes(start.getMinutes() + 3);
const start_value = Math.floor(start.getTime() / 1000).toString();

const end = new Date();
end.setMinutes(end.getMinutes() + 30);
const end_value = Math.floor(end.getTime() / 1000).toString()

export const electionData: Election =  {
    id: "color-paid-private-voting",
    organizer: "",
    titlle: "Color Paperless Voting",
    description: "Color Paid Private Paperless Voting",
    start_time: start_value,
    stop_time: end_value,
    pub_keys: [],
    mode: ELECTION_MODE.paid,
    cost_per_vote: 1000000, // mutez
    visibility: ELECTION_VISIBILITY.private,
    categories: categories,
    candidates: candidates,
};


//// ================== correct vote ========================
const vp1: VoteParam =  {
    canditate_id: "a",
    category_id: "1",
    number_of_votes: 3
}

const vp2: VoteParam =  {
    canditate_id: "b",
    category_id: "2",
    number_of_votes: 3
}

const vp3: VoteParam =  {
    canditate_id: "c",
    category_id: "3",
    number_of_votes: 3
}

export const v1: Vote = {
    election_id: electionData.id,
    vote_params: [vp1, vp2, vp3],
    token: null,
}

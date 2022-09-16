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

// cadidate key is generated with `${categoryId}${candidateId}`
const candidates: {[key:string]: Candidate} = {
    "11": cd1,
    "12": cd2,
    "13": cd3,
    "21": cd4,
    "22": cd5,
    "23": cd6,
    "31": cd7,
    "32": cd8,
    "33": cd9
};

const start = new Date();
start.setDate(start.getDate() + 1);
const start_value = Math.floor(start.getTime() / 1000).toString();

const end = new Date();
end.setDate(end.getDate() + 8);
const end_value = Math.floor(end.getTime() / 1000).toString()

export const electionData: Election =  {
    id: "simple-voting",
    organizer: "tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb",
    titlle: "Paperless Voting",
    description: "Simple Paperless Voting",
    start_time: start_value,
    stop_time: end_value,
    pub_keys: [],
    mode: ELECTION_MODE.free,
    active: true,
    cost_per_vote: 0,
    visibility: ELECTION_VISIBILITY.private,
    categories: categories,
    candidates: candidates,
};


//// ================== correct vote ========================
const vp1: VoteParam =  {
    vote_canditate_id: "11",
    vote_category_id: "1",
    number_of_votes: 1
}

const vp2: VoteParam =  {
    vote_canditate_id: "21",
    vote_category_id: "2",
    number_of_votes: 1
}

const vp3: VoteParam =  {
    vote_canditate_id: "21",
    vote_category_id: "3",
    number_of_votes: 1
}

export const v1: Vote = {
    vote_election_id: electionData.id,
    vote_params: [vp1, vp2, vp3],
    vote_token: null,
}
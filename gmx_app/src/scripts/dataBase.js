import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { ref, set, get , child } from "firebase/database";

let DB;

const initDataBase = () => {
    const firebaseConfig = {
        apiKey: "AIzaSyAYRXa_KZXwamKnv2KplgLQY31PGGmQ0uM",
        authDomain: "copy-trade-b3f80.firebaseapp.com",
        projectId: "copy-trade-b3f80",
        storageBucket: "copy-trade-b3f80.appspot.com",
        messagingSenderId: "864095547052",
        appId: "1:864095547052:web:3af05299e83e644750f909",
        measurementId: "G-F8Z3K73GHM"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    DB = db;
    return db;
}

const getUsersByTrader = async (trader, chain) => {
    const dbRef = ref(getDatabase());
    const snapshot = await get(child(dbRef, `${chain}/traders/` + trader));
    if (snapshot.exists()) {
        const response = snapshot.val();
        const users = Object.keys(response).map((key) => {
            return response[key];
        })
        return users;
    } 
    else {
        console.log("No data available");
        return [[]];
    }
}

const addTrackedTraders = async (user, traders, chain) => {
    for(let trader of traders) {
        const users = await getUsersByTrader(trader, chain);
        console.log("Users", users);
        if (users[0].length > 0) {
            if (users[0].includes(user)) {
                alert(`Trader ${trader} already tracked by user ${user}`);
            }
            else {
                let _users = users[0];
                _users.push(user);
                console.log("-------", _users)
                set(ref(DB, `${chain}/traders/` + trader), {
                    _users
                });
                alert(`New users: ${users[0]}`);
            }
        }
        else {    
            console.log(user)   
            let _users = [user];
            console.log("users ", _users)
            set(ref(DB, `${chain}/traders/` + trader), {
                _users
            });
            alert(`New trader: ${trader}`);
        }
    }
}

const deleteTrackedTraders = async (user, traders, chain) => {
    for(let trader of traders) {
        const users = await getUsersByTrader(trader, chain);
        if (users[0].includes(user)) {
            const index = users[0].indexOf(user);
            if (index > -1) users[0].splice(index, 1);
            let _users = users[0];
            set(ref(DB, `${chain}/traders/` + trader), {
                _users
            });
            alert(`Deleted trader: ${trader}`);
        }
        else console.log("Trader not tracked");
    }
}

export default { addTrackedTraders, deleteTrackedTraders, getUsersByTrader, initDataBase }
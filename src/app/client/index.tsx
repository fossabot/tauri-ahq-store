/* eslint-disable react-hooks/exhaustive-deps */

/*
React && Native
*/
import { useEffect, useState } from "react";
import { sendNotification } from "@tauri-apps/api/notification";
import { Body, fetch } from "@tauri-apps/api/http";
import { useCookies } from "react-cookie";
import Modal from "react-modal";
import Toast from "../resources/api/toast";

/*
Firebase API
*/
import { Auth, updateProfile, User, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";

/*Icons
*/
import { BsPen, BsPenFill } from "react-icons/bs";

/*
Database Refs
*/
import base from "../server";
import GeneralUser from "./user.png";
import Loading from "./loading.gif";
import { BiLogOut, BiUserX } from "react-icons/bi";
import PopUp from "../resources/components/popup";
import { open } from "@tauri-apps/api/dialog";
import { readBinaryFile } from "@tauri-apps/api/fs";
import { VscKey } from "react-icons/vsc";


/*
Interfaces
*/
interface UserProps {
    auth: Auth,
    dark: boolean
}

/*
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.75)'
    },
    content: {
      position: 'absolute',
      top: '40px',
      left: '40px',
      right: '40px',
      bottom: '40px',
      border: '1px solid #ccc',
      background: '#fff',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch',
      borderRadius: '4px',
      outline: 'none',
      padding: '20px'
    }
*/

export default function Init(props: UserProps){
        Modal.setAppElement('#root');

        function darkMode(classes: Array<string>, dark: boolean) {
            return classes.map((c) => c + (dark ? "-d" : "")).join(" ");
        }

        const [cookies, setCookie/*, removeCookie*/] = useCookies(["temptokenforuse"]);


        let {auth, dark} = props;


        let 
        [user, setUser] = useState(Loading),

        [name, setName] = useState(""),

        [alt, setAlt] = useState("Please wait..."),

        [showDelete, setDelete] = useState(false),

        [deletePwd, setPwd] = useState(""),

        [Pen, setPen] = useState(dark ?  <BsPen size="2em"/> : <BsPenFill size="2em"/>),

        [namePopup, setNamePopup] = useState(false),
        
        [passwordPopup, setpPopop] = useState(false),
        
        [profilePictureData, setPFD] = useState({});

        const customStyles = {
            content: {
                top: '50%',
                left: '50%',
                right: 'auto',
                bottom: 'auto',
                marginRight: '-50%',
                transform: 'translate(-50%, -50%)',
                width: "30rem",
                height: "40rem",
                transition: "all 500ms linear",
                "backgroundColor": props.dark ? "rgb(55, 65, 81)" : "rgb(209, 213, 219)",
                borderColor: props.dark ? "rgb(55, 65, 81)" : "rgb(209, 213, 219)",
            },
            overlay: {
                backgroundColor: !props.dark ? "rgb(55, 65, 81, 0.5)" : "rgb(107, 114, 128, 0.75)"
            }
        };

         
        useEffect(() => {
                (async() => {
                    if (!auth.currentUser?.emailVerified) {
                        setAlt("Verify email to upload");
                        setUser(GeneralUser);
                        setName("Guest");
                    } else {
                        if (auth.currentUser?.displayName) {
                            if (auth.currentUser?.displayName.startsWith("(dev)")) {
                                setName(auth.currentUser?.displayName.replace("(dev)", ""));
                            } else {
                                setName(auth.currentUser?.displayName);
                            }
                        } else {
                            setName("Guest");
                        }
                        setUser(Loading);
                        fetch(`${base}`, {
                            headers: {
                                uid: auth.currentUser?.uid
                            },
                            method: "GET",
                            responseType: 1
                        }).then(({data}) => {
                            setUser(data as any);
                        }).catch(() => {
                            setUser(GeneralUser);
                        });
                        setAlt(auth.currentUser?.photoURL ? "Click to edit picture" : "Click to upload");
                    }
                })();
        }, [auth.currentUser]);

         useEffect(() => {
            const image = document.getElementById("img") as HTMLElement,
            drop = document.getElementById("drop") as HTMLElement;

            image.addEventListener("mouseover", () => {
               drop.setAttribute("style", "opacity: 0.9");
            });
            image.addEventListener("mouseleave", () => {
                drop.setAttribute("style", "opacity: 0.0");
            });
            image.addEventListener("click", async() => {
               if (auth.currentUser?.emailVerified) {
                    const image = await open({
                        multiple: false,
                        filters: [{
                            name: "image",
                            extensions: ["png"]
                        }]
                    });

                    if (image) {
                        const data = await readBinaryFile(image as string);
                        const blob = new Blob([data]);

                        const fs = new FileReader();

                        fs.readAsDataURL(blob);
                        fs.onload = async() => {
                            setUser(Loading);
                        }

                        setPFD({fs});

                        console.log(profilePictureData);

                        if (!cookies.temptokenforuse) {
                            setpPopop(true);
                        } else {
                            await fetch(`${base}verify`, {
                                method: "GET",
                                responseType: 1,
                                headers: {
                                    "x-uid": auth.currentUser?.uid,
                                    "x-password": cookies.temptokenforuse
                                }
                            })
                            .then(({ok}) => {
                                if (!ok) {
                                    setpPopop(true);
                                } else {
                                    ChangeProfile(auth, setAlt, setUser, {
                                        result: fs.result as string
                                    }, cookies.temptokenforuse, setPFD);
                                }
                            })
                            .catch((_e) => {
                                setpPopop(true);
                            });
                        }
                    }
                }
            });
         }, []);

         /*manage();*/
         

        return (
                <>
                    <Modal
                        isOpen={showDelete}
                        contentLabel={"Confirm Delete Account"}
                        style={customStyles}
                    >
                        < DeleteAccount auth={auth} cancel={() => {setDelete(false); setPwd("");}} pass={deletePwd} set={{pwd: setPwd}} dark={props.dark} />
                    </Modal>

                    <PopUp
                        dark={props.dark}
                        shown={passwordPopup}
                    >  
                        <div className="w-[100%] flex flex-col justify-end text-end items-end">
                            <button className={`block font-extrabold text-2xl ${dark ? "text-white" : "text-black"} hover:text-red-800`} style={{"transition": "all 250ms linear"}} onClick={() => {
                                (document.getElementById("accpwdhost") as HTMLInputElement).value = "";
                                setpPopop(false);
                            }}>X</button>
                        </div>
                        <form 
                            className="w-[100%] h-[100%] flex flex-col text-center items-center justify-center"
                            onSubmit={(event) => {
                                event.preventDefault();
                                const error = (document.getElementById("errorhost")) as HTMLHeadingElement;
                                const inputPassword = (document.getElementById("accpwdhost") as HTMLInputElement).value;
                                console.log(profilePictureData);
                                fetch(`${base}verify`, {
                                    method: "GET",
                                    headers: {
                                        "x-uid": auth.currentUser?.uid,
                                        "x-password": inputPassword
                                    },
                                    responseType: 1
                                }).then(({ok}) => {
                                    if (ok) {
                                        setCookie("temptokenforuse", inputPassword, {
                                            expires: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000))
                                        });
                                        setpPopop(false);

                                        ChangeProfile(auth, setAlt, setUser, {
                                            result: (profilePictureData as any).fs.result
                                        }, inputPassword, setPFD);
                                        
                                        error.innerText = "";
                                        (document.getElementById("accpwdhost") as HTMLInputElement).value = "";
                                    } else {
                                        error.innerText = "Wrong Password!";
                                    }
                                });
                            }}
                        >
                            {/*eslint-disable-next-line jsx-a11y/heading-has-content*/}
                            <h1 id="errorhost" className="text-red-700 text-3xl text-bolder pb-2"></h1>
                            <input id="accpwdhost" className="style-input style-input-d" type="password" placeholder="Enter Your Account Password"></input>

                            <button className="button">Submit</button>
                        </form>
                    </PopUp>

                    <Modal
                        isOpen={namePopup}
                        contentLabel="Change Name"
                        style={customStyles}
                    >
                        <ChangeAccountName close={() => setNamePopup(false)} user={auth.currentUser as User} updateName={((value: string) => setName(value))} dark={props.dark}/>
                    </Modal>


                    <div className={`${darkMode(["menu"], dark)} pb-2`}>
                        <div className={`${darkMode(["user"], dark)} pb-2`}>
                            {auth.currentUser?.emailVerified
                            ?
                            <></>
                            :
                            <div className="flex flex-col text-center">
                                <h1
                                    style={{"color": "red","fontSize" : "20px"}}
                                >Unverified Email</h1>
                            </div>}
                            <div className="img" id="img">
                                <img src={auth.currentUser?.emailVerified ? user : GeneralUser} alt="Avatar" />
                                <div className={`div ${props.dark ? "" : "div-l"}`} id="drop">
                                    <h1 className="text">{alt}</h1>
                                </div>
                            </div>
                                    <div className="flex flex-col text-center mt-2 name">
                                        <div className="flex justify-center">
                                            <h1>{name}</h1>
                                            { auth.currentUser?.emailVerified ?
                                            <>
                                                <div className="ml-[0.5rem]"></div>
                                                <span 
                                                    onMouseLeave={() => {
                                                        setPen(dark ?  <BsPen size="2em"/> : <BsPenFill size="2em"/>);
                                                    }}  
                                                    onMouseEnter={() => {
                                                        setPen(dark ? <BsPenFill size="2em"/> : <BsPen size="2em"/>);
                                                    }}
                                                    style={{
                                                        "cursor": "pointer"
                                                    }}
                                                    onClick={() => setNamePopup(true)}
                                                >
                                                    <div className={props.dark ? "text-gray-300" : ""}>{Pen}</div>
                                                </span>
                                            </>
                                            : <></>}
                                        </div>
                                        <h6>{auth.currentUser?.email}</h6>
                                    </div>
                           </div>
                           <Actions auth={auth} deleteAcc={setDelete} />
                    </div>
                </>
        );
}

function Actions(props: {auth: Auth, deleteAcc: Function}) {
    const {auth, deleteAcc} = props;
    return (
        <div className="flex flex-col">
            <div className="flex w-[100%] flex-row">
                <button className="button mx-auto flex items-center text-center justify-center" onClick={() => auth.signOut()} style={{"minWidth": "15rem", "maxWidth": "15rem", "minHeight": "3.5rem", "maxHeight": "3.5rem"}}>
                    <BiLogOut size="2.5em"/>
                    <p className="mx-2">LogOut</p>
                </button>
                <div className="mx-3"></div>
                <button className="button-danger mx-auto flex items-center text-center justify-center" onClick={() => deleteAcc(true)} style={{"minWidth": "15rem", "maxWidth": "15rem", "minHeight": "3.5rem", "maxHeight": "3.5rem"}}>
                    <BiUserX size="2.5em"/>
                    <p className="mx-2">Delete Account</p>
                </button>
            </div>
            <button onClick={() => {
                const toast = Toast("Please wait...", "warn", "never");
                function startUnmount() {
                    setTimeout(() => {
                        toast?.unmount();
                    }, 5000);
                }

                sendPasswordResetEmail(auth as Auth, auth.currentUser?.email as string)
                    .then(() => {
                        const email = auth.currentUser?.email as string;
                        let censoredEmail = ""

                        for (let i = 0; i < email.split("@")[0].length; i++) {
                            let slice = email[i];

                            if (i === 0) {
                                censoredEmail += slice;
                            } else if (i === email.split("@")[0].length - 1) {
                                censoredEmail += slice;
                            } else {
                                censoredEmail += "*";
                            }
                        }

                        censoredEmail += `@${email.split("@")[1]}`;

                        toast?.edit(`Password reset link sent to ${censoredEmail}`, "success");
                        startUnmount();
                    })
                    .catch(() => {
                        toast?.edit("Failed to send Password reset email!", "danger");
                        startUnmount();
                    });
            }} className="button button-success mx-auto flex items-center text-center justify-center" style={{"minWidth": "100%", "maxWidth": "100%", "minHeight": "3.5rem", "maxHeight": "3.5rem"}}>
                <VscKey size="2.5em"/>
                <p className="mx-2">Reset Password</p>
            </button>
        </div>
    );
}

interface DeleteAccountProps {
    auth: Auth,
    cancel: Function,
    pass: string,
    dark: boolean,
    set: {
        pwd: Function
    }
}

function DeleteAccount(props: DeleteAccountProps) {
    const {cancel, pass, set, auth, dark} = props;
    const {pwd: sP} = set;

    const user: any = auth.currentUser;
    let [text, setText] = useState("Delete My Account;-danger;false"),
    [step, setStep] = useState(0),
    [err, setErr] = useState("");

    function reverse(err: string) {
        setErr(err);
        setText("Delete My Account;-danger;false");
    }

    async function ManageDelete(event: any) {
        event.preventDefault();
        setText(`⏲️;;true`);
        await reauthenticateWithCredential(auth.currentUser as User, EmailAuthProvider.credential(auth.currentUser?.email as string, pass))
        .then(() => {
            setStep(1);
        })
        .catch((e) => {
            let msg = e.message.replace("Firebase: Error ", "").replace(")", "").replace("(", "").replaceAll(".", "");

            switch(msg) {
                case "auth/wrong-password":
                    reverse("Wrong Passwod!");
                    break;
                case "Firebase: Access to this account has been temporarily disabled due to many failed login attempts You can immediately restore it by resetting your password or you can try again later auth/too-many-requests":
                    reverse("Too many login attempts!");
                    break;
                default:
                    reverse("Unknown Error!");
                    break;
            }
        });
    }

    async function ConfirmDelete(e: any) {
        e.preventDefault();
        await auth.currentUser?.delete();
    }

    return (
        <div className="flex flex-col" style={{"transition": "all 250ms linear"}}>
            <div className="flex flex-row">
                <div className="mx-auto"></div>
                <button className={`${dark ? "text-white" : "text-black"} hover:text-red-500 h-[1rem] w-[1rem]`} style={{"fontWeight": "bolder", "transition": "all 250ms linear"}} onClick={() => cancel()}>X</button>
            </div>

            <div className="mt-[8rem]"></div>

            <h2 className="text-center text-red-700" style={{"fontSize": "25px"}}>{err}</h2>

            <div className="mt-[2rem]"></div>
            
            <div className="flex flex-col">
                <form className="flex flex-col items-center" onSubmit={step === 0 ? ManageDelete : ConfirmDelete}>
                    {step === 0 ? 
                        <>

                        <input className={`style-input ${!props.dark ? "" : "style-input-d"}`} disabled type="email" placeholder="Enter Your Email" value={user.email} required></input>

                        <div className="mt-[1rem]"></div>

                        <input className={`style-input ${!props.dark ? "" : "style-input-d"}`} type="password" placeholder="Enter Your Password" minLength={8} value={pass} onChange={(e) => sP(e.target.value)} required disabled={text.split(";")[2] === "true"}></input>

                        <div className="mt-[12.5rem]"></div>
                        <button className={`button${text.split(";")[1]} flex items-center text-center justify-center`} style={{"transition": "all 500ms linear"}} disabled={text.split(";")[2] === "true"}><BiUserX size="2.5em" className="mx-2"/> {text.split(";")[0]}</button>

                        </>
                    :
                        <>
                            <h1>Are you sure you want to delete your account?</h1>
                            <div className="mt-[14rem]"></div>
                            <div className="flex">
                                <div className="w-[10rem] ml-[4rem]"></div>
                                <div className="w-[10rem]">
                                    <button type="reset" className="button" onClick={() => cancel()}>No</button>
                                </div>
                                <div className="w-[10rem]">
                                    <button className="button-danger"><BiUserX size="2.5em"/> Yes</button>
                                </div>
                                <div className="w-[10rem]"></div>
                            </div>
                        </>
                    }
                </form>
            </div>
        </div>
    )
}

interface AccountNameProps {
    close: Function,
    user: User,
    updateName: Function,
    dark: boolean
}
function ChangeAccountName(props: AccountNameProps) {
    const {close, dark, user, updateName} = props;
    const name = user.displayName as string;
    const dev = name.startsWith("(dev)");

    let [value, setValue] = useState(dev ? name.replace("(dev)", "") : name);

    async function confirmName(e: {preventDefault: Function}) {
        close();
        e.preventDefault();
        try {
            if (user.displayName !== value) {
                await updateProfile(user, {
                    displayName: dev ? `(dev)${value}` : value
                });
            }
            updateName(value);
            setValue("");
        } catch (e) {
            sendNotification({title: "Error", body: "Could not set name"});
        }
    }

    return (
        <div className="flex flex-col" style={{"transition": "all 250ms linear"}}>
            <div className="flex flex-row">
                <div className="mx-auto"></div>
                <button className={`${dark ? "text-white" :"text-black"} hover:text-red-500 h-[1rem] w-[1rem]`} style={{"fontWeight": "bolder", "transition": "all 250ms linear"}} onClick={() => close()}>X</button>
            </div>

            <div className="mt-[10rem]"></div>

            <div className="flex flex-col">
                <form className="flex flex-col items-center" onSubmit={confirmName}>
                    <input className={`style-input ${!props.dark ? "" : "style-input-d"}`} type="string" placeholder="Enter Name for Profile" maxLength={32} minLength={6} value={value} onChange={
                        ((e) => {
                            if (e.target.value.startsWith("(dev)")) {
                                setValue(e.target.value.replace("(dev)", ""));
                            } else {
                                setValue(e.target.value);
                            }
                        })
                    } required></input>

                    <div className="mt-[15rem]"></div>

                    <button className={`button`} style={{"transition": "all 500ms linear"}}>Confirm</button>
                </form>
            </div>
        </div>
    )
}

async function ChangeProfile(auth: Auth, setAlt: Function, setUser: Function, fs: {result: string}, pwd: string, setPFD: any) {
    try {
        setUser(Loading);
        setAlt("Please Wait...");
        console.log(Body.text(fs.result));

        fetch(`${base}`, {
            method: "POST",
            headers: {
                "x-uid": auth.currentUser?.uid as any,
                "x-password": pwd
            },
            body: Body.json({data: fs.result}),
            timeout: 60
        })
        .then((data) => {
            const {
                ok
            } = data;
            if (!ok) {
                sendNotification("Failed to update profile picture!");
                fetch(`${base}`, {
                    method: "GET",
                    headers: {
                        "uid": auth.currentUser?.uid
                    },
                    responseType: 1
                }).then(({data}) => {
                    setUser(data);
                    setPFD({});
                }).catch(() => {
                    setUser(GeneralUser);
                    setPFD({});
                });
            } else {
                setAlt("Click to edit picture");
                setUser(fs.result);
                setPFD({});
            }
        });
    } catch (e) {
        console.log(e);
        setUser(GeneralUser);
        sendNotification("Failed to update profile picture!");
        setPFD({});
    }
}
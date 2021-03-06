import React, {
  useEffect,
  useState,
  useRef
} from 'react';
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import queryString from 'query-string'; 

import Messages from '../components/Messages';
import InfoBar from '../components/InfoBar';
import Input from '../components/Input';
import {useData} from '../components/DataProvider';

// import '../styles/Chat.css';
import '../styles/temp.css';

const Chat = ({ location }) => {
  const [err, setErr] = useState("")
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const {translate, prof} = useData();

//   const { getRoomId }  = useData();

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  var username = "";
    
  useEffect(() => {
    
    const { name, room } = queryString.parse(location.search);
    console.log(name, room);
    setName(name);
    //socket connection
    socket.current = io.connect("/");


    // getting audio/video
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    }).catch(err => {
      console.log("ERROR:")
      setErr("Error: No input stream (webcam) detected!")
    })

    

    // received call from new user
    socket.current.on("hey", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    })

    socket.current.emit('join', { name, room },  () => {
        console.log("hello");
        
    });

    // set personal id upon receiving id
    socket.current.on("yourID", (id) => {
        setYourID(id);
    })

    // gets list of users in database
    socket.current.emit("getUsers");
    socket.current.on("allUsers", (users) => {
      // console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      setUsers(users);
      console.log(users)
    })

    return () => {
        socket.current.emit('disconnect');

        socket.current.off();
    }
  }, []);

  useEffect(() => {
    socket.current.on('message', (message) => {
      translate(message.text, (newMessage) => {
        console.log("MESSAGE")
        console.log(message);
        message.text = newMessage;
        messages.push(message)
        // setMessages([...messages, message]);
        setMessages(messages);
      })

    })
  }, [])

  const sendMessage = (event) => {
    event.preventDefault();

    if(message) {
        console.log(username);
        socket.current.emit('sendMessage',name, message, () => setMessage(''));
    }
  }

  // call peer upon button click (Show user is calling)
  function callPeer(id) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    // sends signal for callUser
    peer.on("signal", data => {
      socket.current.emit("callUser", { userToCall: id, signalData: data, from: yourID })
    })

    // receive stream from partner
    peer.on("stream", stream => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    //send signal to caller for call accepted
    socket.current.on("callAccepted", signal => {
      setCallAccepted(true);
      peer.signal(signal);
    })


    socket.current.on('user-disconnected', () => {
      setCallAccepted(false);
    })

  }

  function acceptCall() {
    // peer accepts call
    setCallAccepted(true);

    // peer
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    // peer receives signal for call accept
    peer.on("signal", data => {
      socket.current.emit("acceptCall", { signal: data, to: caller })
    })

    // received stream from partner
    peer.on("stream", stream => {
      partnerVideo.current.srcObject = stream;
    });

    socket.current.on('user-disconnected', () => {
      setCallAccepted(false);
    })

    // send reception of call
    peer.signal(callerSignal);
  }

  let UserVideo;
  if (stream) {
    UserVideo = (
      <video className="uservid" playsInline muted ref={userVideo} autoPlay />
    );
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = (
      <video className="uservid"playsInline ref={partnerVideo} autoPlay />
    );
  }

  let incomingCall;
  if (receivingCall && !callAccepted) {
    console.log("INCOMING")
    console.log(prof.profession )
    incomingCall = (
      <div className="callwindow">
        <h1 className="acceptCall">{prof.profession === "d" ? "Doctor" : "Patient"} is calling you</h1>
        <button className="acceptCall" onClick={acceptCall}>Accept</button>
      </div>
    )
  }
  return (
    
    <div className="rows">

      <div className="interface"> 
        <div className="video1">
          {UserVideo}

        </div>
        <div className="video2conf">
            {PartnerVideo}
            {Object.keys(users).map(key => {
              if (key === yourID) {
                return null;
              }
              if(!callAccepted)
              {
                  return (
                  <button class="callPeer" onClick={() => callPeer(key)}>{`Call`}</button>
                  );
              }
            })}
        <div>
            {incomingCall}
        </div>
        </div>
      </div>
      {/* <p className="scrolldown">Scroll down for text chat</p> */}
      <div className="interface normalinterface">
        <div className="chat">
          <InfoBar room={room}/>
          <Messages messages={messages} name={name} className="msgbox"/>
          <Input message={message} setMessage={setMessage} sendMessage={sendMessage}/>
        </div>    
      </div>

    </div>
    

      // <div class="float-container">
      //     <div class="float-child1">
      //       <div class="green">
      //         {UserVideo}
      //         {PartnerVideo}
      //       </div>
      //       <div>
      //           {Object.keys(users).map(key => {
      //           if (key === yourID) {
      //               return null;
      //           }
      //           if(!callAccepted)
      //           {
      //               return (
      //                   <button onClick={() => callPeer(key)}>Call {key}</button>
      //               );
      //           }
      //           })}
      //       </div>
      //       <div>
      //           {incomingCall}
      //       </div>
      //     </div>

      //     <div class="float-child2">
      //       <div class="outerContainer">
      //         <div className="container">
      //           <InfoBar room={room}/>
      //           <Messages messages={messages} name={name}/>
      //           <Input message={message} setMessage={setMessage} sendMessage={sendMessage}/>
      //         </div>    
      //       </div>
      //     </div>

      // </div>
    
  );
}

export default Chat;
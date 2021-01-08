import React from "react";
import 'react-chatbox-component/dist/style.css';
import {ChatBox} from 'react-chatbox-component';
import { getsocketIoInstance } from '../utils/socketio-client';
// import '../App.css';

export default class Chat extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      messages: [] 
    }
    this.roomName = sessionStorage.getItem('roomName');
    this.displayName = sessionStorage.getItem('displayName'); // the name of this user
    this.userObj = { "uid": this.displayName }; // When sender uid matched the user uid, it will render message from the right side
    this.socketIo = getsocketIoInstance(this.roomName, this.displayName, 'Chat');
  }

  componentDidMount() {
    this.socketIo.on('chat-msg', (data) => {
      const { txt, senderName } = data;
      const msg = {
        "text": txt,
        "id": (this.state.messages.length + 1).toString(), // seems to be used as a key to render in the list
        "sender": {
          "name": senderName,
          "uid": senderName, // TODO: use database id
          // "avatar": "https://data.cometchat.com/assets/images/avatars/ironman.png",
          "avatar": "./user.png"
        },
      }
      const list = this.state.messages;
      list.push(msg);
      this.setState({ messages: list });
    });
  }

  submitMessage = (txt) => {
    // console.log('submit', msg);
    const msg = {
      "text": txt,
      "id": (this.state.messages.length + 1).toString(), // seems to be used as a key to render in the list
      "sender": {
        "name": this.displayName,
        "uid": this.displayName, // TODO: use database id
        // "avatar": "https://data.cometchat.com/assets/images/avatars/ironman.png",
        "avatar": "./user.png"
      },
    }
    const list = this.state.messages;
    list.push(msg);
    this.setState({ messages: list });
    this.socketIo.emit('chat-msg', { roomName: this.roomName, txt, senderName: this.displayName });
    // TODO: include typing listener and indicator
  }

  render() {
    return(
      <div className="chat-component">
        <div className='container chat-container'>
          <div className='chat-header'>
            <h4>Chat</h4>
            {/* <h4>Messages</h4> */}
          </div>
          <ChatBox
            messages={this.state.messages}
            user={this.userObj} 
            onSubmit={this.submitMessage}
            // typingListener={}
            // typingIndicator={}
          />
        </div>
        
      </div>
      
    );
  }
}
import React from "react";
import { toast } from 'react-toastify';
import { Whiteboard } from '../components/Whiteboard';
import Chat from '../components/Chat';
import Meeting from '../components/Meeting';
import { getsocketIoInstance } from '../utils/socketio-client';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

// https://www.npmjs.com/package/react-canvas-draw - alternative whiteboard option
// https://www.npmjs.com/package/react-chat-elements
// https://www.cometchat.com/tutorials/cometchat-react-chat-elements

export default class Workspace extends React.Component {
  constructor() {
    super();
    this.roomName = sessionStorage.getItem('roomName');
    this.displayName = sessionStorage.getItem('displayName'); // the name of this user
    this.socketIo = getsocketIoInstance(this.roomName, this.displayName, 'Workspace');
    // TODO: show who is online and whe someone leaves
  }

  componentDidMount() {
    this.socketIo.on('join-room', (otherUserName) => {
      toast.info(`${otherUserName} has joined this workspace`, { autoClose: false });
    });
    this.socketIo.on('leave-room', (otherUserName) => {
      this.setState({ connected: false });
      toast.info(`${otherUserName} has left this workspace`);
    });
  }
  componentWillUnmount() {
    // leave the room // TODO: observe whether this will suffice or need to detect window/tab closure
    this.socketIo.emit('leave-room', { roomName: this.roomName, userName: this.displayName });
  }

  render() {
    return (
      <div className="workspace">
        {/* <Meeting/>
        <Tabs className="tabs">
          <TabList>
            <Tab>Whiteboard</Tab>
            <Tab>Chat</Tab>
          </TabList>

          <TabPanel>
            <Whiteboard />
          </TabPanel>
          <TabPanel>
            <Chat />
          </TabPanel>
        </Tabs> */}
        <Whiteboard />
        <Chat />
      </div>
    );
  }
}
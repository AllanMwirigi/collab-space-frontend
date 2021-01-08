import React,{ useState } from "react";
import { ToastContainer } from 'react-toastify';
import ReactTooltip from 'react-tooltip';
import 'react-toastify/dist/ReactToastify.css';
import Credentials from './pages/Credentials';
import Workspace from './pages/Workspace';
import './App.css';
import { getsocketIoInstance } from "./utils/socketio-client";

let memberElems;

function App() {

  const [verified, setVerified] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const toggleMembers = () => {
    if (!modalOpen) {
      const mJson = sessionStorage.getItem('members');
      if (mJson) {
        const members = JSON.parse(mJson);
        memberElems =  Object.keys(members).map(key => 
          <span key={key}> - {members[key]}</span>
        );
      }
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
    
  }

  const exitWorkspace = () => {
    // TODO: have a dialog or sth
    const roomName = sessionStorage.getItem('roomName');
    const displayName = sessionStorage.getItem('displayName');
    const socketIo = getsocketIoInstance(roomName, displayName, 'App');
    socketIo.emit('leave-room', { roomName, userName: displayName });
    setVerified(false);
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>Collab Space</p>
        { verified && <div className="room-details-cont">
          <div className="room-details">
            <span>Room Name: {sessionStorage.getItem('roomName')}</span> 
            <span>UserName: {sessionStorage.getItem('displayName')}</span>
            <span></span>
          </div>
          <i className="fa fa-users room-icon" aria-hidden="true" data-tip="Members" onClick={toggleMembers}></i>
          <i className="fas fa-times-circle room-icon" data-tip="Exit Workspace" onClick={exitWorkspace}></i> 
          <ReactTooltip place="left" type="error" effect="float"/>
        </div> }
      </header>
      { !verified && <Credentials setVerified={setVerified}/> }
      { verified &&  <Workspace/> }
      { modalOpen && <div className="members-modal-content">
        <i class="fa fa-times mbrs-mdl-close" aria-hidden="true" onClick={() => setModalOpen(false)}></i>
          <h6>These users have access to this Workspace</h6>
          { memberElems }
        </div>
      }
        
      <ToastContainer limit={3}/>
    </div>
  );
}

export default App;

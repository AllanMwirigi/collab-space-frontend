import React from 'react';
import BounceLoader from 'react-spinners/BounceLoader';
import { css } from "@emotion/core";
import Peer from 'peerjs';
import { toast } from 'react-toastify';
import { getsocketIoInstance } from '../utils//socketio-client';
import { getPeerConfig } from '../utils/utils';

export default class Meeting extends React.Component {
  constructor() {
    super();
    this.spinnerStyles = css`
      display: block;
      align-self: center;
      position: absolute;
      top: 40%;
      z-index: 1000;
    `;
    this.state = {
      loading: false, joined: false, 
      videoDataArr: [] // [{ id, stream }]
    }
    this.peerId = null; this.localPeer = null; this.remotePeers = []; this.videoData = {}; this.quality = 12;
    this.videoElemRefs = {}; this.peers = {};
    this.videoContainerRef = React.createRef();
    this.roomName = sessionStorage.getItem('roomName');
    this.displayName = sessionStorage.getItem('displayName'); // the name of this user

    // TODO: if server restarts while clients connected, clients will need to rejoin the room
  }

  componentDidMount() {
    // this.socketIo.on('peer-join', (userId) => {
    //   // another user/peer has joined the call
    // });
  }

  componentDidUpdate() {
    for (let item of this.state.videoDataArr) {
      if (this.videoElemRefs[item.id].srcObject == null) {
        this.videoElemRefs[item.id].srcObject = item.stream;
      }
      // this.videoElemRefs[item.id].srcObject = item.stream;
      // console.log('componentDidUpdate', item.id);
    }
  }

  componentWillUnmount() {
    // this.leaveCall();
    this.destoryConnection();
    if (this.localPeer != null) this.localPeer.destroy();
  }

  initConnection = async () => {
    this.setState({ loading: true });
    const peerConfig = getPeerConfig();
    this.localPeer = new Peer('', { host: peerConfig.host, port: peerConfig.port, path: '/peertc' });
    this.localPeer.on('open', (id) => {
      console.log('local peer connected', id);
      this.localPeerId = id;
      this.initLocalStream(id);
      // this.socketIo.emit('peer-join', { roomName: this.roomName, peerId: id });
    });
    this.localPeer.on('error', (err) => {
      console.log('local peer connection error', err.message);
      
      // toast.error('Error initiating meeting', { autoClose: 10000 });
    })
    this.localPeer.on('disconnected', () => {
      // try {
      //   if (this.localPeer && this.localPeer.disconnected) this.localPeer.reconnect();
      // } catch (error) {
      //   toast.error('Error reconnecting to meeting', { autoClose: 10000 });
      // }
    })
  }

  initLocalStream = (localId, enableVideo = true, enableAudio = true) => {
    const myNavigator = navigator.mediaDevices.getUserMedia || 
    navigator.mediaDevices.webkitGetUserMedia || 
    navigator.mediaDevices.mozGetUserMedia || 
    navigator.mediaDevices.msGetUserMedia;
    myNavigator({
      video: enableVideo ? {
        frameRate: this.quality,
        noiseSuppression: true,
        width: {min: 640, ideal: 1280, max: 1920},
        height: {min: 480, ideal: 720, max: 1080}
      } : false,
      audio: enableAudio,
    })
    .then((stream) => {
      if (stream) {
        this.createVideo({ id: localId, stream });
        this.listenForPeers(stream);

        this.socketIo = getsocketIoInstance(this.roomName, this.displayName, 'Meeting');
        // rejoin room in case client is disconnected midway, will be ignored if client already in room
        this.socketIo.emit('join-room-re', { roomName: this.roomName });
        this.socketIo.on('peer-join', (peers) => {
          // any time a peer is added, send back an object containing all the peers
          console.log('socket New peer joined', peers);
          Object.keys(peers).forEach((key) => {
            const peerId = peers[key];
            this.connectToNewUser(peerId, stream);
          });
        });
        this.socketIo.on('peer-leave', (peerId) => {
          // any time a peer leaves, send its id
          console.log('socket peer left', peerId);
          this.removeVideo(peerId);
        });
        this.socketIo.emit('peer-join', { roomName: this.roomName, peerId: localId });
      }
    })
    .catch(error => {
      console.log('init stream error', error.message);
      toast.error('Error initiating meeting', { autoClose: 10000 });
    });
  }

  connectToNewUser(otherPeerId, stream) {
    try {
      if (otherPeerId === this.localPeerId) {
        // don't want local peer to call itself
        return;
      }
      const call = this.localPeer.call(otherPeerId, stream, { metadata: { id: this.localPeerId }});
      call.on('stream', (userVideoStream) => {
        console.log('other user streaming', otherPeerId);
        this.createVideo({ id: otherPeerId, stream: userVideoStream });
      });
      call.on('close', () => {
        console.log('other peer closed', otherPeerId);
        this.removeVideo(otherPeerId);
      });
      call.on('error', (err) => {
        console.log('peer error', err.message)
        this.removeVideo(otherPeerId);
      })
      this.remotePeers[otherPeerId] = call;
    } catch(error) {
      console.log('error calling', otherPeerId, error.message);
    }
  }

  createVideo = (data) => {
    // only add peers that do not exist into videoDataArr
    if (this.peers[data.id] == null) {
      this.setState(prevState => ({
        videoDataArr: [...prevState.videoDataArr, data] // add new data to state array
      }))
      this.peers[data.id] = data.id;
    }
    
    if (this.localPeerId === data.id) {
      this.setState({ loading: false, joined: true }); // hide loader, show end call btn
    }
    

    // // can't use this as ReactDOM.render() replaces the contents of the parent instead of appending
    // if (this.videoData[data.id] == null) {
    //   this.videoData[data.id] = { ...data,  };
    //   const videoElem = React.createElement('video', { 
    //     ref: ref => this.videoElemRefs[data.id] = ref, // ref: this.videoElemRefs[data.id], 
    //     className: 'video-elem', id: data.id, autoPlay: true,
    //     // srcObject: this.videoData[data.id].stream, // not allowed by React, so used the ref instead
    //   });
    //   const videoWrapper = React.createElement('div', { className: 'video-wrapper' }, videoElem);
    //   ReactDOM.render(videoWrapper, document.getElementById('video-container'));
    //   this.videoElemRefs[data.id].srcObject = this.videoData[data.id].stream;
    //   if (this.localPeerId === data.id) {
    //     this.setState({ loading: false, joined: true }); // hide loader, show end call btn
    //     this.videoElemRefs[data.id].muted = true; // prevent user from hearing themselves i.e. audio being played back to them
    //   }
    // } else {
    //   const elemRef = this.videoElemRefs[data.id];
    //   if (elemRef != null) {
    //     elemRef.srcObject = data.stream
    //   }
    // }
  }

  removeVideo = (id) => {
    console.log('removing peer', id);
    const newVideoDataArr = [];
    
    for(let data of this.state.videoDataArr) {
      if(data.id !== id) {
        newVideoDataArr.push(data);
      } else {
        // stop the media tracks of the peer's stream
        if (data.stream != null && data.stream.getTracks() != null) {
          data.stream.getTracks().forEach((track) => {
            track.stop();
          })
        }
      }
    }
    delete this.peers[id];
    this.setState({ videoDataArr: newVideoDataArr });
  }

  listenForPeers = (localStream) => {
    // listening for any incoming video stream from another user and will stream our data in peer.answer(ourStream).
    this.localPeer.on('call', (call) => {
      call.answer(localStream);
      call.on('stream', (userVideoStream) => {
        console.log('new call from', call.metadata.id)
        this.createVideo({ id: call.metadata.id, stream: userVideoStream });
      });
      call.on('close', () => {
        console.log('peer closed', call.metadata.id);
        this.removeVideo(call.metadata.id);
      });
      call.on('error', (err) => {
        console.log('peer error', err.message);
        // this.removeVideo(call.metadata.id);
      });
      this.remotePeers[call.metadata.id] = call;
    });
  }

  destoryConnection = () => {
    for (let data of this.state.videoDataArr) {
      if (data.stream != null && data.stream.getTracks() != null) {
        data.stream.getTracks().forEach((track) => {
          track.stop();
        })
      }
    }
    // const data = this.videoData[this.localPeerId];
    
    Object.keys(this.videoElemRefs).forEach(id => {
      const elemRef = this.videoElemRefs[id];
      if(elemRef!= null) elemRef.srcObject = null;
    });
    
    if (this.socketIo) {
      this.socketIo.emit('peer-leave', { roomName: this.roomName, peerId: this.localPeerId });
    }
    // if (this.localPeer != null) {
    // // this.localPeer.disconnect();
    //   this.localPeer.destroy();
    //   // this.localPeer = null;
    // }
  }

  leaveCall = () => {
    this.destoryConnection();
    // this.removeVideo(this.localPeerId);
    // this.videoData = {};
    // // loop through the remaining video refs and remove them
    // Object.keys(this.videoElemRefs).forEach(id => {
    //   const elemRef = this.videoElemRefs[id];
    //   if (elemRef != null) {
    //     elemRef.remove();
    //   }
    // });
    this.videoElemRefs = {}; this.peers = {};
    this.setState({ videoDataArr: [], joined: false });
  }

  render() {
    const { loading, joined, videoDataArr } = this.state;
    const videoElems = videoDataArr.map((data) => {
      const elem = (
        <div className="video-wrapper" key={data.id}>
          <video className="video-elem" id={data.id} autoPlay muted={data.id === this.localPeerId}
            ref={ref => this.videoElemRefs[data.id] = ref}>
          </video>
        </div>
      );
      // this.videoElemRefs[data.id].srcObject = data.stream;
      return elem;
    });
    
    return(
      <div className="meeting-component">
        <h4>Meeting</h4>
        <div className="meeting-container">
        {/* <div id="video-container" ref={this.videoContainerRef}> */}
          { !loading && !joined && <button className="call-btn" onClick={this.initConnection}>Start Call</button> }
          { loading && !joined && <BounceLoader loading={loading} color="#36d7b7" css={this.spinnerStyles} size={100} /> }
          {/* { joined &&  <div id="video-container" ref={this.videoContainerRef}></div> } */}
          <div id="video-container" ref={this.videoContainerRef}>
            { videoElems }
          </div>
          { joined && <button className="end-call-btn" onClick={this.leaveCall}>End Call</button> }
        </div>
      </div>
    );
  }
}
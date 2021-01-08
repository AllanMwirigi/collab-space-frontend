import Peer from 'peerjs';
import { toast } from 'react-toastify';
import { getsocketIoInstance } from './socketio-client';
import { getPeerConfig } from './utils';

class PeerConnection {
  localPeerId = null; localPeer = null; remotePeers = {}; videoData = {}; quality;
  constructor(roomName, userName, quality) {
    this.socketIo = getsocketIoInstance(roomName, userName);
    this.quality = quality;
    // this.peerId = peerId;
    this.initLocalPeer();
  }

  initLocalPeer = () => {
    // this.localPeer = new Peer('', { host: `${getBaseUrl()}`, path: '/peertc' });
    const peerConfig = getPeerConfig();
    this.localPeer = new Peer('', { host: peerConfig.host, port: peerConfig.port, path: '/peertc' });
    this.localPeer.on('open', (id) => {
      console.log('local peer connected', id);
      this.localPeerId = id;
      this.initLocalStream(id);
      this.socketIo.emit('peer-join', { roomName: this.roomName, peerId: id });
    });
    this.localPeer.on('error', (err) => {
      console.log('local peer connection error', err.message);
      this.localPeer.reconnect();
      toast.error('Error initiating meeting', { autoClose: 10000 });
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
        // this.setPeersListeners(stream);
        this.listenForPeers(stream);
        // this.newUserConnection(stream);
        this.socketIo.on('peer-join', (otherPeerId) => {
          console.log('New User Connected', otherPeerId);
          this.connectToNewUser(otherPeerId, stream);
        });
      }
    });
  }

  createVideo = (data) => {
    if (this.videoData[data.id] == null) {
      this.videoData[data.id] = { ...data,  };
      const videoContainer = document.getElementById('video-container');
      const videoWrapper = document.createElement('div');
      const videoElem = document.createElement('video');
      // const videoWrapper = React.createElement('div', null, null);
      // const videoElem = React.createElement('video', null, null);
      videoWrapper.className = 'video-wrapper';
      videoElem.srcObject = this.videoData[data.id].stream;
      videoElem.id = data.id;
      videoElem.className = 'video-elem';
      videoElem.autoplay = true;
      if (this.localPeerId === data.id) videoElem.muted = true;
      videoWrapper.appendChild(videoElem);
      videoContainer.appendChild(videoWrapper);
      // this.videoContainerRef.current.appendChild(videoWrapper);
    } else {
      const videoElem = document.getElementById(data.id);
      if (videoElem != null) {
        videoElem.srcObject = data.stream;
      }
      // document.getElementById(data.id)?.srcObject = data.stream;
    }
  }

  listenForPeers = (localStream) => {
    // listening for any incoming video stream from another user and will stream our data in peer.answer(ourStream).
    this.localPeer.on('call', (call) => {
      call.answer(localStream);
      call.on('stream', (userVideoStream) => {
        console.log('user stream data', userVideoStream)
        this.createVideo({ id: call.metadata.id, stream: userVideoStream });
      });
      call.on('close', () => {
        console.log('closing peers listeners', call.metadata.id);
        this.removeVideo(call.metadata.id);
      });
      call.on('error', () => {
        console.log('peer error ------');
        this.removeVideo(call.metadata.id);
      });
      this.remotePeers[call.metadata.id] = call;
    });
  }
  // newUserConnection = (stream) => {
  //   this.socket.on('new-user-connect', (userData) => {
  //     console.log('New User Connected', userData);
  //     this.connectToNewUser(userData, stream);
  //   });
  // }
  connectToNewUser(otherPeerId, stream) {
    const call = this.localPeer.call(otherPeerId, stream, { metadata: { id: this.localPeerId }});
    call.on('stream', (userVideoStream) => {
      this.createVideo({ id: otherPeerId, stream: userVideoStream });
    });
    call.on('close', () => {
      console.log('other peer closed', otherPeerId);
      this.removeVideo(otherPeerId);
    });
    call.on('error', () => {
      console.log('peer error ------')
      this.removeVideo(otherPeerId);
    })
    this.remotePeers[otherPeerId] = call;
  }
  removeVideo = (id) => {
    delete this.videoData[id];
    const video = document.getElementById(id);
    if (video) video.remove();
  }
  destoryConnection = () => {
    const myMediaTracks = this.videoData[this.localPeerId]?.stream.getTracks();
    myMediaTracks?.forEach((track) => {
      track.stop();
    })
    this.socketIo.emit('peer-leave', { roomName: this.roomName, peerId: this.localPeerId });
    this.localPeer.destroy();
  }

}

// export const createPeerConnInstance = (roomName, userName, quality=12) => {
//   return new PeerConnection(roomName, userName, quality);
// }
export function createPeerConnInstance(roomName, userName, quality=12) {
  return new PeerConnection(roomName, userName, quality);
}

// https://dev.to/arjhun777/video-chatting-and-screen-sharing-with-react-node-webrtc-peerjs-18fg
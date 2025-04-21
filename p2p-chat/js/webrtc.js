const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

let peerConnection = null;
let dataChannel = null;
let socket = null;
let isInitiator = false;
let iceCandidatesBuffer = [];
let currentPeer = null;

function connectSignaling() {
    socket = io('http://localhost:5000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('Connected to signaling server');
        updateStatus('Connected to signaling server');
        
        const user = getUserData();
        if (user) {
            socket.emit('authenticate', {
                user_id: user.id,
                username: user.username
            });
        } else {
            console.error('No user data available for authentication');
            updateStatus('Authentication failed: No user data');
        }
    });

    socket.on('authenticated', (data) => {
        console.log('Authenticated with server:', data);
        updateStatus('Ready to chat');
        
        if (data.active_users) {
            updateUsersList(data.active_users);
        }
    });

    socket.on('auth_error', (data) => {
        console.error('Authentication error:', data.message);
        updateStatus('Authentication error: ' + data.message);
    });

    socket.on('user_joined', (data) => {
        console.log('User joined:', data);
        displaySystemMessage(`${data.username} has joined the chat`);
        
        if (data.active_users) {
            updateUsersList(data.active_users);
        }
    });

    socket.on('user_left', (data) => {
        console.log('User left:', data);
        displaySystemMessage(`${data.username} has left the chat`);
        
        if (data.active_users) {
            updateUsersList(data.active_users);
        }
        
        if (currentPeer === data.username) {
            displaySystemMessage(`Your chat with ${data.username} has ended`);
            cleanupPeerConnection();
            currentPeer = null;
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        updateStatus('Disconnected from signaling server');
        enableChat(false);
        cleanupPeerConnection();
    });

    socket.on('status', (data) => {
        console.log('Status update:', data);
        updateStatus(data.message);
    });

    socket.on('signal', handleSignalingData);
}

function cleanupPeerConnection() {
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    iceCandidatesBuffer = [];
    enableChat(false);
}

function createPeerConnection() {
    cleanupPeerConnection();
    
    peerConnection = new RTCPeerConnection(configuration);
    console.log('Created peer connection');

    if (isInitiator) {
        console.log('Creating data channel as initiator');
        dataChannel = peerConnection.createDataChannel('chat');
        setupDataChannel(dataChannel);
    }

    peerConnection.ondatachannel = (event) => {
        console.log('Received data channel');
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate');
            socket.emit('signal', {
                type: 'candidate',
                candidate: event.candidate,
                target: currentPeer
            });
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
        updateStatus('ICE connection state: ' + peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'disconnected' || 
            peerConnection.iceConnectionState === 'failed' || 
            peerConnection.iceConnectionState === 'closed') {
            
            if (currentPeer) {
                displaySystemMessage(`Connection with ${currentPeer} has been lost`);
                currentPeer = null;
            }
        }
    };
}

function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('Data channel opened');
        updateStatus('Chat connection established');
        enableChat(true);
        
        if (currentPeer) {
            displaySystemMessage(`Connected to ${currentPeer}`);
        }
    };

    channel.onclose = () => {
        console.log('Data channel closed');
        updateStatus('Chat connection closed');
        enableChat(false);
        
        if (currentPeer) {
            displaySystemMessage(`Chat with ${currentPeer} has ended`);
            currentPeer = null;
        }
    };

    channel.onmessage = (event) => {
        console.log('Received message:', event.data);
        displayMessage('Peer: ' + event.data);
    };
}

async function processBufferedCandidates() {
    console.log(`Processing ${iceCandidatesBuffer.length} buffered ICE candidates`);
    
    if (peerConnection && peerConnection.remoteDescription) {
        while (iceCandidatesBuffer.length > 0) {
            const candidate = iceCandidatesBuffer.shift();
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log('Added buffered ICE candidate');
            } catch (error) {
                console.error('Error adding buffered ICE candidate:', error);
            }
        }
    }
}

async function handleSignalingData(data) {
    try {
        console.log('Received signal:', data.type);
        
        if (data.sender) {
            if (!currentPeer || data.sender.username === currentPeer) {
                if (!currentPeer && data.type === 'offer') {
                    currentPeer = data.sender.username;
                    document.getElementById('contact-name').textContent = currentPeer;
                    displaySystemMessage(`Incoming chat request from ${currentPeer}`);
                }
            } else {
                console.log(`Ignoring signal from ${data.sender.username}, already chatting with ${currentPeer}`);
                return;
            }
        }
        
        if (!peerConnection) {
            console.log('Creating peer connection for receiving offer');
            createPeerConnection();
        }

        if (data.type === 'offer') {
            console.log('Processing offer with SDP:', data.sdp ? data.sdp.substring(0, 50) + '...' : 'undefined');
            
            if (!data.sdp) {
                console.error('Offer missing SDP data');
                return;
            }
            
            try {
                const offerDesc = new RTCSessionDescription({
                    type: 'offer',
                    sdp: data.sdp
                });
                
                await peerConnection.setRemoteDescription(offerDesc);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                console.log('Sending answer with SDP:', answer.sdp ? answer.sdp.substring(0, 50) + '...' : 'undefined');
                
                socket.emit('signal', {
                    type: 'answer',
                    sdp: answer.sdp,
                    target: currentPeer
                });
                
                await processBufferedCandidates();
            } catch (error) {
                console.error('Error processing offer:', error);
                updateStatus('Error processing offer: ' + error.message);
            }
        } else if (data.type === 'answer') {
            console.log('Processing answer with SDP:', data.sdp ? data.sdp.substring(0, 50) + '...' : 'undefined');
            
            if (!data.sdp) {
                console.error('Answer missing SDP data');
                return;
            }
            
            try {
                const answerDesc = new RTCSessionDescription({
                    type: 'answer',
                    sdp: data.sdp
                });
                
                await peerConnection.setRemoteDescription(answerDesc);
                
                await processBufferedCandidates();
            } catch (error) {
                console.error('Error processing answer:', error);
                updateStatus('Error processing answer: ' + error.message);
            }
        } else if (data.type === 'candidate' && peerConnection) {
            const candidate = data.candidate;
            
            if (!peerConnection.remoteDescription) {
                console.log('Remote description not set yet, buffering ICE candidate');
                iceCandidatesBuffer.push(candidate);
            } else {
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log('Added ICE candidate');
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                    updateStatus('Error adding ICE candidate: ' + error.message);
                }
            }
        }
    } catch (error) {
        console.error('Error handling signal:', error);
        updateStatus('Error: ' + error.message);
    }
}

function sendMessage(message) {
    if (dataChannel && dataChannel.readyState === 'open') {
        console.log('Sending message:', message);
        dataChannel.send(message);
        displayMessage('You: ' + message);
    } else {
        console.warn('Data channel not ready');
        updateStatus('Cannot send message: Connection not ready');
    }
}

function enableChat(enabled) {
    document.getElementById('message-input').disabled = !enabled;
    document.getElementById('send-button').disabled = !enabled;
}

function connectToPeer(username) {
    if (currentPeer === username) {
        console.log(`Already connected to ${username}`);
        return;
    }
    
    cleanupPeerConnection();
    
    currentPeer = username;
    
    startChat();
}

async function startChat() {
    try {
        updateStatus('Starting chat...');
        isInitiator = true;
        createPeerConnection();
        
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        console.log('Sending offer');
        
        socket.emit('signal', {
            type: 'offer',
            sdp: offer.sdp,
            target: currentPeer
        });
    } catch (error) {
        console.error('Error starting chat:', error);
        updateStatus('Error: ' + error.message);
    }
}

window.onload = () => {
    console.log('Initializing chat application');
    document.getElementById('message-input').disabled = true;
    document.getElementById('send-button').disabled = true;
    updateStatus('Connecting to server...');
    connectSignaling();
};

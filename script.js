let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')
let type = urlParams.get('type')

let peer = null;
let currentPeer = null;
let localStream = null;
let screenStream = null;
let screenSharing = false;

let isCameraOn = false;

let isMicActive = false;
let mediaStream = null;

let getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;


window.addEventListener('load', ()=>{
    if(!roomId){
        window.close()
    }else{
        if(type==1){
            initPeer(type ? roomId : undefined);
        }
        if(type==2){
            joinRoom(type ? roomId : undefined)
        }
    }
})

function initPeer(roomId) {
    peer = new Peer(roomId);
    peer.on('open', (id) => {
        console.log("Peer Connected with ID: ", id);
        getUserMedia({ video: true, audio: true }, handleUserMedia, handleUserMediaError);
        notify("Waiting for peer to join.");
    });

    peer.on('call', handleIncomingCall);
}

function joinRoom(room_id){
    peer = new Peer()
    peer.on('open', (id) => {
        console.log("Connected with Id: " + id)
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            setLocalStream(local_stream)
            notify("Joining peer")
            let call = peer.call(room_id, stream)
            call.on('stream', (stream) => {
                setRemoteStream(stream);
            })
            currentPeer = call;
        }, (err) => {
            console.log(err)
        })

    })
}

function handleUserMedia(stream) {
    localStream = stream;
    setLocalStream(localStream);
}

function handleUserMediaError(err) {
    console.log(err);
}

function handleIncomingCall(call) {
    call.answer(localStream);
    call.on('stream', setRemoteStream);
    currentPeer = call;
    console.log(currentPeer)
}

function setLocalStream(stream) {
    const video = document.getElementById("local-video");
    video.srcObject = stream;
    video.muted = false;
    video.play();
}

function setRemoteStream(stream) {
    document.getElementById('local-video').classList.add('smallFrame');
    const video = document.getElementById("remote-video");
    video.style.display = 'block';
    video.srcObject = stream;
    video.play();
}


function notify(msg) {
    const notification = document.getElementById("notification");
    notification.innerHTML = msg;
    notification.hidden = false;
    setTimeout(() => {
        notification.hidden = true;
    }, 3000);
}


function success(msg) {
	const sucessNotif = document.getElementById("success-sucessNotif");
	sucessNotif.innerHTML = msg;
	sucessNotif.hidden = false;
	setTimeout(() => {
		sucessNotif.hidden = true;
	}, 3000);
}

function startScreenShare() {
	const videoElement = document.getElementById("local-video");
	const statusContainer = document.getElementById("statusContainer");

	if (screenSharing) {
		stopScreenSharing();
		return;
	}

	navigator.mediaDevices.getDisplayMedia({ video: true }).then((stream) => {
		screenStream = stream;
		const videoTrack = screenStream.getVideoTracks()[0];
		videoTrack.onended = stopScreenSharing;

		if (peer) {
			const sender = currentPeer.peerConnection.getSenders().find((s) => s.track.kind == videoTrack.kind);
			sender.replaceTrack(videoTrack);
			screenSharing = true;
		}

		videoElement.srcObject = screenStream;
		statusContainer.style.display = "none";
	});
}

function stopScreenSharing() {
	const statusContainer = document.getElementById("statusContainer");
	if (!screenSharing) return;
	const videoTrack = localStream.getVideoTracks()[0];
	if (peer) {
		const sender = currentPeer.peerConnection.getSenders().find((s) => s.track.kind == videoTrack.kind);
		sender.replaceTrack(videoTrack);
	}
	screenStream.getTracks().forEach((track) => track.stop());
	screenSharing = false;
	statusContainer.style.display = "flex";
}

function leave() {
	window.close();
}

// const toggleCamera = () => {
// 	const cameraBtn = document.getElementById("camera-btn");
// 	const cameraIcon = document.getElementById("camera-icon");
// 	const statusContainer = document.getElementById("statusContainer");

// 	try {
// 		if (isCameraOn) {
// 			// Turn off the camera
// 			localSteam.getTracks().forEach((track) => track.stop());
// 			document.getElementById("local-video").srcObject = null;
// 			isCameraOn = false;

// 			statusContainer.style.display = "flex";
// 		} else {
// 			// Turn on the camera
// 			localSteam = navigator.mediaDevices.getUserMedia({ video: true });
// 			document.getElementById("local-video").srcObject = localSteam;
// 			isCameraOn = true;

// 			statusContainer.style.display = "none";
// 		}

// 		cameraBtn.classList.toggle("bg-white", !isCameraOn);
// 		cameraBtn.classList.toggle("bg-red-400", isCameraOn);

// 		cameraIcon.classList.toggle("text-black", !isCameraOn);
// 		cameraIcon.classList.toggle("text-white", isCameraOn);
// 	} catch (error) {
// 		alert("Error accessing camera:", error);
// 	}
// };

function toggleMicrophone() {
	if (isMicActive) {
		stopMicrophone();
	} else {
		startMicrophone();
	}
}

function startMicrophone() {
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices
			.getUserMedia({ audio: true })
			.then(function (stream) {
				console.log("Microphone access granted:", stream);
				mediaStream = stream;
				isMicActive = true;
				updateButtonState();
			})
			.catch(function (error) {
				console.error("Error accessing microphone:", error);
			});
	} else {
		console.error("getUserMedia is not supported on this browser");
	}
}

function stopMicrophone() {
	if (mediaStream) {
		mediaStream.getTracks().forEach((track) => track.stop());
		mediaStream = null;
		console.log("Microphone turned off");
		isMicActive = false;
		updateButtonState();
	}
}

function updateButtonState() {
	const micBtn = document.getElementById("mic-btn");
	const micIcon = document.getElementById("mic-icon");
	const tooltipMic = document.getElementById("tooltip-mic");
	const volumeHighIcon = document.querySelector(".fa-volume-high");
	const volumeXmarkIcon = document.querySelector(".fa-volume-xmark");

	micBtn.classList.toggle("active", isMicActive);
	tooltipMic.innerText = isMicActive ? "Close Microphone" : "Open Microphone";

	if (isMicActive) {
		volumeHighIcon.style.display = "block";
		volumeXmarkIcon.style.display = "none";
	} else {
		volumeHighIcon.style.display = "none";
		volumeXmarkIcon.style.display = "block";
	}

	micBtn.classList.toggle("bg-white", !isMicActive);
	micBtn.classList.toggle("bg-red-400", isMicActive);

	micIcon.classList.remove("text-black", "text-white");
	micIcon.classList.add(isMicActive ? "text-white" : "text-black");
}

document.getElementById("mic-btn").addEventListener("click", toggleMicrophone);
document.getElementById("camera-btn").addEventListener("click", toggleCamera);

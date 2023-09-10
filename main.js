import AgoraRTC from "agora-rtc-sdk-ng";

let options = {
  // Pass your App ID here.
  appId: 'd5456925644748f3a2734319f6b8b367',
  // Set the channel name.
  channel: 'test',
  // Pass your temp token here.
  token: '007eJxTYNhx/PfzrZHHsypfpYbUS2W9fPt/1rkrG6tmZZ3x5/7xuMxWgcHIMDnR2DI50cwwycTEzNzI0sLA0Mg4MdXIyDzVLMU0+Q77v5SGQEYGfecXjIwMEAjiszCUpBaXMDAAAJ0XI1Y=',
  // Set the user ID.
  uid: 0,
};

// Define the audioFileTrack variable.
let audioFileTrack;

// Initialize the audio mixing state.
let isAudioMixing = false;

let channelParameters = {
  // A variable to hold a local audio track.
  localAudioTrack: null,
  // A variable to hold a remote audio track.
  remoteAudioTrack: null,
  // A variable to hold the remote user id.
  remoteUid: null,
};

async function startBasicCall() {
  // Create an instance of the Agora Engine
  const agoraEngine = AgoraRTC.createClient({ mode: "rtc", codec: "vp9" });

  // Listen for the "user-published" event to retrieve an AgoraRTCRemoteUser object.
  agoraEngine.on("user-published", async (user, mediaType) => {
    // Subscribe to the remote user when the SDK triggers the "user-published" event.
    await agoraEngine.subscribe(user, mediaType);
    console.log("subscribe success");

    // Subscribe and play the remote audio track.
    if (mediaType == "audio") {
      channelParameters.remoteUid = user.uid;
      // Get the RemoteAudioTrack object from the AgoraRTCRemoteUser object.
      channelParameters.remoteAudioTrack = user.audioTrack;
      // Play the remote audio track.
      channelParameters.remoteAudioTrack.play();
      showMessage("Remote user connected: " + user.uid);
    }

    // Listen for the "user-unpublished" event.
    agoraEngine.on("user-unpublished", (user) => {
      console.log(user.uid + " has left the channel");
      showMessage("Remote user has left the channel");
    });
  });

  window.onload = function () {
    // Listen to the Join button click event.
    document.getElementById("join").onclick = async function () {
      document.getElementById("audioRoute").onclick = async function () {
        var deviceID = document.getElementById("PlayoutDevice").value;
        console.log("The selected device id is : " + deviceID);
        channelParameters.remoteAudioTrack.setPlaybackDevice(deviceID);
      };

      // Join a channel.
      await agoraEngine.join(
        options.appId,
        options.channel,
        options.token,
        options.uid
      );
      showMessage("Joined channel: " + options.channel);
      // Create a local audio track from the microphone audio.
      channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      // Publish the local audio track in the channel.
      await agoraEngine.publish(channelParameters.localAudioTrack);
      console.log("Publish success!");

      const playbackDevices = await AgoraRTC.getPlaybackDevices(true);
      var select = document.createElement("select");
      select.id = "PlayoutDevice";
      for (var i = 0; i < playbackDevices.length; i++) {
        var option = document.createElement("option");
        option.value = playbackDevices[i].deviceId;
        option.text = playbackDevices[i].label;
        select.appendChild(option);
      }
      var label = document.createElement("label");
      label.innerHTML = "Choose a playout device: ";
      document.getElementById("Container").appendChild(label).appendChild(select);
    };

    // Set an event listener to get the selected audio file.
    document.getElementById("filepicker").addEventListener("change", handleFiles, false);
    async function handleFiles() {
      // Pass in the selected audio file for audio mixing.
      audioFileTrack = await AgoraRTC.createBufferSourceAudioTrack({
        source: this.files[0],
      });
    };

    // Listen to the audio mixing button click event.
    document.getElementById("audioMixing").onclick = async function () {
      // Check the audio mixing state.
      if (!channelParameters.localAudioTrack) {
        showMessage("Local audio track is not available.");
        return;
      }

      if (isAudioMixing === false) {
        // Start processing the audio data from the audio file.
        audioFileTrack.startProcessAudioBuffer();

        try {
          // Replace the local audio track with the audioFileTrack.
          await channelParameters.localAudioTrack.setEnabled(false);
          await channelParameters.localAudioTrack.stop();
          await channelParameters.localAudioTrack.close();

          channelParameters.localAudioTrack = audioFileTrack;

          // Publish the updated local audio track in the channel.
          await agoraEngine.publish(channelParameters.localAudioTrack);

          // Change the button text.
          document.getElementById("audioMixing").innerHTML = "Stop audio mixing";
          // Update the audio mixing state.
          isAudioMixing = true;
        } catch (error) {
          console.error("Error replacing local audio track:", error);
        }
      } else {
        // To stop audio mixing, stop processing the audio data.
        audioFileTrack.stopProcessAudioBuffer();

        try {
          // Replace the audioFileTrack with the original local audio track.
          await channelParameters.localAudioTrack.setEnabled(false);
          await channelParameters.localAudioTrack.stop();
          await channelParameters.localAudioTrack.close();

          channelParameters.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();

          // Publish the updated local audio track in the channel.
          await agoraEngine.publish(channelParameters.localAudioTrack);

          // Change the button text.
          document.getElementById("audioMixing").innerHTML = "Start audio mixing";
          // Update the audio mixing state.
          isAudioMixing = false;
        } catch (error) {
          console.error("Error replacing local audio track:", error);
        }
      }
    };

    // Listen to the Leave button click event.
    document.getElementById("leave").onclick = async function () {
      // Destroy the local audio track.
      channelParameters.localAudioTrack.close();
      // Leave the channel
      await agoraEngine.leave();
      console.log("You left the channel");
      // Refresh the page for reuse
      window.location.reload();
    };
  };
}

function showMessage(text){
  document.getElementById("message").textContent = text;
}

startBasicCall();

import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import type { HandLandmarkerResult } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import { ScenesManager } from "./ScenesManager.ts";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
type RunningMode = NonNullable<
  Parameters<typeof HandLandmarker.createFromOptions>[1]["runningMode"]
>;
export class MediaPipeHands {
  constructor() {
    let handLandmarker: HandLandmarker | undefined = undefined;
    let runningMode: RunningMode = "IMAGE";
    let enableWebcamButton: HTMLButtonElement | null = null;
    let webcamRunning: Boolean = false;
    let video_State: boolean = false;
    const createHandLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        runningMode: runningMode,
        numHands: 2,
      });
    };
    createHandLandmarker();

    const imageContainers = document.getElementsByClassName(
      "detectOnClick",
    ) as HTMLCollectionOf<Element>;
    const handleClick = async (event: MouseEvent): Promise<void> => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      const parent = target.parentElement;
      if (!parent) return;
      const parentNode = target.parentNode;
      if (!parentNode) return;
      if (!handLandmarker) {
        console.log("Wait for handLandmarker to load before clicking!");
        return;
      }
      if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await handLandmarker.setOptions({ runningMode: "IMAGE" });
      }
      // Remove all landmarks drawed before
      const allCanvas = parent.getElementsByClassName("canvas");
      for (var i = allCanvas.length - 1; i >= 0; i--) {
        const n = allCanvas[i];
        const nParent = n.parentNode;
        if (!nParent) return;
        n.parentNode.removeChild(n);
      }

      // We can call handLandmarker.detect as many times as we like with
      // different image data each time. This returns a promise
      // which we wait to complete and then call a function to
      // print out the results of the prediction.
      const handLandmarkerResult = handLandmarker.detect(target);
      console.log(handLandmarkerResult.handednesses[0][0]);
      const canvas = document.createElement("canvas");
      canvas.setAttribute("class", "canvas");
      canvas.setAttribute("width", target.naturalWidth + "px");
      canvas.setAttribute("height", target.naturalHeight + "px");
      canvas.style = "left: 0px;" + "top: 0px;";

      parentNode.appendChild(canvas);
      const cxt = canvas.getContext("2d");
      if (!cxt) return;
      for (const landmarks of handLandmarkerResult.landmarks) {
        drawConnectors(cxt, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });
        drawLandmarks(cxt, landmarks, { color: "#FF0000", lineWidth: 1 });
      }
    };
    for (let i = 0; i < imageContainers.length; i++) {
      let children = imageContainers[i].children[0] as HTMLDivElement;
      children.addEventListener("click", handleClick);
    }

    /********************************************************************
    // Demo 2: Continuously grab image from webcam stream and detect it.
    ********************************************************************/

    ScenesManager.setup();

    const videoContainer = document.getElementById(
      "webcamContainer",
    ) as HTMLVideoElement;
    const video = document.getElementById("webcam") as HTMLVideoElement;

    const videoContainer_ = document.getElementById(
      "staticContainer",
    ) as HTMLVideoElement;
    const video_ = document.getElementById("video_") as HTMLVideoElement;
    const canvasElement = document.getElementById(
      "output_canvas",
    ) as HTMLCanvasElement;
    const canvasCtx = canvasElement.getContext("2d");

    const canvasElement_ = document.getElementById(
      "output_canvas_",
    ) as HTMLCanvasElement;
    const canvasCtx_ = canvasElement_.getContext("2d");
    // Check if webcam access is supported.
    const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
    const enableCam = () => {
      if (!enableWebcamButton) return;
      if (!handLandmarker) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
      }

      if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
      } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
      }

      // getUsermedia parameters.
      const constraints = {
        video: true,
      };

      // Activate the webcam stream.
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
      });
    };
    if (hasGetUserMedia()) {
      enableWebcamButton = document.querySelector("#webcamButton");
      if (!enableWebcamButton) return;
      enableWebcamButton.addEventListener("click", enableCam);
    } else {
      console.warn("getUserMedia() is not supported by your browser");
    }

    let lastVideoTime = -1;
    let lastVideoTime_ = -1;
    let results: HandLandmarkerResult | undefined;
    let results_: HandLandmarkerResult | undefined;
    // console.log(video);
    async function predictWebcam() {
      videoContainer.style.aspectRatio = (
        video.videoWidth / video.videoHeight
      ).toString();
      video.style.aspectRatio = (
        video.videoWidth / video.videoHeight
      ).toString();
      // canvasElement.style.width = video.videoWidth.toString();
      // canvasElement.style.height = video.videoHeight.toString();
      // canvasElement.width = video.videoWidth;
      // canvasElement.height = video.videoHeight;

      // Now let's start detecting the stream.
      if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        if (!handLandmarker) return;
        await handLandmarker.setOptions({ runningMode: "VIDEO" });
      }
      let startTimeMs = performance.now();
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        if (!handLandmarker) return;
        results = handLandmarker.detectForVideo(video, startTimeMs);
      }

      if (!canvasCtx) return;
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      if (!results) return;
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
          });
          drawLandmarks(canvasCtx, landmarks, {
            color: "#FF0000",
            lineWidth: 2,
          });
        }

        if (results.landmarks.length == 1) {
          for (let l = 0; l < 21; l++) {
            ScenesManager.handArr[l].position.x =
              -1 * (results.landmarks[0][l].x + 0.5);
            ScenesManager.handArr[l].position.y =
              -1 * (results.landmarks[0][l].y + 0.5);
            ScenesManager.handArr[l].position.z = 1 * results.landmarks[0][l].z;
          }
        }
      }
      canvasCtx.restore();

      // Call this function again to keep predicting when the browser is ready.
      if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
      }
    }
    async function predictWebcam_() {
      videoContainer_.style.aspectRatio = (
        video_.videoWidth / video_.videoHeight
      ).toString();
      video_.style.aspectRatio = (
        video_.videoWidth / video_.videoHeight
      ).toString();
      // canvasElement.style.width = video.videoWidth.toString();
      // canvasElement.style.height = video.videoHeight.toString();
      // canvasElement.width = video.videoWidth;
      // canvasElement.height = video.videoHeight;

      // Now let's start detecting the stream.
      if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        if (!handLandmarker) return;
        await handLandmarker.setOptions({ runningMode: "VIDEO" });
      }
      let startTimeMs = performance.now();
      if (lastVideoTime_ !== video_.currentTime) {
        lastVideoTime_ = video_.currentTime;
        if (!handLandmarker) return;
        results_ = handLandmarker.detectForVideo(video_, startTimeMs);
      }

      if (!canvasCtx_) return;
      canvasCtx_.save();
      canvasCtx_.clearRect(0, 0, canvasElement_.width, canvasElement_.height);
      if (!results_) return;
      if (results_.landmarks) {
        for (const landmarks of results_.landmarks) {
          drawConnectors(canvasCtx_, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
          });
          drawLandmarks(canvasCtx_, landmarks, {
            color: "#FF0000",
            lineWidth: 2,
          });
        }
      }
      canvasCtx_.restore();

      // Call this function again to keep predicting when the browser is ready.
      if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam_);
      }
    }
    video_.addEventListener("click", () => {
      if (!video_State) {
        video_.play();
        predictWebcam_();
      } else {
        video_.pause();
      }
      video_State = !video_State;
      webcamRunning = video_State;
    });
  }
}

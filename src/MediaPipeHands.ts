import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
import { motionValue, springValue } from "motion";
import type { MotionValue } from "motion";
import type { HandLandmarkerResult } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
// import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
// import { HAND_CONNECTIONS } from "@mediapipe/hands";
import * as dat from "dat.gui";
import * as PIXI from "pixi.js";
import {
  Application,
  // Assets,
  Container,
  // Sprite,
  Graphics,
  // Circle,
} from "pixi.js";
type RunningMode = NonNullable<
  Parameters<typeof HandLandmarker.createFromOptions>[1]["runningMode"]
>;

const mv = (v: number) => motionValue(v);
const sv = (v: MotionValue<number>) => springValue(v);
type PozData = {
  pointerX: ReturnType<typeof mv>;
  pointerY: ReturnType<typeof mv>;
  pointerZ: ReturnType<typeof mv>;
  x: ReturnType<typeof sv>;
  y: ReturnType<typeof sv>;
  z: ReturnType<typeof sv>;
};
export class MediaPipeHands {
  private webcamContainer = document.querySelector(
    "#webcamContainer",
  ) as HTMLDivElement;
  private score = document.querySelector("#score") as HTMLDivElement;
  private enableWebcamButton = document.querySelector(
    // "#webcamButton",
    "#gameStart",
  ) as HTMLDivElement;
  private msgBox0 = document.querySelector("#msgBox0") as HTMLDivElement;
  private msgBox1 = document.querySelector("#msgBox1") as HTMLDivElement;
  private msgBox2 = document.querySelector("#msgBox2") as HTMLDivElement;
  private gameStart: boolean = false;
  private gameStamp: number = 0;
  private gameLevel: number = 1;
  private gameScore: number = 0;
  private webcamRunning: boolean = false;
  private no_reaction: boolean = true;
  constructor() {
    let handLandmarker: HandLandmarker | undefined = undefined;
    let runningMode: RunningMode = "IMAGE";
    // let webcamRunning: Boolean = false;
    let pozDataArr: Array<PozData> = [];
    const gui = new dat.GUI();
    const param = {
      LEVEL: 1,
    };
    gui.add(param, "LEVEL", 1, 10, 1).onChange((value) => {
      this.gameLevel = value;
    });
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

    /********************************************************************
    // Demo 2: Continuously grab image from webcam stream and detect it.
    ********************************************************************/

    const video = document.getElementById("webcam") as HTMLVideoElement;
    (async () => {
      const app = new Application();
      // Initialize the application
      await app.init({
        backgroundAlpha: 0,
        resizeTo: this.webcamContainer,
        autoDensity: true,
      });
      // Append the application canvas to the document body
      this.webcamContainer.appendChild(app.canvas);
      app.canvas.setAttribute("id", "canvas");
      // Create and add a container to the stage
      const container = new Container();
      // container.x = 0;
      // container.y = 0;
      app.stage.addChild(container);
      // Load the bunny texture
      // const texture = await Assets.load("https://pixijs.com/assets/bunny.png");

      // Create a 5x5 grid of bunnies in the container
      // for (let i = 0; i < 25; i++) {
      //   const bunny = new Sprite(texture);

      //   bunny.x = (i % 5) * 40;
      //   bunny.y = Math.floor(i / 5) * 40;
      //   container.addChild(bunny);
      // }
      const circle_target = new Graphics({ alpha: 0 })
        .circle(0, 0, 30)
        .fill(0xff0000);
      (circle_target as any).radius = 30;
      circle_target.x = app.screen.width * 0.5;
      circle_target.y = -30;
      const circle_0 = new Graphics({ alpha: 0 })
        .circle(0, 0, 100)
        .fill(0xff0000);
      (circle_0 as any).radius = 100;
      const circle_1 = new Graphics({ alpha: 0 })
        .circle(0, 0, 100)
        .fill(0xffff00);
      (circle_1 as any).radius = 100;

      container.addChild(circle_0, circle_1, circle_target);

      // Listen for animate update
      app.ticker.add(() => {
        // Continuously rotate the container!
        // * use delta to create frame-independent transform *
        // container.rotation -= 0.01 * time.deltaTime;
        game();
      });
      const resizing = () => {
        // Move the container to the center
        // container.x = app.screen.width / 2;
        // container.y = app.screen.height / 2;
        // Center the bunny sprites in local container coordinates
        // container.pivot.x = container.width / 2;
        // container.pivot.y = container.height / 2;
      };
      window.addEventListener("resize", resizing);
      resizing();

      for (let l = 0; l < 21; l++) {
        const pointerX = motionValue(0);
        const pointerY = motionValue(0);
        const pointerZ = motionValue(0);
        pozDataArr.push({
          pointerX,
          pointerY,
          pointerZ,
          x: springValue(pointerX, { stiffness: 80 }),
          y: springValue(pointerY, { stiffness: 80 }),
          z: springValue(pointerY, { stiffness: 80 }),
        });
      }

      // Check if webcam access is supported.
      const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;
      const enableCam = () => {
        if (!this.enableWebcamButton) return;
        if (!handLandmarker) {
          console.log("Wait! objectDetector not loaded yet.");
          return;
        }

        if (this.webcamRunning === true) {
          this.webcamRunning = false;
          // this.enableWebcamButton.innerText = "ENABLE PREDICTIONS";
        } else {
          this.webcamRunning = true;
          this.msgBox0.classList.remove("showModal");
          // this.enableWebcamButton.innerText = "DISABLE PREDICTIONS";
        }

        // getUsermedia parameters.
        const constraints = {
          video: true,
        };

        // Activate the webcam stream.
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
          if (this.webcamRunning === true) {
            // alert("ゲーム開始します！\n同じ色のボールをキャッチしましょう！");

            this.msgBox1.classList.add("showModal");
            circle_target.alpha = 0.5;
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
          } else {
            // alert("ゲーム終了！");
            circle_0.alpha = 0;
            circle_1.alpha = 0;
            circle_target.alpha = 0;
            this.gameStart = false;
            this.gameScore = 0;
            ballReset();
          }
          // const videoTrack = stream.getVideoTracks()[0];
          // const settings = videoTrack.getSettings();
          // Extract the actual width and height
          // const { width, height } = settings;
          // console.log(width, height);
        });
      };
      if (hasGetUserMedia()) {
        if (!this.enableWebcamButton) return;
        this.enableWebcamButton.addEventListener("click", enableCam);
      } else {
        console.warn("getUserMedia() is not supported by your browser");
      }

      let lastVideoTime = -1;
      let results: HandLandmarkerResult | undefined;
      const predictWebcam = async () => {
        if (this.no_reaction == false) {
          // videoContainer.style.aspectRatio = (
          //   video.videoWidth / video.videoHeight
          // ).toString();
          // video.style.aspectRatio = (
          //   video.videoWidth / video.videoHeight
          // ).toString();

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
            // console.log(results.handednesses);
            // console.log(results.handedness);
          }

          if (!results) return;

          results.handednesses.forEach((handednessArray, index) => {
            const hand = handednessArray[0];
            const handType = hand.categoryName;
            if (handType == "Left") {
              if (!results) return;
              circle_0.x =
                app.screen.width -
                results.landmarks[index][9].x * app.screen.width;
              circle_0.y = results.landmarks[index][9].y * app.screen.height;
              // console.log("Left");
            } else {
              if (!results) return;
              circle_1.x =
                app.screen.width -
                results.landmarks[index][9].x * app.screen.width;
              circle_1.y = results.landmarks[index][9].y * app.screen.height;
              // console.log("Right");
            }
          });
          if (results.handednesses.length == 1) {
            if (!this.gameStart) {
              this.gameStart = true;
            }
            if (results.handednesses[0][0].categoryName == "Right") {
              circle_1.alpha = 0.5;
              circle_0.alpha = 0;
            }
            if (results.handednesses[0][0].categoryName == "Left") {
              circle_1.alpha = 0;
              circle_0.alpha = 0.5;
            }
          } else if (results.handednesses.length == 2) {
            circle_1.alpha = 0.5;
            circle_0.alpha = 0.5;
          } else if (results.handednesses.length == 0) {
            circle_1.alpha = 0;
            circle_0.alpha = 0;
          }
        }
        if (this.webcamRunning === true) {
          window.requestAnimationFrame(predictWebcam);
        }
      };
      const game = () => {
        if (this.gameStart) {
          this.gameStamp += 5 * this.gameLevel;
          circle_target.y = this.gameStamp;

          if (
            checkCircleCollision(circle_0, circle_target) ||
            checkCircleCollision(circle_1, circle_target)
          ) {
            ballReset(true);
          }
          if (circle_target.y - 30 > app.screen.height) {
            ballReset();
          }
        }
      };
      const ballReset = (point: boolean = false) => {
        this.gameStamp = 0;
        circle_target.y = -50;
        circle_target.x =
          app.screen.width * (Math.random() * 0.4 + (0.5 - 0.2));
        circle_target.clear();
        if (Math.random() > 0.5) {
          circle_target.circle(0, 0, 30).fill(0xffff00);
        } else {
          circle_target.circle(0, 0, 30).fill(0xff0000);
        }
        if (point) {
          this.gameScore += 100;
        } else {
          this.gameScore -= 100;
        }
        if (this.gameScore < 0) {
          this.gameScore = 0;
          if (this.gameStart) {
            console.log("失敗しました。再チャレンジします。");
            circle_0.alpha = 0;
            circle_1.alpha = 0;
            this.msgBox2.classList.add("showModal");
            this.gameStart = false;
            this.no_reaction = true;
          }
          // this.enableWebcamButton.click();
        } else {
          this.score.innerHTML = `${this.gameScore} pt`;
        }
      };

      function checkCircleCollision(
        circle1: PIXI.Graphics,
        circle2: PIXI.Graphics,
      ): boolean {
        // Calculate the horizontal and vertical distance between the centers
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;

        // Use Math.hypot or the Pythagorean theorem to find the distance between centers (hypotenuse)
        const distanceBetweenCenters = Math.hypot(dx, dy); // or Math.sqrt(dx * dx + dy * dy)
        const sumOfRadii = (circle1 as any).radius + (circle2 as any).radius;

        // The distance between the edges is the distance between centers minus both radii
        const distance = distanceBetweenCenters - sumOfRadii;
        if (
          distance < 0 &&
          (circle1 as any).fillStyle.color ==
            (circle2 as any).fillStyle.color &&
          circle1.alpha !== 0
        ) {
          return true;
        } else {
          return false;
        }
      }
      document.querySelector("#gameReadygo")?.addEventListener("click", () => {
        this.msgBox1.classList.remove("showModal");
        this.no_reaction = false;
      });
      document
        .querySelector("#gameReadyagain")
        ?.addEventListener("click", () => {
          this.msgBox2.classList.remove("showModal");
          this.no_reaction = false;
        });
    })();
  }
}

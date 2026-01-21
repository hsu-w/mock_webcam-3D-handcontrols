import * as THREE from "three";
export class ScenesManager {
  static scene: THREE.Scene;
  static camera: THREE.PerspectiveCamera;
  static renderer: THREE.WebGLRenderer;
  static clock: THREE.Clock;
  static container: HTMLButtonElement | null = null;
  static threeCanvas: HTMLButtonElement | null = null;
  static handArr: Array<THREE.Mesh> = [];
  static nnn: number = 0;
  static setup() {
    ScenesManager.container = document.querySelector("#threeScene");
    ScenesManager.threeCanvas = document.querySelector("#three_canvas");
    if (!ScenesManager.container || !ScenesManager.threeCanvas) return;
    ScenesManager.scene = new THREE.Scene();
    ScenesManager.scene.background = new THREE.Color(0xcccccc);
    ScenesManager.camera = new THREE.PerspectiveCamera(
      45,
      ScenesManager.container.clientWidth /
        ScenesManager.container.clientHeight,
      1,
      2000,
    );
    ScenesManager.camera.position.set(0, 0, 5);
    ScenesManager.clock = new THREE.Clock();
    ScenesManager.renderer = new THREE.WebGLRenderer({
      canvas: ScenesManager.threeCanvas,
      antialias: true,
    });
    ScenesManager.renderer.setSize(
      ScenesManager.container.clientWidth,
      ScenesManager.container.clientHeight,
    );
    ScenesManager.renderer.setPixelRatio(window.devicePixelRatio);
    ScenesManager.renderer.shadowMap.enabled = true;
    // const ambLight = new THREE.AmbientLight(0xffffff, 1);
    // ScenesManager.scene.add(ambLight);

    for (let i = 0; i < 21; i++) {
      const geometry = new THREE.SphereGeometry(0.01, 8, 8);
      const material = new THREE.MeshNormalMaterial();
      ScenesManager.handArr[i] = new THREE.Mesh(geometry, material);
      ScenesManager.scene.add(ScenesManager.handArr[i]);
    }

    window.addEventListener("resize", ScenesManager.resizing);
    tick();
    // 毎フレーム時に実行されるループイベントです
    function tick() {
      ScenesManager.render();

      requestAnimationFrame(tick);
    }
  }
  static resizing = () => {
    if (!ScenesManager.container) return;
    ScenesManager.renderer.setSize(
      ScenesManager.container.clientWidth,
      ScenesManager.container.clientHeight,
    );
    ScenesManager.camera.aspect =
      ScenesManager.container.clientWidth /
      ScenesManager.container.clientHeight;
    ScenesManager.camera.updateProjectionMatrix();
  };
  static render() {
    ScenesManager.renderer.render(ScenesManager.scene, ScenesManager.camera);
  }
}

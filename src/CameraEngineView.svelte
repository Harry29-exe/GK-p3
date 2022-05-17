<script lang="ts">
    import {CameraEngine} from "./CameraEngine";
    import {onMount} from "svelte";
    import {defaultPlain, Mesh, texturedCube} from "./structs/Mesh";

    const width = 1200;
    const height = 700;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    let camera = new CameraEngine(width, height);
    let scene: Mesh = new Mesh([]);
    let cube1 = texturedCube()
        .translateZ(2)
        .translateX(-1)
    let cube2 = texturedCube()
        .translateZ(2)
        .translateX(0.5)
    let cube3 = texturedCube()
        .translateZ(2)
        .translateX(1.5)
    let cube4 = texturedCube()
        .translateZ(4)
        .translateX(0.5)

    let cube5 = texturedCube()
        .translateZ(4)
        .translateX(-1.5)

    let cube6 = texturedCube()
        .translateZ(4)
        .translateX(2)

    let cube7 = texturedCube()
        .translateZ(4)
        .translateX(-3)

    let cube8= texturedCube()
        .translateZ(6)
        .translateX(2)

    let cube9 = texturedCube()
        .translateZ(6)
        .translateX(-3)

    // let plain = defaultPlain()
    //     .translateX(-3)
    //     .translateZ(3)
    //     .translateY(1.1)

    scene.addMesh(cube1);
    scene.addMesh(cube2);
    scene.addMesh(cube3);
    scene.addMesh(cube4);
    scene.addMesh(cube5);
    scene.addMesh(cube6);
    scene.addMesh(cube7);
    scene.addMesh(cube8);
    scene.addMesh(cube9);


    onMount(() => {
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        camera.clear(ctx);
        camera.drawMesh(scene, ctx)
    })

    const update = () => {
        camera.clear(ctx);
        camera.drawMesh(scene, ctx);
    }

    const moveActions: [string, () => void][] = [
        ["Forward", () => camera.cameraPos.moveForward()],
        ["Backward", () => camera.cameraPos.moveBackward()],
        ["Up", () => camera.cameraPos.moveUp()],
        ["Down", () => camera.cameraPos.moveDown()],
        ["Left", () => camera.cameraPos.moveLeft()],
        ["Right", () => camera.cameraPos.moveRight()],
    ]

    const rotateActions: [string, () => void][] = [
        ["Rotate X", () => camera.cameraPos.rotatePosX()],
        ["Rotate -X", () => camera.cameraPos.rotateNegX()],
        ["Rotate Y", () => camera.cameraPos.rotatePosY()],
        ["Rotate -Y", () => camera.cameraPos.rotateNegY()],
        ["Rotate Z", () => camera.cameraPos.rotatePosZ()],
        ["Rotate -Z", () => camera.cameraPos.rotateNegZ()],
    ]

</script>

<div>

    <canvas id="camera_canvas" bind:this={canvas}></canvas>

    <div>
        {#each moveActions as action}
            <button on:click={() => {action[1](); update()}}>
                {action[0]}
            </button>
        {/each}
        <br/>
        {#each rotateActions as action}
            <button on:click={() => {action[1](); update()}}>
                {action[0]}
            </button>
{/each}

        <br/>
<button on:click={() => {
    camera.cameraInfo.posZoom();
    update()
}}
>
    Zoom +
</button>

        <button on:click={() => {
    camera.cameraInfo.negZoom();
    update()
}}
>
            Zoom -
</button>


        <br/>
        <button on:click={() => {
    camera = new CameraEngine(width, height);
    update()
}}
        >
            Reset
        </button>
    </div>
</div>

<style>
    button {
        width: 200px;
        height: 50px;
        background-color: aqua;
    }
</style>

import {Matrix4x4} from "./structs/Matrix4x4";
import {Mesh} from "./structs/Mesh";
import {ProjMatrix} from "./structs/ProjMatrix";
import {Vec3d} from "./structs/Vectors";
import type {Tris} from "./structs/Tris";
import {generateLg} from "./structs/Texture";

const identity = Matrix4x4.identity();
const texture = generateLg()

let drawEdges = false

export type Ctx = CanvasRenderingContext2D

export class CameraEngine {
    public readonly cameraInfo: CameraInfo
    public readonly cameraPos = new CameraPos();

    private lightPos: Vec3d = Vec3d.from(-500, 300, -800)
    private projector: (tris: Tris) => Tris;
    private ctx: CanvasRenderingContext2D

    constructor(width: number, height: number) {
        this.cameraInfo = new CameraInfo(width, height);
    }

    public clear(ctx: Ctx) {
        ctx.fillStyle = 'pink'
        ctx.fillRect(0,0,this.cameraInfo.width, this.cameraInfo.height);
    }

    public drawMesh(mesh: Mesh, ctx: Ctx) {
        this.ctx = ctx
        let cameraPos = this.cameraPos.cameraPos
        let meshToRender = new Mesh([])

        // eliminate opposite oriented tris
        for (let i = 0; i < mesh.triangles.length; i++) {
            let tris = mesh.triangles[i]
            let t = tris.p1.subtract(cameraPos)
            let dotProduct = t.dotProduct(tris.calcNormal())
            if (dotProduct < 0) {
                meshToRender.add(tris)
            }
        }

        // project
        this.initProjector()
        for (let i = 0; i < meshToRender.triangles.length; i++) {
            meshToRender.triangles[i] = this.projector(meshToRender.triangles[i])
        }

        // sort remaining tris
        meshToRender.triangles
            .sort((t1, t2) => t2.maxY - t1.maxY)
        // let lightPos = this.projector(Tris.from(this.lightPos, Vec3d.empty(), Vec3d.empty())).p1
        let lightPos = this.lightPos

        console.log("render pipeline")

        let data = this.ctx.getImageData(0, 0, this.cameraInfo.width, this.cameraInfo.height)
        for (let y = 0; y < this.cameraInfo.height; y++) {
            let y3d = this.yTo3dSpace(y)

            let trisAtHeight = meshToRender.triangles.filter(tris => {
                return tris.maxY >= y3d && tris.minY <= y3d
            })
            if (trisAtHeight.length === 0) {
                continue;
            }

            for (let x = 0; x < this.cameraInfo.width; x++) {
                let x3d = this.xTo3dSpace(x)
                let trisAtPx = trisAtHeight.filter(tris => tris.pointInside(x3d, y3d))
                if (trisAtPx.length === 0) {
                    continue
                }

                let closestDistance = trisAtPx[0].calcZOn(x3d,y3d)
                let trisIndex = 0
                let distance = 0
                for (let i = 1; i < trisAtPx.length; i++) {
                    distance = trisAtPx[i].calcZOn(x3d,y3d)
                    if (distance < closestDistance) {
                        closestDistance = distance
                        trisIndex = i
                    }
                }
                let tris = trisAtPx[trisIndex]

                // lightning
                let trisNormal = tris.calcNormal()
                let lightStrength = trisNormal.normalise().dotProduct(lightPos.normalise())
                lightStrength = Math.max(Math.min(lightStrength, 1), 0.15)


                let textureCoords = tris.getTextureCoords(x3d, y3d)
                let color = texture.getPx(textureCoords.x, textureCoords.y)
                let dataStart = (y * data.width + x) * 4;
                data.data[dataStart] = color.r * lightStrength
                data.data[dataStart + 1] = color.g * lightStrength
                data.data[dataStart + 2] = color.b * lightStrength
                data.data[dataStart + 3] = 255
            }
        }
        this.ctx.putImageData(data, 0, 0)

        if (drawEdges) {
            ctx.strokeStyle = 'rgba(0,0,200, 0.7)'
            ctx.lineWidth = 2
            for (const tris of meshToRender.triangles) {
                ctx.beginPath()
                let x = this.scaleXToCanvas(tris.vertexes[2].x)
                let y = this.scaleYToCanvas(tris.vertexes[2].y)
                ctx.lineTo(x, y)
                for (let j = 0; j < 3; j++) {
                    x = this.scaleXToCanvas(tris.vertexes[j].x)
                    y = this.scaleYToCanvas(tris.vertexes[j].y)
                    ctx.lineTo(x, y)
                }
                ctx.stroke()
            }
        }
    }

    private initProjector(){
        const projMatrix  = this.cameraInfo.createProjectionMatrix();
        const lookAt = this.cameraPos.createLookAtMatrix()

        this.projector = (tris: Tris): Tris => {
            let projTris = tris.copy()
            for (let i = 0; i < 3; i++) {
                let temp = identity.multiplyVec3d(tris.vertexes[i])
                temp = lookAt.multiplyVec3d(temp)
                projTris.vertexes[i] = projMatrix.projectVec(temp)
            }

            // for (let i = 0; i < 3; i++) {
            //     console.log("W=", projTris.vertexes[i].w)
            //     projTris.texCoords[i].x = projTris.texCoords[i].x / projTris.vertexes[i].w
            //     projTris.texCoords[i].y = projTris.texCoords[i].y / projTris.vertexes[i].w
            //     projTris.texCoords[i].w = 1 / projTris.vertexes[i].w
            // }

            return projTris
        }
    }


    private scaleXToCanvas(xCoord: number): number {
        return (xCoord + 1) * (this.cameraInfo.width / 2)
    }

    private scaleYToCanvas(yCoord: number): number {
        return (yCoord + 1) * (this.cameraInfo.height / 2)
    }

    private xTo3dSpace(xCoord: number): number {
        return (2*xCoord)/this.cameraInfo.width - 1
    }

    private yTo3dSpace(yCoord: number): number {
        return (2*yCoord)/this.cameraInfo.height - 1
    }

}

class CameraInfo {
    public fov = Math.PI/2;
    private fovChange = Math.PI / 32;
    public zFar = 100000;
    public zNear = 0.1;
    public width: number;
    public height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public createProjectionMatrix(): ProjMatrix {
        return new ProjMatrix(this.fov, this.zFar, this.zNear, this.width, this.height);
    }

    public posZoom() {
        this.fov -= this.fovChange
    }

    public negZoom() {
        this.fov += this.fovChange
    }

}

class CameraPos {
    //camera position
    // private vCamera = Vec3d.from(0.194,0.039,1.32)
    private vCamera = Vec3d.from(0, 0, 0)
    //normalized look direction
    private vLookDir = Vec3d.from(0, 0, 1)
    //up vector
    private vUp = Vec3d.from(0, 1, 0)
    private moveFactor = 0.1;
    private rotateFactor = Math.PI / 16;
    private rotX = 0; // -0.3926;
    private rotY = 0; // 0.785;
    private rotZ = 0;

    public createLookAtMatrix(): Matrix4x4 {
        console.log("camera:", this.vCamera, this.rotX, this.rotY, this.rotZ)
        const vTarget = this.vCamera.add(this.vTarget());
        return Matrix4x4.lookAt(this.vCamera, vTarget, this.vUp)
            .multiply(Matrix4x4.rotationZ(this.rotZ));
    }

    public moveForward() {
        const vForward = this.vTarget().multiply(this.moveFactor)
        this.vCamera = this.vCamera.add(vForward);
    }

    public moveBackward() {
        const vForward = this.vTarget().multiply(this.moveFactor)
        this.vCamera = this.vCamera.subtract(vForward);
    }

    public moveLeft() {
        const vForward = Matrix4x4.rotationY(this.rotY + Math.PI/2)
            .multiplyVec3d(this.vLookDir)
            .multiply(this.moveFactor)

        this.vCamera = this.vCamera.add(vForward)
    }

    public moveRight() {
        const vForward = Matrix4x4.rotationY(this.rotY + Math.PI/2)
            .multiplyVec3d(this.vLookDir)
            .multiply(this.moveFactor)

        this.vCamera = this.vCamera.subtract(vForward)
    }

    public moveUp() {
        const vMove = this.vUp.multiply(this.moveFactor)

        this.vCamera = this.vCamera.subtract(vMove)
    }

    public moveDown() {
        const vMove = this.vUp.multiply(this.moveFactor)

        this.vCamera = this.vCamera.add(vMove)
    }

    public rotatePosX() {
        this.rotX += this.rotateFactor;
    }

    public rotateNegX() {
        this.rotX -= this.rotateFactor;
    }

    public rotatePosY() {
        this.rotY += this.rotateFactor;
    }

    public rotateNegY() {
        this.rotY -= this.rotateFactor;
    }

    public rotatePosZ() {
        this.rotZ += this.rotateFactor;
    }

    public rotateNegZ() {
        this.rotZ -= this.rotateFactor;
    }

    private vTarget(): Vec3d {
        let vTarget = this.vLookDir;


        vTarget = Matrix4x4.rotationX(this.rotX)
            .multiply(Matrix4x4.rotationY(this.rotY))
            .multiplyVec3d(vTarget)

        return vTarget
    }

    public get cameraPos(): Vec3d {
        return this.vCamera.multiply(1)
    }

}
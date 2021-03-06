import { VuexModule, Module, Mutation, Action, getModule } from 'vuex-module-decorators'
import * as faceapi from 'face-api.js'
import store from '@/store'
import { TimelineModule } from './timeline'
import { IFace } from '../types'
import { deepCloneFace } from '@/utils/editor'

export interface IAppState {
  currentFrame: number
  duration: number
  fps: number
  videoUrl: string
}

@Module({ dynamic: true, store, name: 'app', namespaced: true })
class App extends VuexModule implements IAppState {

  public currentFrame: number = 0
  public duration: number = 0
  public fps: number = 30
  public videoUrl: string = ''
  public isAutoProcess: boolean = false
  public forceDetect: boolean = false
  public faceSelected: IFace | null = null
  public faceCopied: IFace | null = null
  public faceDetectorOptions = new faceapi.TinyFaceDetectorOptions()

  public get totalFrame(): number {
    return this.fps * this.duration
  }

  public get currentTime(): number {
    return this.currentFrame / this.fps
  }

  public get canCopy(): boolean {
    return this.faceSelected !== null
  }

  public get canPaste(): boolean {
    return this.faceCopied !== null
  }

  @Mutation
  public nextFrame() {
    // since getter in Mutation does not works
    const totalFrame = this.fps * this.duration
    if (totalFrame <= this.currentFrame) {
      this.isAutoProcess = false
      return
    }
    this.currentFrame++
    this.faceSelected = null
  }

  @Mutation
  public prevFrame() {
    if (this.currentFrame === 0) {
      return
    }
    this.currentFrame--
    this.faceSelected = null
  }

  @Mutation
  public setCurrentFrame(value: number) {
    if (value < 0 || this.totalFrame < value) {
      return
    }
    this.currentFrame = value
    this.faceSelected = null
  }

  @Mutation
  public nextBlankFrame() {
    const frame = TimelineModule.firstBlankFrame
    if (frame < 0) {
      this.isAutoProcess = false
      return
    }
    if (this.totalFrame < frame) {
      return
    }
    this.currentFrame = frame
  }

  @Mutation
  public loadVideo(file: File) {
    this.videoUrl = URL.createObjectURL(file)
  }

  @Mutation
  public setVideoDuration(duration: number) {
    this.duration = duration
  }

  @Mutation
  public startAutoProcess() {
    this.isAutoProcess = true
  }

  @Mutation
  public stopAutoProcess() {
    this.isAutoProcess = false
  }

  @Mutation
  public selectFace(face: IFace | null) {
    this.faceSelected = face
  }

  @Mutation
  public copyFace() {
    if (this.faceSelected === null) {
      return
    }
    this.faceCopied = this.faceSelected
  }

  @Mutation
  public pasteFace() {
    if (this.faceCopied !== null) {
      AppModule.addFace(deepCloneFace(this.faceCopied))
    }
  }

  @Mutation
  public addFace(face: IFace) {
    const frame = this.currentFrame
    const current = TimelineModule.frames[frame]
    const newFace = face

    let faces: IFace[]
    if (current === undefined || current === null || current.length === 0) {
      faces = [newFace]
    } else {
      // find original ID
      let id = 0
      for (id = 0; id <= current.length; id++) {
        if (!current.some((f) => f.id === id)) {
          break
        }
      }
      newFace.id = id
      current.push(newFace)
      faces = current
    }

    TimelineModule.updateFrame({
      frame,
      faces,
    })
  }

  @Mutation
  public deleteFace() {
    const current = TimelineModule.frames[this.currentFrame]
    if (this.faceSelected === null
      || current === null
      || current.length === 0) {
      return
    }
    const index = current.findIndex((f) => f === this.faceSelected)
    if (index >= 0) {
      current.splice(index, 1)
    }
  }

  @Mutation
  public setFps(fps: number) {
    this.fps = fps
    TimelineModule.clearAllFrames()
  }

  @Mutation
  public setScoreThreshold(threshold: number) {
    const current = this.faceDetectorOptions
    this.faceDetectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: current.inputSize,
      scoreThreshold: threshold,
    })
  }

  @Mutation
  public setForceDetect(value: boolean) {
    this.forceDetect = value
  }
}

export const AppModule = getModule(App)

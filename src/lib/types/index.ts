export type Quaternion = {
  x: number
  y: number
  z: number
  w: number
}

export type Euler = {
  roll: number
  pitch: number
  yaw: number
}

export type OrientationData = {
  quaternion: Quaternion
  timestamp: number
}

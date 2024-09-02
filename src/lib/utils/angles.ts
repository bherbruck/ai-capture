import type { Quaternion, Euler } from '$lib/types'

const RAD2DEG = 180 / Math.PI

export const quaternionMultiply = (a: Quaternion, b: Quaternion): Quaternion => {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  }
}

export const quaternionConjugate = (q: Quaternion): Quaternion => {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w }
}

export const quaternionToEuler = ({ x, y, z, w }: Quaternion): Euler => {
  const sinr_cosp = 2 * (w * x + y * z)
  const cosr_cosp = 1 - 2 * (x * x + y * y)
  const roll = Math.atan2(sinr_cosp, cosr_cosp) * RAD2DEG

  const sinp = 2 * (w * y - z * x)
  const pitch = (Math.abs(sinp) >= 1 ? Math.sign(sinp) * (Math.PI / 2) : Math.asin(sinp)) * RAD2DEG

  const siny_cosp = 2 * (w * z + x * y)
  const cosy_cosp = 1 - 2 * (y * y + z * z)
  const yaw = Math.atan2(siny_cosp, cosy_cosp) * RAD2DEG

  // Swap axes and invert signs to match the orientation sensor's coordinate system
  return { yaw: -pitch, pitch: roll, roll: -yaw }
}

export const localRotationDelta = (current: Quaternion, last: Quaternion): Quaternion => {
  const lastInverse = quaternionConjugate(last)
  return quaternionMultiply(lastInverse, current)
}

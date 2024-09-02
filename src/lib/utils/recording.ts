import type { Euler } from '$lib/types'
import saveAs from 'file-saver'
import JSZip from 'jszip'

export async function saveRecording(recordedChunks: Blob[], orientationRecords: Euler[]) {
  const timestamp = generateTimestamp()
  const videoBlob = new Blob(recordedChunks, { type: 'video/mp4' })
  const csvContent = generateCsv(orientationRecords)

  const zip = new JSZip()
  zip.file(`${timestamp}.mp4`, videoBlob)
  zip.file(`${timestamp}.csv`, csvContent)

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `ai_${timestamp}.zip`)
}

function generateTimestamp(): string {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0') // Months are 0-based in JS
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

function generateCsv(orientationRecords: Euler[]): string {
  let csvContent = 'frame,yaw,pitch,roll\n'
  orientationRecords.forEach((record, index) => {
    csvContent += `${index},${record.yaw.toFixed(3)},${record.pitch.toFixed(3)},${record.roll.toFixed(3)}\n`
  })
  return csvContent
}

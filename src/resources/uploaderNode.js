import Promise from 'promise'
import { NINA_CLIENT_IDS, nativeToUi, uiToNative } from '../utils'
import fs from 'fs'
export const MAX_AUDIO_FILE_UPLOAD_SIZE_MB = 500

export const MAX_AUDIO_FILE_UPLOAD_SIZE_BYTES =
  MAX_AUDIO_FILE_UPLOAD_SIZE_MB * 1024 * 1024

export const MAX_IMAGE_FILE_UPLOAD_SIZE_MB = 25

export const MAX_IMAGE_FILE_UPLOAD_SIZE_BYTES =
  MAX_IMAGE_FILE_UPLOAD_SIZE_MB * 1024 * 1024

export default class UploaderNode {
  constructor() {
    this.bundlrEndpoint = 'https://node1.bundlr.network'
    this.provider = null
    this.endpoint = null
    this.bundlr = null
    this.cluster = null
    this.eventEmitter = null
  }
  
  async init({ provider, endpoint, cluster, eventEmitter }) {
    return new Promise((resolve, reject) => {
      try {
        console.log('hello', endpoint)
        this.provider = provider
        this.endpoint = endpoint
        this.cluster = cluster
        this.eventEmitter = eventEmitter
        import('@bundlr-network/client').then(async (module) => {
          const bundlrInstance = new module.NodeBundlr(
            this.bundlrEndpoint,
            'solana',
            this.provider.wallet.payer.secretKey,
            {
              providerUrl: this.endpoint.replace('.devnet', ''),
              timeout: 2147483647,
            },
          )
          console.log('bro')
          await bundlrInstance.ready()
          this.bundlr = bundlrInstance
          resolve(this)
        });
    } catch (error) {
      console.warn('bundlr error: ', error)
      reject(error)
    }
   })
  }

  async uploadFile(file, index, totalFiles, nameOverride=null) {
    try {
      console.log('file', file)
      return new Promise(async (resolve, reject) => {
        const uploader = this.bundlr.uploader.chunkedUploader
        uploader.on('chunkUpload', (chunkInfo) => {
          this.eventEmitter.emit('ninaUploadProgress',  {
            detail: chunkInfo,
            name: file.name || file.originalname || nameOverride,
            fileNumber: index + 1,
            totalFiles,
          })
          console.warn(
            `Uploaded Chunk number ${chunkInfo.id}, offset of ${chunkInfo.offset}, size ${chunkInfo.size} Bytes, with a total of ${chunkInfo.totalUploaded} bytes uploaded.`,
          )
        })
        uploader.on('chunkError', (e) => {
          this.eventEmitter.emit('ninaUploadError', {
            detail: e,
            name: file.name || file.originalname || nameOverride,
            fileNumber: index + 1,
            totalFiles,
          })
          console.error(
            `Error uploading chunk number ${e.id} - ${e.res.statusText}`,
          )
          reject(e)
        })
        uploader.on('done', (finishRes) => {
          this.eventEmitter.emit('ninaUploadDone', {
            detail: finishRes,
            name: file.name || file.originalname || nameOverride,
            fileNumber: index + 1,
            totalFiles,
          })
        })
        
        console.log('file', file)
        const transactionOptions = {tags: [{ name: 'Content-Type', value: file.mimetype || 'application/json' }] }
        console.log('file.buffer', file.buffer)
        const response = await uploader.uploadData(nameOverride ? file : file.buffer, transactionOptions)
        console.warn(`Upload completed with ID ${JSON.stringify(response.data.id)}`)
        resolve(response.data.id)
      })
    } catch (error) {
      return reject(error)
    }
  }

  async convertMetadataJSONToBuffer(metadataJSON) {
    try {
      const metadataJSONString = JSON.stringify(metadataJSON)
      return Buffer.from(metadataJSONString)
    } catch (error) {
      console.warn('Unable to convert metadata JSON to buffer: ', error)
    }
  }

  async getBalanceForPublicKey(publicKey) {
    try {
      const bundlrBalanceRequest = await this.bundlr.getBalance(publicKey)

      return bundlrBalanceRequest
    } catch (error) {
      console.warn('Unable to get Bundlr Balance: ', error)

      return error
    }
  }

  async getPricePerMb() {
    try {
      const price = await this.bundlr.getPrice(1000000)

      return nativeToUi(price, NINA_CLIENT_IDS[this.cluster].mints.wsol)
    } catch (error) {
      return error
    }
  }

  async fund(amount) {
    try {
      const value = uiToNative(amount, NINA_CLIENT_IDS[this.cluster].mints.wsol)

      if (!value) return

      await this.bundlr.fund(value)

      return {
        success: true,
        msg: `${amount} Sol successfully deposited`,
      }
    } catch (error) {
      console.warn('Bundlr fund error: ', error)

      return error
    }
  }

  async withdraw(amount) {
    try {
      const value = uiToNative(amount, NINA_CLIENT_IDS[this.cluster].mints.wsol)

      if (!value) return

      await this.bundlr.withdrawBalance(value)

      return {
        success: true,
        msg: `${amount} Sol successfully withdrawn`,
      }
    } catch (error) {
      console.warn('Bundlr withdraw error: ', error)

      return error
    }
  }

  async hasBalanceForFiles(files) {
    try {
      const pricePerMb = await this.getPricePerMb()
      const totalSize = files.reduce((acc, file) => acc + file.size, 0)
      const totalCost = totalSize * pricePerMb

      const balance = await this.getBalanceForPublicKey(
        this.provider.wallet.publicKey.toString(),
      )

      return balance >= totalCost
    } catch (error) {
      console.warn('Bundlr hasBalanceForFiles error: ', error)

      return error
    }
  }

  isValidAudioFile(file) {
    return (
      file.type === 'audio/mpeg' || file.mimetype === 'audio/mpeg' &&
      file.size <= MAX_AUDIO_FILE_UPLOAD_SIZE_BYTES
    )
  }

  isValidArtworkFile(file) {
    return (
      (file.type === 'image/jpeg' ||
        file.type === 'image/png' ||
        file.type === 'image/gif' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/png' || 
        file.mimetype === 'image/gif') &&
      file.size <= MAX_IMAGE_FILE_UPLOAD_SIZE_BYTES
    )
  }

  isValidAudioFiles(files) {
    return files.every((file) => this.isValidAudioFile(file))
  }

  async isValidMd5Digest(hash) {
    try {
      if (this.cluster === 'devnet') {
        return true
      }

      const path = `${this.endpoint}/hash/${hash}`
      const response = await fetch(path)
      const { release } = await response.json()

      if (release) {
        return false
      }

      return true
    } catch (error) {
      console.warn(error)
    }
  }
}

import Promise from 'promise'
import { NINA_CLIENT_IDS, nativeToUi, uiToNative } from '../utils'

export const MAX_AUDIO_FILE_UPLOAD_SIZE_MB = 500
export const MEGABYTE = 1024 * 1024
export const MAX_AUDIO_FILE_UPLOAD_SIZE_BYTES =
  MAX_AUDIO_FILE_UPLOAD_SIZE_MB * 1024 * 1024

export const MAX_IMAGE_FILE_UPLOAD_SIZE_MB = 25

export const MAX_IMAGE_FILE_UPLOAD_SIZE_BYTES =
  MAX_IMAGE_FILE_UPLOAD_SIZE_MB * 1024 * 1024

export default class Uploader {
  constructor() {
    this.bundlrEndpoint = 'https://node1.bundlr.network'
    this.provider = null
    this.endpoint = null
    this.bundlr = null
    this.cluster = null
  }

  async init({ provider, endpoint, cluster, bundlrEndpoint = 'https://node1.bundlr.network' }) {
    return new Promise((resolve, reject) => {
      try {
        this.provider = provider
        this.endpoint = endpoint
        this.cluster = cluster
        this.bundlrEndpoint = bundlrEndpoint
        import('@bundlr-network/client').then(async (module) => {
          const bundlrInstance = new module.WebBundlr(
            this.bundlrEndpoint,
            'solana',
            this.provider.wallet,
            {
              providerUrl: this.provider.connection.rpcEndpoint,
              timeout: 2147483647,
            },
          )

          await bundlrInstance.ready()
          this.bundlr = bundlrInstance
          resolve(this)
        });
    } catch (error) {
      console.error('bundlr error: ', error)
      reject(error)
    }
   })
  }

  async uploadFile(file, index, totalFiles, nameOverride=null) {
    try {
      return new Promise((resolve, reject) => {
        const uploader = this.bundlr.uploader.chunkedUploader
        uploader.on('chunkUpload', (chunkInfo) => {
          console.log(
            `Uploaded Chunk number ${chunkInfo.id}, offset of ${chunkInfo.offset}, size ${chunkInfo.size} Bytes, with a total of ${chunkInfo.totalUploaded} bytes uploaded.`,
          )
        })
        uploader.on('chunkError', (e) => {
          console.error(
            `Error uploading chunk number ${e.id} - ${e.res.statusText}`,
          )
        })
        uploader.on('done', (finishRes) => {
          console.log(`Upload completed with ID ${JSON.stringify(finishRes)}`)
        })
        const reader = new FileReader()
        reader.onload = async () => {
          const data = reader.result
          let txId
          try {
            const tx = this.bundlr.createTransaction(data, {
              tags: [{ name: 'Content-Type', value: file.type }],
            })

            await tx.sign()
            txId = (await uploader.uploadTransaction(tx)).data.id
            resolve(txId)
          } catch (error) {
            reject(error)
          }
        }
        reader.onerror = (error) => {
          reject(error)
        }
        reader.readAsArrayBuffer(file)
      })
    } catch (error) {
      return error
    }
  }

  async convertMetadataJSONToBuffer(metadataJSON) {
    try {
      return new Blob([JSON.stringify(metadataJSON)], {
        type: 'application/json',
      })

    } catch (error) {
      console.log('Unable to convert metadata JSON to buffer: ', error)
    }
  }
  async getBalanceForPublicKey(publicKey) {
    try {
      const bundlrBalanceRequest = await this.bundlr.getBalance(publicKey)

      return bundlrBalanceRequest
    } catch (error) {
      console.log('Unable to get Bundlr Balance: ', publicKey, error)

      return error
    }
  }

  async getPricePerMb(native=false) {
    try {
      const price = await this.bundlr.getPrice(1000000)

      return native ? price : nativeToUi(price, NINA_CLIENT_IDS[this.cluster].mints.wsol)
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
      console.error('Bundlr fund error: ', error)

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
      console.error('Bundlr withdraw error: ', error)

      return error
    }
  }

  async costForFiles(files, native=false) {
    const totalSizeWithoutMB = files.reduce((acc, file) => acc + file?.size || 0, 0)
    const priceWithoutMB = await this.bundlr.getPrice(totalSizeWithoutMB)
    return native ? priceWithoutMB.toNumber() : nativeToUi(priceWithoutMB, NINA_CLIENT_IDS[this.cluster].mints.wsol)
  }

  async hasBalanceForFiles(files) {
    try {
      const totalCost = await this.costForFiles(files)

      const balance = await this.getBalanceForPublicKey(
        this.provider.wallet.publicKey.toString(),
      )

      return balance >= totalCost
    } catch (error) {
      console.error('Bundlr hasBalanceForFiles error: ', error)

      return error
    }
  }

  isValidAudioFile(file) {
    return (
      (file.type === 'audio/mpeg' || file.mimetype === 'audio/mpeg') &&
      file.size <= MAX_AUDIO_FILE_UPLOAD_SIZE_BYTES
    )
  }

  isValidArtworkFile(file) {
    return (
      (file.type === 'image/jpeg' ||
        file.type === 'image/jpg' ||
        file.type === 'image/png' ||
        file.type === 'image/gif' ||
        file.mimetype === 'image/jpeg' ||
        file.mimetype === 'image/jpg' ||
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
      console.error(error)
    }
  }
}

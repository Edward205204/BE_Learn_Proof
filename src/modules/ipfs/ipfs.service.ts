import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name)
  private readonly pinataUrl = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'

  /**
   * Uploads a JSON object (Metadata) to Pinata IPFS
   * @param metadata The JSON object to upload
   * @param filename Optional name for the pin
   */
  async uploadJson(metadata: Record<string, any>, filename?: string): Promise<string> {
    const apiKey = process.env.PINATA_API_KEY
    const apiSecret = process.env.PINATA_API_SECRET

    if (!apiKey || !apiSecret) {
      this.logger.warn('⚠️ Pinata API keys are missing in .env. Upload will fail.')
      throw new Error('Pinata API keys not configured')
    }

    try {
      this.logger.log(`Uploading metadata to IPFS${filename ? `: ${filename}` : ''}...`)

      const response = await axios.post(
        this.pinataUrl,
        {
          pinataContent: metadata,
          pinataMetadata: {
            name: filename || `LearnProof-Cert-${Date.now()}`,
          },
        },
        {
          headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
          },
        },
      )

      const cid = response.data.IpfsHash
      this.logger.log(`✅ Successfully uploaded to IPFS. CID: ${cid}`)
      return cid
    } catch (error) {
      this.logger.error('❌ Failed to upload JSON to IPFS:', error.response?.data || error.message)
      throw new Error(`IPFS Upload failed: ${error.message}`)
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ethers } from 'ethers'
import * as path from 'path'
import * as fs from 'fs'
import axios from 'axios'

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name)
  private provider: ethers.JsonRpcProvider
  private signer: ethers.Wallet
  private contract: ethers.Contract

  async onModuleInit() {
    await this.initializeBlockchain()
  }

  private async initializeBlockchain() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY
    const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS

    if (!rpcUrl || !privateKey || !contractAddress) {
      this.logger.warn('⚠️ Blockchain configuration missing in .env. Blockchain features will be disabled.')
      return
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl)
      this.signer = new ethers.Wallet(privateKey, this.provider)

      // Load ABI from the synced shared directory
      const abiPath = path.join(process.cwd(), 'src/shared/blockchain/LearnProofCertificate.json')
      if (!fs.existsSync(abiPath)) {
        this.logger.error(`❌ ABI file not found at: ${abiPath}`)
        return
      }

      const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'))
      this.contract = new ethers.Contract(contractAddress, abiData.abi, this.signer)

      const network = await this.provider.getNetwork()
      this.logger.log(`✅ Blockchain Service Initialized on network: ${network.name} (${network.chainId})`)
      this.logger.log(`📜 Contract Address: ${contractAddress}`)
    } catch (error) {
      this.logger.error('❌ Failed to initialize Blockchain Service:', error.message)
    }
  }

  getAdminWalletAddress(): string {
    if (!this.signer) throw new Error('Blockchain Service not initialized')
    return this.signer.address
  }

  /**
   * Mints a Soulbound Certificate (SBT) for a user
   * @param to The wallet address of the recipient
   * @param ipfsUri The IPFS CID/Link for the metadata
   * @param certHash The unique hash of the certificate to prevent duplicates
   */
  async mintCertificate(to: string, ipfsUri: string, certHash: string) {
    if (!this.contract) {
      throw new Error('Blockchain Service not initialized')
    }

    try {
      this.logger.log(`🛠️ Minting certificate for ${to}...`)

      // Call the mint function on our SBT contract
      const tx = await this.contract.mint(to, ipfsUri, certHash)
      this.logger.log(`⛽ Transaction sent: ${tx.hash}`)

      // Wait for 1 confirmation
      const receipt = await tx.wait(1)
      this.logger.log(`🎉 Transaction confirmed! Block: ${receipt.blockNumber}`)

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'SUCCESS' : 'FAILED',
      }
    } catch (error) {
      this.logger.error(`❌ Minting failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Helper to verify if an address is valid
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address)
  }

  /**
   * Upload file ảnh (Buffer) lên IPFS thông qua Pinata
   * @param imageBuffer Buffer của file ảnh
   * @param fileName Tên file, ví dụ: 'certificate.png'
   * @returns Link ipfs:// trỏ tới ảnh
   */
  async uploadImageToIPFS(imageBuffer: Buffer, fileName: string): Promise<string> {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', imageBuffer, { filename: fileName, contentType: 'image/png' })
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))
    form.append('pinataMetadata', JSON.stringify({ name: fileName }))

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      form,
      {
        headers: {
          ...form.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      },
    )

    const cid = response.data.IpfsHash
    this.logger.log(`🖼️ Ảnh đã được upload lên IPFS: ${cid}`)
    return `ipfs://${cid}`
  }

  /**
   * Upload metadata JSON lên IPFS thông qua Pinata
   * @param metadata Object dữ liệu metadata của chứng chỉ
   * @returns Link ipfs:// trỏ tới metadata
   */
  async uploadMetadataToIPFS(metadata: Record<string, unknown>): Promise<string> {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataOptions: { cidVersion: 1 },
        pinataMetadata: { name: (metadata.name as string) ?? 'LearnProof Certificate' },
        pinataContent: metadata,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
        },
      },
    )

    const cid = response.data.IpfsHash
    this.logger.log(`📄 Metadata đã được upload lên IPFS: ${cid}`)
    return `ipfs://${cid}`
  }
}

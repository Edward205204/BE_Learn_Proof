import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;

  async onModuleInit() {
    await this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      this.logger.warn('⚠️ Blockchain configuration missing in .env. Blockchain features will be disabled.');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Load ABI from the synced shared directory
      const abiPath = path.join(process.cwd(), 'src/shared/blockchain/LearnProofCertificate.json');
      if (!fs.existsSync(abiPath)) {
        this.logger.error(`❌ ABI file not found at: ${abiPath}`);
        return;
      }

      const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      this.contract = new ethers.Contract(contractAddress, abiData.abi, this.signer);

      const network = await this.provider.getNetwork();
      this.logger.log(`✅ Blockchain Service Initialized on network: ${network.name} (${network.chainId})`);
      this.logger.log(`📜 Contract Address: ${contractAddress}`);
    } catch (error) {
      this.logger.error('❌ Failed to initialize Blockchain Service:', error.message);
    }
  }

  /**
   * Mints a Soulbound Certificate (SBT) for a user
   * @param to The wallet address of the recipient
   * @param ipfsUri The IPFS CID/Link for the metadata
   * @param certHash The unique hash of the certificate to prevent duplicates
   */
  async mintCertificate(to: string, ipfsUri: string, certHash: string) {
    if (!this.contract) {
      throw new Error('Blockchain Service not initialized');
    }

    try {
      this.logger.log(`🛠️ Minting certificate for ${to}...`);
      
      // Call the mint function on our SBT contract
      const tx = await this.contract.mint(to, ipfsUri, certHash);
      this.logger.log(`⛽ Transaction sent: ${tx.hash}`);

      // Wait for 1 confirmation
      const receipt = await tx.wait(1);
      this.logger.log(`🎉 Transaction confirmed! Block: ${receipt.blockNumber}`);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'SUCCESS' : 'FAILED',
      };
    } catch (error) {
      this.logger.error(`❌ Minting failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper to verify if an address is valid
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}
